import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import { findOrganizerForSession, ORGANIZER_SESSION_COOKIE } from "@/lib/organizerAuth";
import { isSameOriginRequest } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isSameOriginRequest(request)) return errorResponse("Cross-origin organizer requests are not allowed", 403);
  try {
    await connectToDatabase();
    const organizer = await findOrganizerForSession(request.cookies.get(ORGANIZER_SESSION_COOKIE)?.value);
    if (!organizer) return errorResponse("Organizer session expired or missing", 401);
    const response = successResponse({ authenticated: true, fullName: organizer.fullName }, "Organizer session is active", 1);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Organizer session status error:", error);
    return errorResponse("Unable to verify organizer session");
  }
}
