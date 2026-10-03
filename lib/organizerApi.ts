import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api-response";
import { findOrganizerForSession, ORGANIZER_SESSION_COOKIE } from "@/lib/organizerAuth";
import { isSameOriginRequest } from "@/lib/adminSession";

export type OrganizerBody = Record<string, unknown>;
type OrganizerHandler = (body: OrganizerBody, organizer: NonNullable<Awaited<ReturnType<typeof findOrganizerForSession>>>) => Promise<NextResponse>;

export function organizerPost(handler: OrganizerHandler, routeName: string) {
  return async function POST(request: NextRequest) {
    if (!isSameOriginRequest(request)) return errorResponse("Cross-origin organizer requests are not allowed", 403);
    let body: OrganizerBody;
    try {
      const parsed = z.record(z.string(), z.unknown()).safeParse(await request.json());
      if (!parsed.success) return errorResponse("Invalid request body", 400);
      body = parsed.data;
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    try {
      await connectToDatabase();
      const organizer = await findOrganizerForSession(request.cookies.get(ORGANIZER_SESSION_COOKIE)?.value);
      if (!organizer) return errorResponse("Organizer session expired or missing", 401);
      const response = await handler(body, organizer);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      console.error(`${routeName} API error:`, error);
      return errorResponse("Server error", 500);
    }
  };
}
