import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api-response";
import { ADMIN_SESSION_COOKIE, isSameOriginRequest, isValidAdminSession } from "@/lib/adminSession";
import { z } from "zod";

export type AdminBody = {
  [key: string]: unknown;
};

type AdminHandler = (body: AdminBody) => Promise<NextResponse>;

/** Wrap an admin-only POST route with same-origin and signed-session checks, DB setup and envelope errors. */
export function adminPost(handler: AdminHandler, routeName: string) {
  return async function POST(request: NextRequest) {
    if (!isSameOriginRequest(request)) return errorResponse("Cross-origin admin requests are not allowed", 403);

    let body: AdminBody;
    try {
      const parsed = z.record(z.string(), z.unknown()).safeParse(await request.json());
      if (!parsed.success) return errorResponse("Invalid request body", 400);
      body = parsed.data;
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!session) {
      return errorResponse("Admin session expired or missing", 401);
    }

    try {
      await connectToDatabase();
      if (!await isValidAdminSession(session)) return errorResponse("Admin session expired or missing", 401);
      const response = await handler(body);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      console.error(`${routeName} API error:`, error);
      return errorResponse("Server error", 500);
    }
  };
}
