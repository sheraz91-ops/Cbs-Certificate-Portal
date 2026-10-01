import type { ApiEnvelope, ApiErrorContent } from "@/types/api";
import { apiEnvelopeSchema } from "@/lib/validation/schemas";

export class ApiRequestError extends Error {
  readonly Code: number;
  readonly Content: ApiErrorContent | unknown;
  readonly Count: number;
  readonly Status: "Error";

  constructor(response: ApiEnvelope<unknown>) {
    super(response.Message || "The request failed");
    this.name = "ApiRequestError";
    this.Code = response.Code;
    this.Content = response.Content;
    this.Count = response.Count;
    this.Status = "Error";
  }
}

function requestData<T>(url: string, init?: RequestInit, responseType?: "json"): Promise<ApiEnvelope<T>>;
function requestData(url: string, init: RequestInit | undefined, responseType: "arrayBuffer"): Promise<ArrayBuffer>;
async function requestData<T>(
  url: string,
  init?: RequestInit,
  responseType: "json" | "arrayBuffer" = "json",
): Promise<ApiEnvelope<T> | ArrayBuffer> {
  const response = await fetch(url, {
    ...init,
    credentials: init?.credentials ?? "same-origin",
  });
  if (responseType === "arrayBuffer") {
    if (!response.ok) throw new Error(`Unable to load asset (${response.status})`);
    return response.arrayBuffer();
  }

  let result: ApiEnvelope<T>;
  try {
    const parsed = apiEnvelopeSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Invalid API envelope");
    result = parsed.data as ApiEnvelope<T>;
  } catch {
    throw new Error(`The server returned an invalid response (${response.status})`);
  }

  if (!response.ok || result.Status !== "Success") {
    if (
      response.status === 401 &&
      url.startsWith("/api/admin/") &&
      !url.startsWith("/api/admin/session/") &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("admin-session-expired"));
    }
    throw new ApiRequestError(result as ApiEnvelope<unknown>);
  }
  return result;
}

export async function getData<T>(
  url: string,
  init?: Omit<RequestInit, "method" | "body">,
  responseType: "json" | "arrayBuffer" = "json",
): Promise<T> {
  if (responseType === "arrayBuffer") {
    return await requestData(url, { ...init, method: "GET" }, responseType) as T;
  }
  const result = await requestData<T>(url, { ...init, method: "GET" });
  return result.Content;
}

export async function postData<T, TBody>(url: string, body: TBody): Promise<T> {
  const result = await requestData<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return result.Content;
}
