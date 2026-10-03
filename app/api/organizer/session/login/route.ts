import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateOrganizer, createOrganizerSession, createOrganizerSessionToken, ORGANIZER_SESSION_COOKIE, ORGANIZER_SESSION_DURATION_SECONDS } from "@/lib/organizerAuth";
import { connectToDatabase } from "@/lib/mongodb";
import { isSameOriginRequest } from "@/lib/adminSession";
import { organizerLoginSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return errorResponse("Cross-origin organizer requests are not allowed", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body", 400); }
  const parsed = organizerLoginSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);
  try {
    await connectToDatabase();
    const organizer = await authenticateOrganizer(parsed.data.email, parsed.data.password);
    if (!organizer) return errorResponse("Invalid organizer credentials", 401);
    const token = createOrganizerSessionToken();
    await createOrganizerSession(token, organizer._id.toString());
    const response = successResponse({ authenticated: true, fullName: organizer.fullName }, "Successfully authenticated", 1);
    response.cookies.set(ORGANIZER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/organizer",
      maxAge: ORGANIZER_SESSION_DURATION_SECONDS,
      priority: "high",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Organizer login error:", error);
    return errorResponse("Unable to start organizer session");
  }
}
