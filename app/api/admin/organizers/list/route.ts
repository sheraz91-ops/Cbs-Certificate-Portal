import { adminPost } from "@/lib/adminApi";
import { successResponse } from "@/lib/api-response";
import OrganizerModel from "@/models/Organizer";

export const runtime = "nodejs";

export const POST = adminPost(async () => {
  const organizers = await OrganizerModel.find().sort({ fullName: 1 }).select("organizerId emailAddress fullName registrationNumber department workshops isActive createdAt").lean();
  const content = organizers.map((organizer) => ({ ...organizer, emailAddress: organizer.emailAddress ?? "", department: organizer.department ?? "", createdAt: organizer.createdAt.toISOString() }));
  return successResponse(content, "Successfully retrieved organizers", content.length);
}, "Admin organizer list");
