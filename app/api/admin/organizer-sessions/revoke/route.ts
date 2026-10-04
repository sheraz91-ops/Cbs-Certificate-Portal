import { adminPost } from "@/lib/adminApi";
import { errorResponse, successResponse } from "@/lib/api-response";
import OrganizerSessionModel from "@/models/OrganizerSession";
import { z } from "zod";

export const runtime = "nodejs";
const schema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict();

export const POST = adminPost(async (body) => {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid organizer session", 400);
  const result = await OrganizerSessionModel.deleteOne({ _id: parsed.data.id });
  if (!result.deletedCount) return errorResponse("Organizer session was not found or has already ended", 404);
  return successResponse(null, "Organizer session revoked", 1);
}, "Admin organizer session revoke");
