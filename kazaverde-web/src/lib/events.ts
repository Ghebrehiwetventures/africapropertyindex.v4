export type EventMetadata = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(eventName: string, metadata: EventMetadata = {}) {
  if (typeof window === "undefined") return;

  const cleanMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  );

  const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
  if (gtag) {
    gtag("event", eventName, cleanMetadata);
    return;
  }

  if (import.meta.env.DEV) {
    console.info("[kv-event]", eventName, cleanMetadata);
  }
}
