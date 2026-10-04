import { organizerPost } from "@/lib/organizerApi";
import { successResponse } from "@/lib/api-response";
import WorkshopModel from "@/models/Workshop";

export const runtime = "nodejs";

export const POST = organizerPost(async (_body, organizer) => {
  const events = await WorkshopModel.find({ key: { $in: organizer.workshops } })
    .sort({ eventYear: -1, workshopName: 1 })
    .select("key workshopName workshopFullTitle workshopCode eventYear eventDate allowOutsiders")
    .lean();
  return successResponse(events.map(({ _id, ...event }) => ({ ...event, allowOutsiders: event.allowOutsiders ?? false })), "Successfully retrieved assigned events", events.length);
}, "Organizer event list");
