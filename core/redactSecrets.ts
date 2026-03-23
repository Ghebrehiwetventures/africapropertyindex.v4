const SENSITIVE_QUERY_PARAMS = new Set([
  "access_token",
  "api_key",
  "client_secret",
  "key",
  "signature",
  "token",
  "x-api-key",
  "x-goog-api-key",
]);

function redactUrlSecrets(value: string): string {
  if (!value.includes("://") || !value.includes("?")) {
    return value;
  }

  try {
    const url = new URL(value);
    let changed = false;

    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
        changed = true;
      }
    }

    return changed ? url.toString() : value;
  } catch {
    return value;
  }
}

export function sanitizeArtifactPayload<T>(value: T): T {
  if (typeof value === "string") {
    return redactUrlSecrets(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeArtifactPayload(item)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized = Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
    acc[key] = sanitizeArtifactPayload(nestedValue);
    return acc;
  }, {});

  return sanitized as T;
}
