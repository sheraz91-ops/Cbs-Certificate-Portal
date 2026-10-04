import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { formatCertificateId } from "@/lib/formatId";
import { normalizeParticipantId } from "@/lib/participantId";
import { errorResponse, successResponse } from "@/lib/api-response";
import ParticipantModel from "@/models/Participant";
import OrganizerModel from "@/models/Organizer";
import WorkshopModel from "@/models/Workshop";
import type { CertificateCandidate, DatabaseLookupResult, Participant } from "@/types";
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
    const parts = id.trim().toUpperCase().split(/[\s\-_/]+/).filter(Boolean);
    const workshopCode = parts.find((part) => /^[A-Z0-9]+$/.test(part) && part !== "CBS" && !/^\d+$/.test(part));
    const year = parts.find((part) => /^\d{4}$/.test(part));
    const workshopFilter = selectedKey
      ? { key: selectedKey }
      : workshopCode
        ? { workshopCode, ...(year ? { eventYear: year } : {}) }
        : {};
    const workshops = await WorkshopModel.find(workshopFilter)
      .select("-templateData")
      .lean() as unknown as WorkshopDefinition[];
    const result = await lookup(id, selectedKey, workshops);
    const message = result.status === "found"
      ? "Certificate found"
      : result.status === "ambiguous"
        ? "Multiple certificates found"
        : result.status === "attendance-required"
          ? "Certificate is unavailable until attendance is marked present"
        : "Certificate not found";
    const count = result.status === "ambiguous" ? result.candidates.length : result.status === "found" ? 1 : 0;
    return successResponse(result, message, count);
  } catch (error) {
    console.error("Certificate lookup error:", error);
    return errorResponse("Unable to look up certificate");
  }
}

async function lookup(rawId: string, selectedKey: string | undefined, workshops: WorkshopDefinition[]): Promise<DatabaseLookupResult> {
  const trimmed = rawId.trim();
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
  }).lean();
  const attendedMatches = matches.filter((record) => record.attendance === true);
  if (attendedMatches.length === 0 && matches.length > 0) return { status: "attendance-required" };
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

