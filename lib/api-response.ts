import { NextResponse } from "next/server";
import type { ApiEnvelope, ApiErrorContent } from "@/types/api";

export function successResponse<T>(
  content: T,
  message = "Successfully completed",
  count = Array.isArray(content) ? content.length : 1,
  statusCode = 200,
) {
  const body: ApiEnvelope<T> = {
    Code: statusCode,
    Content: content,
    Count: count,
    Message: message,
    Status: "Success",
  };
  return NextResponse.json(body, { status: statusCode });
}

export function errorResponse(message: string, statusCode = 500) {
  const body: ApiEnvelope<ApiErrorContent> = {
    Code: statusCode,
    Content: { error: message },
    Count: 0,
    Message: message,
    Status: "Error",
  };
  return NextResponse.json(body, { status: statusCode });
}
