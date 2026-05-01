# WhatsApp CTA Tracking Foundation

## Scope

This is a lightweight public KazaVerde listing-page foundation for WhatsApp CTA measurement. It does not add the WhatsApp Business API, Meta credentials, phone collection forms, or external A/B testing tools.

## What Is Tracked

When `VITE_KAZAVERDE_WHATSAPP_NUMBER` is configured, listing detail pages can emit:

- `wa_cta_view` when a WhatsApp CTA is shown.
- `wa_click` when a visitor clicks a WhatsApp CTA.

Event metadata:

- `listing_id`
- `source`
- `island`
- `city`
- `page_type`
- `variant_id`
- `cta_location`

Current variant:

- `wa_prefill_context_v1`

## WhatsApp Link Behavior

The CTA uses a contextual `wa.me` link with a prefilled message containing the listing title, location, listing id, and source id when available.

Example message shape:

`Hi, I'm interested in "Listing title" in City, Island. Is it still available, and can you share more details? Listing ref: abc. Source: cv_source.`

## What Is Not Measurable Yet

`wa_click` is not the same as a confirmed WhatsApp message sent. It only means the visitor clicked the CTA and was handed off to WhatsApp. We cannot currently measure whether the visitor:

- opened WhatsApp successfully
- selected or kept the prefilled text
- sent the message
- received or replied to a response
- became a qualified lead

Those steps would require a deeper WhatsApp integration or a lead capture flow, both intentionally out of scope for this foundation.

## Next Possible Tests

- CTA copy: `Ask on WhatsApp` vs `Check availability on WhatsApp`.
- Prefill wording: availability-first vs viewing-first.
- CTA placement: sidebar only vs sidebar plus mobile sticky.
- Context depth: title/location only vs title/location/source reference.
- Follow-up flow: direct WhatsApp click vs a future phone-first lead form.
