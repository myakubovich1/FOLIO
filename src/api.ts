export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      headers:
        body instanceof FormData
          ? undefined
          : { "content-type": "application/json" },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw Error(
      "We could not reach Folio. Check your connection and retry; saved records are preserved.",
    );
  }
  const data = await response.json().catch(() => ({
    error: "The service could not complete the request. Please retry.",
  }));
  if (!response.ok)
    throw Error(data.error || "The request could not complete. Please retry.");
  return data as T;
}
export const money = (n: number | undefined, currency: string) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n / 100)
    : "Not shared";
export const displayDate = (s: string) =>
  s
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(s))
    : "Not established";
