# Brand Architecture

Last updated: 2026-03-21

## Purpose

This document is the canonical source of truth for naming across platform, operations, consumer surfaces, and deployment context.

It defines what each product is, how each surface should be described, and how internal identifiers must relate to public branding.

This document is normative. Repo names, package names, folder names, Vercel project names, domains, and deployment labels must map back to this model. They do not override it.

## Canonical Model

- `AREI` is the parent platform.
- `AREI Admin` is the internal operational product.
- `KazaVerde` is the Cape Verde consumer surface.
- `Powered by AREI` is the default endorsement for consumer surfaces.

Core rule:
- `AREI drives KazaVerde`
- `AREI is not KazaVerde`

## Brand Layers

### 1. Canonical Naming

This layer defines what each thing is.

Canonical names:
- `AREI`
- `AREI Admin`
- `KazaVerde`

These names define the brand architecture.

### 2. Technical and Deployment Identifiers

This layer includes internal identifiers used for engineering and operations.

Examples:
- repo names
- package names
- folder names
- service names
- app paths
- Vercel project names
- deployment labels

Examples in the current system:
- `arei-platform`
- `arei-platform`
- `arei-admin`
- `kazaverde-web`
- `packages/arei-sdk`

These identifiers are implementation details. They must support the canonical model, not redefine it.

### 3. Public Branding

This layer defines what external users see.

Examples:
- product names
- domain names
- navigation labels
- headers
- trust messaging
- endorsement text

Examples in the current system:
- `AREI`
- `KazaVerde`
- `kazaverde.com`
- `Powered by AREI`

Public branding must follow the canonical model, regardless of internal naming convenience.

## Canonical Naming Matrix

| Surface | Canonical name | Role | Current internal identifier(s) | Current deployment identifier(s) | Public-facing name | Endorsement |
| --- | --- | --- | --- | --- | --- | --- |
| Parent platform | `AREI` / `Africa Real Estate Index` | Parent data platform and infrastructure layer | repo: `arei-platform`, root package: `arei-platform` | none as a standalone consumer deployment | `AREI` | none |
| Internal ops product | `AREI Admin` | Internal control room for pipelines, QA, source health, and market operations | `arei-admin` | `arei-admin` | internal only | none |
| Cape Verde consumer surface | `KazaVerde` | Cape Verde discovery and listing index | `kazaverde-web` | `kazaverde-web` | `KazaVerde` / `kazaverde.com` | `Powered by AREI` |
| Shared technical package | `AREI SDK` | Internal shared data-access component for AREI-powered products | `packages/arei-sdk` | n/a | not a public brand | none |

## Naming Rules

- `AREI` must remain the parent platform, not a local consumer site.
- `KazaVerde` must remain a local consumer surface, not the company name.
- `AREI Admin` must remain an internal product, not a public-facing brand.
- Internal identifiers may be technical and market-specific, but they must not be treated as public naming decisions.
- Public product naming must not be inferred from repo, package, folder, or Vercel names.
- A change in repo, deployment, or domain naming does not change the canonical model unless this document is intentionally updated.

## Language Guardrails

| Surface | Preferred language | Avoid by default |
| --- | --- | --- |
| `AREI` | `data platform`, `index`, `normalization layer`, `market intelligence infrastructure`, `coverage`, `quality`, `source quality` | `marketplace`, `Cape Verde site`, `local portal`, `aggregator` as primary external framing |
| `AREI Admin` | `sources`, `pipelines`, `sync`, `QA`, `feed health`, `market coverage`, `freshness`, `review` | consumer lifestyle language, shopping language, marketplace language |
| `KazaVerde` | `discover`, `compare`, `explore`, `source-linked listings`, `market intelligence`, `listing index`, `local market visibility` | `marketplace`, `buy`, `rent`, `transact` unless those workflows are explicitly supported |

Additional rules:
- `KazaVerde` may use `homes`, `property`, and local market language where truthful.
- `KazaVerde` must not imply transaction capability that the product does not support.
- `Aggregator` may be used internally as shorthand for multi-source ingestion, but it should not be the default external label for `AREI`.
- `AREI SDK` is an internal technical component. It is not a public-facing brand and should not appear in public product positioning.

## Endorsement Policy

Default endorsement for consumer surfaces:
- `Powered by AREI`

Rules:
- The local consumer brand remains primary.
- The endorsement remains secondary.
- The endorsement should reinforce trust, continuity, and platform credibility.
- The endorsement should not replace the local product name in titles, headers, navigation, or domain strategy.

## Operational Implication

All naming in operations must map back to this document.

That includes:
- repo naming
- package naming
- folder naming
- Vercel project naming
- domain mapping
- deployment labels
- internal service labels
- release and deploy documentation

If an identifier creates ambiguity between platform, admin, and consumer surface, it should be treated as naming drift and corrected in the relevant implementation layer. The canonical model remains the reference point.

## Approved Framing

Approved:
- `AREI provides the platform and data infrastructure behind KazaVerde.`
- `KazaVerde is a Cape Verde discovery and listing index powered by AREI.`
- `AREI Admin is the internal operations product for source monitoring, QA, and feed health.`

Not approved:
- `AREI is the Cape Verde site.`
- `KazaVerde is the AREI marketplace in Cape Verde.`
- `The Vercel project or repo name is the public product name.`

## Scope

This document defines the naming model and its operational consequences.

It does not by itself authorize:
- repo renames
- package renames
- Vercel project renames
- domain changes
- deployment restructuring
- public brand migrations

Those are follow-on implementation decisions and must remain consistent with this document.
