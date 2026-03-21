# Follow-Up Task: View Security Audit

Date: 2026-03-21

Scope:
- Audit `public.public_listings`
- Audit `public.v1_feed_cv`

Goals:
- Verify whether each view is currently missing `security_invoker = true`
- Confirm the underlying table/view dependency chain for each
- Check the RLS and grant assumptions each view depends on
- Propose a separate migration, if needed, without bundling it into `frontend_listings_v1` / `frontend_listings_v2`

Out of scope:
- Do not modify these views as part of migration `011_frontend_listings_security_invoker.sql`
