import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import { ADMIN_SESSION_COOKIE, isSameOriginRequest, isValidAdminSession } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isSameOriginRequest(request)) return errorResponse("Cross-origin admin requests are not allowed", 403);
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return errorResponse("Admin session expired or missing", 401);
  try {
    await connectToDatabase();
    if (!await isValidAdminSession(token)) return errorResponse("Admin session expired or missing", 401);
    const response = successResponse({ authenticated: true }, "Admin session is active", 1);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Admin session status error:", error);
    return errorResponse("Unable to verify admin session", 500);
  }
}
