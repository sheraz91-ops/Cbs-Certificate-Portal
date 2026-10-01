import { NextRequest } from "next/server";
import { checkAdminPassword } from "@/lib/adminAuth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/mongodb";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, isSameOriginRequest, storeAdminSession } from "@/lib/adminSession";
import { adminLoginSchema, validationMessage } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return errorResponse("Cross-origin admin requests are not allowed", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationMessage(parsed.error), 400);

  try {
    if (!checkAdminPassword(parsed.data.password)) {
      return errorResponse("Invalid admin password", 401);
    }

    await connectToDatabase();
    const sessionToken = createAdminSessionToken();
    await storeAdminSession(sessionToken);
    const response = successResponse({ authenticated: true }, "Successfully authenticated", 1);
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/admin",
      priority: "high",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return errorResponse("Admin authentication is not configured correctly", 500);
  }
}
