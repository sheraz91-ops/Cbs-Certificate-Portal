import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import { ADMIN_SESSION_COOKIE, isSameOriginRequest, revokeAdminSession } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return errorResponse("Cross-origin admin requests are not allowed", 403);
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  try {
    if (token) {
      await connectToDatabase();
      await revokeAdminSession(token);
    }
  } catch (error) {
    console.error("Admin logout error:", error);
    const response = errorResponse("Could not revoke the admin session", 500);
    clearSessionCookie(response);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = successResponse(null, "Successfully logged out", 0);
  clearSessionCookie(response);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function clearSessionCookie(response: ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin",
    maxAge: 0,
    priority: "high",
  });
}
