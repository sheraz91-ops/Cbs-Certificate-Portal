import { adminPost } from "@/lib/adminApi";
import { successResponse } from "@/lib/api-response";
import OrganizerModel from "@/models/Organizer";
import OrganizerSessionModel from "@/models/OrganizerSession";

export const runtime = "nodejs";

export const POST = adminPost(async () => {
  const now = new Date();
  const sessions = await OrganizerSessionModel.find({ expiresAt: { $gt: now } })
    .sort({ createdAt: -1 })
    .select("organizerId createdAt expiresAt")
    .lean();
  const organizerIds = [...new Set(sessions.map((session) => String(session.organizerId)))];
  const organizers = await OrganizerModel.find({ _id: { $in: organizerIds } })
    .select("organizerId fullName emailAddress")
    .lean();
  const organizersById = new Map(organizers.map((organizer) => [String(organizer._id), organizer]));
  const content = sessions.flatMap((session) => {
    const organizer = organizersById.get(String(session.organizerId));
    if (!organizer) return [];
    return [{ id: String(session._id), organizerId: organizer.organizerId, fullName: organizer.fullName, emailAddress: organizer.emailAddress, createdAt: session.createdAt.toISOString(), expiresAt: session.expiresAt.toISOString() }];
  });
  return successResponse(content, "Successfully retrieved organizer sessions", content.length);
}, "Admin organizer sessions list");
