import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import { ORGANIZER_SESSION_COOKIE, revokeOrganizerSession } from "@/lib/organizerAuth";
import { isSameOriginRequest } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return errorResponse("Cross-origin organizer requests are not allowed", 403);
  const token = request.cookies.get(ORGANIZER_SESSION_COOKIE)?.value;
  try {
    await connectToDatabase();
    await revokeOrganizerSession(token);
    const response = successResponse(null, "Successfully logged out", 0);
    clearCookie(response);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Organizer logout error:", error);
    const response = errorResponse("Could not revoke the organizer session", 500);
    clearCookie(response);
    return response;
  }
}

function clearCookie(response: ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>) {
  response.cookies.set(ORGANIZER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/organizer",
    maxAge: 0,
    priority: "high",
  });
}
