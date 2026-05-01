export const WHATSAPP_CTA_VARIANT_ID = "wa_prefill_context_v1";

export interface WhatsAppListingContext {
  title: string;
  city?: string | null;
  island?: string | null;
  listingId?: string | null;
  sourceId?: string | null;
  phoneNumber?: string | null;
}

function configuredWhatsAppNumber(): string | null {
  return import.meta.env.VITE_KAZAVERDE_WHATSAPP_NUMBER?.trim() || null;
}

function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length > 0 ? digits : null;
}

export function buildWhatsAppPrefill(ctx: WhatsAppListingContext): string {
  const title = ctx.title.trim() || "this property";
  const location = [ctx.city, ctx.island].filter(Boolean).join(", ");
  const listingRef = ctx.listingId ? ` Listing ref: ${ctx.listingId}.` : "";
  const sourceRef = ctx.sourceId ? ` Source: ${ctx.sourceId}.` : "";
  const locationText = location ? ` in ${location}` : "";

  return `Hi, I'm interested in "${title}"${locationText}. Is it still available, and can you share more details?${listingRef}${sourceRef}`;
}

export function buildWhatsAppUrl(ctx: WhatsAppListingContext): string | null {
  const number = normalizeWhatsAppNumber(ctx.phoneNumber ?? configuredWhatsAppNumber());
  if (!number) return null;

  const text = encodeURIComponent(buildWhatsAppPrefill(ctx));
  return `https://wa.me/${number}?text=${text}`;
}
