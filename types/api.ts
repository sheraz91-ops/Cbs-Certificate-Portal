export type ApiStatus = "Success" | "Error";

export type ApiEnvelope<T> = {
  Code: number;
  Content: T;
  Count: number;
  Message: string;
  Status: ApiStatus;
};

export type ApiErrorContent = { error: string };
