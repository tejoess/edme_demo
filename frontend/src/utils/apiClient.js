import { BASE_URL } from "../api";

export const SESSION_EXPIRED_EVENT = "covermate:session-expired";

function buildHeaders(options) {
  const token = localStorage.getItem("token");
  const headers = { ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

/**
 * Authenticated fetch wrapper.
 * - Attaches the bearer token automatically.
 * - JSON-encodes plain object bodies.
 * - On 401, clears the session and broadcasts SESSION_EXPIRED_EVENT.
 * - Throws an Error with a readable message on non-2xx responses.
 */
export async function apiFetch(path, options = {}) {
  const { body, ...rest } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: buildHeaders(options),
    body: isFormData || typeof body === "string" || body === undefined
      ? body
      : JSON.stringify(body),
  });

  if (response.status === 401) {
    localStorage.clear();
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    throw new Error("Your session has expired. Please log in again.");
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const detail = data && data.detail;
    let message = "Something went wrong. Please try again.";
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail) && detail[0]?.msg) message = detail[0].msg;
    throw new Error(message);
  }

  return data;
}

export async function apiFetchBlob(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options),
  });

  if (response.status === 401) {
    localStorage.clear();
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Request failed. Please try again.");
  }

  return response.blob();
}
