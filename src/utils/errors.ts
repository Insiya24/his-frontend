import type { AxiosError } from "axios";

interface ValidationItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

interface ErrorBody {
  detail?: string | ValidationItem[];
}

function isAxiosError(error: unknown): error is AxiosError<ErrorBody> {
  return typeof error === "object" && error !== null && "isAxiosError" in error;
}

export function getApiStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) return error.response?.status;
  return undefined;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isAxiosError(error)) {
    if (error.code === "ERR_NETWORK") {
      return "Cannot reach the server. Check your connection and try again.";
    }
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.length > 0) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((item) => item.msg).join(" ");
    }
    if (error.response?.status === 401) return "Your session has expired. Please sign in again.";
    if (error.response && error.response.status >= 500) {
      return "The server encountered an error. Please try again shortly.";
    }
  }
  return fallback;
}

const IGNORED_LOC_PARTS = new Set(["body", "query", "path", "header"]);

export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!isAxiosError(error)) return result;
  const detail = error.response?.data?.detail;
  if (!Array.isArray(detail)) return result;
  for (const item of detail) {
    const field = [...item.loc]
      .reverse()
      .find((part): part is string => typeof part === "string" && !IGNORED_LOC_PARTS.has(part));
    if (field && !result[field]) result[field] = item.msg;
  }
  return result;
}

export function isPasswordChangeError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const detail = error.response?.data?.detail;
  return (
    error.response?.status === 403 &&
    typeof detail === "string" &&
    detail.toLowerCase().includes("password change")
  );
}
