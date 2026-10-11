import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { formatCertificateId } from "@/lib/formatId";
import { errorResponse, successResponse } from "@/lib/api-response";
import ParticipantModel from "@/models/Participant";
import OrganizerModel from "@/models/Organizer";
import WorkshopModel from "@/models/Workshop";
import type { CertificateCandidate, CertificateLookupResponse, DatabaseLookupResult, Participant } from "@/types";
import type { WorkshopDefinition } from "@/types/workshop";
import { certificateLookupSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const parsed = certificateLookupSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);

  try {
    await connectToDatabase();
    const { id, workshop: selectedKey } = parsed.data;
    const accountUserId = getAccountUserId(id);
    const accountParticipants = accountUserId
      ? await ParticipantModel.find({ userId: accountUserId })
        .select("id name workshop attendance")
        .lean()
      : [];
    if (accountUserId && (/^CBSU-/i.test(id.trim()) || accountParticipants.length > 0)) {
      const participantsForLookup = selectedKey
        ? accountParticipants.filter((participant) => participant.workshop === selectedKey)
        : accountParticipants;
      const workshopsForLookup = await WorkshopModel.find(
        selectedKey ? { key: selectedKey } : {},
      ).select("-_id key workshopName workshopCode eventYear eventDate isCompleted organizedBy templatePath layout").lean() as unknown as WorkshopDefinition[];
      const result = lookupUserCertificates(accountUserId, participantsForLookup, workshopsForLookup);
      const message = result.status === "user-certificates"
        ? "Certificates found for user"
        : result.status === "attendance-required"
          ? "Certificate is unavailable until attendance is marked present"
          : result.status === "event-not-completed"
            ? "This event has not been marked completed yet"
            : "No certificates found for this user";
      const response = toPublicLookupResult(result);
      return successResponse(response, message, result.status === "user-certificates" ? result.candidates.length : 0);
    }
    const parts = id.trim().toUpperCase().split(/[\s\-_/]+/).filter(Boolean);
    const workshopCode = parts.find((part) => /^[A-Z0-9]+$/.test(part) && part !== "CBS" && !/^\d+$/.test(part));
    const year = parts.find((part) => /^\d{4}$/.test(part));
    const workshopFilter = selectedKey
      ? { key: selectedKey }
      : workshopCode
        ? { workshopCode, ...(year ? { eventYear: year } : {}) }
        : {};
    const workshops = await WorkshopModel.find(workshopFilter)
      .select("-_id key workshopName workshopCode eventYear eventDate isCompleted organizedBy templatePath layout")
      .lean() as unknown as WorkshopDefinition[];
    const result = await lookup(id, selectedKey, workshops);
    const message = result.status === "found"
      ? "Certificate found"
      : result.status === "ambiguous"
        ? "Multiple certificates found"
        : result.status === "attendance-required"
          ? "Certificate is unavailable until attendance is marked present"
          : result.status === "event-not-completed"
            ? "This event has not been marked completed yet"
        : "Certificate not found";
    const count = result.status === "ambiguous" ? result.candidates.length : result.status === "found" ? 1 : 0;
    return successResponse(toPublicLookupResult(result), message, count);
  } catch (error) {
    console.error("Certificate lookup error:", error);
    return errorResponse("Unable to look up certificate");
  }
}

function toPublicLookupResult(result: DatabaseLookupResult): CertificateLookupResponse {
  if (result.status === "found") {
    return {
      status: "found",
      participant: { name: result.participant.name },
      formattedId: result.formattedId,
      workshop: {
        key: result.workshop.key,
        workshopName: result.workshop.workshopName,
        eventDate: result.workshop.eventDate,
        organizedBy: result.workshop.organizedBy,
        templatePath: result.workshop.templatePath,
        layout: result.workshop.layout,
      },
    };
  }
  if (result.status === "ambiguous" || result.status === "user-certificates") {
    return {
      status: result.status,
      candidates: result.candidates.map(({ participant, workshop, formattedId }) => ({
        participant: { name: participant.name },
        workshop: { key: workshop.key, workshopName: workshop.workshopName },
        formattedId,
      })),
    };
  }
  return result;
}

function getAccountUserId(rawId: string): string | undefined {
  const value = rawId.trim().toUpperCase();
  const explicitId = value.match(/^CBSU-(\d{6,})$/);
  if (explicitId) return `CBSU-${explicitId[1]}`;
  if (/^\d+$/.test(value)) return `CBSU-${value.padStart(6, "0")}`;
  return undefined;
}

function lookupUserCertificates(
  userId: string,
  participants: Array<{
    id: string;
    name: string;
    workshop: string;
    userId: string;
    attendance: boolean;
  }>,
  workshops: WorkshopDefinition[],
): DatabaseLookupResult {
  if (participants.length === 0) return { status: "not-found" };
  const workshopsByKey = new Map(workshops.map((workshop) => [workshop.key, workshop]));
  const completed = participants.filter((participant) => workshopsByKey.get(participant.workshop)?.isCompleted === true);
  if (completed.length === 0) return { status: "event-not-completed" };
  const attended = completed.filter((participant) => participant.attendance === true);
  if (attended.length === 0) return { status: "attendance-required" };
  const candidates: CertificateCandidate[] = attended.flatMap((participant) => {
    const workshop = workshopsByKey.get(participant.workshop);
    if (!workshop) return [];
    const certificateParticipant: Participant = {
      id: participant.id,
      name: participant.name,
      workshop: participant.workshop,
      userId,
    };
    return [{
      participant: certificateParticipant,
      workshop,
      formattedId: formatCertificateId(participant.id, workshop),
    }];
  });
  return candidates.length
    ? { status: "user-certificates", candidates }
    : { status: "not-found" };
}

async function lookup(rawId: string, selectedKey: string | undefined, workshops: WorkshopDefinition[]): Promise<DatabaseLookupResult> {
  const trimmed = rawId.trim();
  const selectedWorkshop = selectedKey ? workshops.find((entry) => entry.key === selectedKey) : undefined;
  if (selectedKey && !selectedWorkshop) return { status: "not-found" };
  if (selectedWorkshop && selectedWorkshop.isCompleted !== true) return { status: "event-not-completed" };
  const organizerId = trimmed.toUpperCase();
  if (/^CBSO-\d{6,}$/.test(organizerId)) {
    if (!selectedKey) return { status: "not-found" };
    const workshop = workshops.find((entry) => entry.key === selectedKey);
    if (!workshop) return { status: "not-found" };
    const organizer = await OrganizerModel.findOne({ organizerId, isActive: true, workshops: selectedKey }).select("organizerId fullName").lean();
    if (!organizer) return { status: "not-found" };
    return {
      status: "found",
      participant: { id: organizer.organizerId, name: organizer.fullName, workshop: selectedKey },
      formattedId: organizer.organizerId,
      workshop,
    };
  }
  const numericMatches = trimmed.match(/\d+/g);
  if (!numericMatches) return { status: "not-found" };
  const isBareNumber = /^\d+$/.test(trimmed);
  const segments = trimmed.toUpperCase().split(/[\s\-_/]+/).filter(Boolean);
  const codeMatch = workshops.find((workshop) => segments.includes(workshop.workshopCode.toUpperCase()));
  if (!isBareNumber && !codeMatch) return { status: "not-found" };
  const number = String(Number.parseInt(numericMatches[numericMatches.length - 1], 10));
  const chosen = selectedKey ? workshops.find((workshop) => workshop.key === selectedKey) : codeMatch;
  const candidates = chosen ? [chosen] : workshops;
  const candidateKeys = candidates.map((workshop) => workshop.key);
  const matches = await ParticipantModel.find({
    workshop: { $in: candidateKeys },
    $or: [
      { normalizedId: number },
      { id: { $regex: `^0*${number}$` } },
    ],
  }).select("id name workshop attendance").lean();
  const completedMatches = matches.filter((record) => workshops.find((event) => event.key === record.workshop)?.isCompleted === true);
  if (completedMatches.length === 0 && matches.length > 0) return { status: "event-not-completed" };
  const attendedMatches = completedMatches.filter((record) => record.attendance === true);
  if (attendedMatches.length === 0 && completedMatches.length > 0) return { status: "attendance-required" };
  const found: CertificateCandidate[] = attendedMatches.flatMap((record) => {
    const workshop = workshops.find((entry) => entry.key === record.workshop);
    if (!workshop) return [];
    const participant: Participant = { id: record.id, name: record.name, workshop: record.workshop };
    return [{ participant, workshop, formattedId: formatCertificateId(record.id, workshop) }];
  });
  if (!found.length) return { status: "not-found" };
  if (found.length > 1 && !chosen) return { status: "ambiguous", candidates: found };
  const first = found[0];
  return { status: "found", participant: first.participant, formattedId: first.formattedId, workshop: first.workshop };
}
