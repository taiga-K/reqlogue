import { getApiBaseUrl } from "@/shared/config";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new ApiRequestError(`API ${path} failed`, response.status);
  }
  return (await response.json()) as T;
}

export async function apiGetText(path: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new ApiRequestError(`API ${path} failed`, response.status);
  }
  return response.text();
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiRequestError(`API ${path} failed`, response.status);
  }
  return (await response.json()) as T;
}
