# AREI Founder Operating Runbook

Version 1.1 | March 2026

Companion to: Operating Model Second Pass, Execution Protocol, docs/document-precedence.md

---

## 1. Purpose

The Execution Protocol governs how AI agents work in the repo. This document governs everything else: how you, as a solo founder, actually operate AREI week to week.

It covers the operational cadences, intelligence loops, content pipeline, distribution rules, tooling reviews, dashboard model, and growth mechanisms that the Execution Protocol deliberately excludes.

> This is a living operational document. Update it as AREI's reality changes. Do not let it become a historical artifact.

Document precedence is defined in `docs/document-precedence.md`. If this runbook conflicts with an older research memo, the precedence file controls.

## 2. Weekly Rhythm

AREI at the current stage (one market, soft live, solo founder) runs on a weekly cycle. The week has three zones.

| Day | Zone | Primary Focus |
| --- | --- | --- |
| Monday | Orientation | Review crawl health, check Slack digest, triage what broke over weekend |
| Tuesday | Build | Execute highest-priority task from the week plan (pipeline, portal, data) |
| Wednesday | Build | Continue execution. If task is done, move to next priority. |
| Thursday | Distribution | Content drafting, newsletter prep, outreach review, social scheduling |
| Friday | Intelligence + Review | Read research inbox, review tool performance, update runbook if needed |
| Weekend | Passive | Crawlers run. Alerts only if something breaks. No active work expected. |

**Monday morning ritual (15 min):** Check #ops-digest in Slack. Scan crawl job success/failure in GitHub Actions. Open Netlify Analytics for weekend traffic. Note anything that needs immediate attention. Write three priorities for the week in a scratch note.

## 3. Intelligence Pipeline

### 3a. Market intelligence

AREI's competitive advantage is knowing the African property data landscape better than anyone. This requires a deliberate intelligence habit, not sporadic Googling.

| Cadence | Activity | Tool |
| --- | --- | --- |
| Daily (2 min) | Scan Feedly for new property sources, competitor moves, market news | Feedly |
| Weekly (Friday, 30 min) | Process research inbox: links, articles, tweets collected during the week | Claude session |
| Weekly (Friday) | Check if any new property portals appeared in target markets | Web search + manual |
| Monthly | Review Cape Verde source health: any sources dead? Any new ones? | Crawl logs + manual check |
| Quarterly | Reassess: is Cape Verde still the right focus, or is a Market 2 signal appearing? | Strategy review |

### 3b. Research inbox pattern

Keep a running list of links, articles, tweets, and videos you encounter during the week. Do not try to process them in real time. Batch them for Friday.

The process:

1. Dump links into a markdown file or Notion page throughout the week.
2. On Friday, open a Claude session and paste the batch.
3. Ask: "Read these. What is relevant to AREI? Does anything change our operating model?"
4. If something matters, update the relevant canonical doc (not a new doc).
5. If nothing matters, note that and move on.

> The market is moving fast on AI tooling. Your job is not to track everything. Your job is to filter ruthlessly for what affects AREI's crawl pipeline, distribution, or market position. Everything else is noise.

### 3c. Founder learning recommendations

Each week, based on where AREI is in the launch plan, surface 2-3 resources worth consuming. This is not automated in v1. It is a deliberate Friday habit.

Match learning to current phase:

- Pre-launch (now): SEO fundamentals, content distribution for small markets, property data quality
- Post-launch: Google Ads basics, newsletter growth tactics, user feedback interpretation
- Scaling: Multi-market ops, hiring first engineer, data licensing models
- If failing in a specific area: find one podcast, one article, one practitioner who solved that problem

### 3d. Founder Assistant Layer (later, internal only)

AREI may eventually add a founder-facing assistant layer. Its job is to reduce friction for the founder, not to replace AREI's production stack.

**Allowed use:**

- Answer questions about crawl health, portal status, and weekly priorities
- Summarize the research inbox and daily ops digest
- Suggest who to contact, what to read, and what to draft this week
- Prepare task briefs, meeting prep, and content drafts

**Not allowed in v1:**

- Direct writes to crawl runtime, database schema, deploy configuration, or portal production state
- Autonomous external communication
- Autonomous browser actions against third-party systems without explicit human supervision
- Uncontrolled access to founder secrets, credentials, or personal file systems

**Activation trigger:** Only revisit this layer after the daily ops digest, research inbox pattern, and weekly founder rhythm are stable in practice.

## 4. Content Pipeline

### 4a. Content types

| Content Type | Cadence | Tool | Human Gate |
| --- | --- | --- | --- |
| Newsletter | Biweekly | Loops ($49/mo) | AI drafts, founder edits and approves send |
| Social posts (X, LinkedIn) | 3-4x/week | Typefully ($19/mo) | AI drafts, founder reviews and schedules |
| Market pulse / data insight | Monthly | SQL query + AI draft | Founder verifies data, edits narrative, approves |
| Press release | When data warrants | AI draft | Founder writes final version. AI researches only. |
| Blog / SEO content | As needed | Manual or AI-assisted | Founder approves before publish |

### 4b. Market pulse engine

This is one of AREI's highest-value content plays. Once the crawl pipeline has 2-3 months of historical data in Neon, you can detect price trends and generate genuine market insights.

The flow:

1. Monthly cron (GitHub Actions) runs a SQL query comparing current vs. prior month: average prices by island, listing count changes, new source additions.
2. If a notable trend is detected (>5% price shift, supply spike, new source), it flags it.
3. AI drafts a short market insight or press release.
4. Founder verifies the data is real (not a crawl artifact), edits the narrative, publishes via Loops and Typefully.

> **Do not publish data claims without verifying the underlying query. A crawl failure can look like a market crash. Always check: did the data change, or did the crawler break?**

### 4c. Social media rules

AI may draft social posts. AI may not post or comment autonomously. AI may not auto-reply, auto-engage, or simulate organic interaction on any platform.

The right flow: AI drafts in Typefully, founder reviews, Typefully schedules. Founder handles all replies and engagement manually. In a small market like Cape Verde, the human touch on replies is what builds trust.

A future founder assistant may propose drafts or queues, but it does not change the human approval requirement.

## 5. Distribution Strategy

### 5a. Current phase: earned distribution

KazaVerde is in soft live / controlled iteration. The current focus is earned distribution, newsletter growth, and reusable Market 1 learning. No paid ads yet.

- SEO: Search Console verification and sitemap submission (remaining external step)
- Newsletter: Loops for subscriber capture and biweekly sends
- Social: Typefully for scheduled posts on X and LinkedIn
- Outreach: Folk CRM + Apollo for warm relationship building with Cape Verde property ecosystem

### 5b. Google Ads: when and how

Google Ads is a Gate 2 activity. Do not start before the following conditions are met:

1. KazaVerde has conversion tracking in place (define what "convert" means for a read-only index: newsletter signup? Return visit? Time on site?)
2. You have 2+ months of organic traffic data to identify which keywords drive engaged visitors
3. You have a clear CPA ceiling you are willing to pay

When ready, the approach:

- Start tiny: $5-10/day on branded and long-tail Cape Verde property keywords (Portuguese + English)
- Use Claude Cowork + Google Ads MCP skill pack for weekly account audits and negative keyword discovery
- Review weekly: pause what wastes budget, scale what converts
- No agency needed at this budget level. One founder + AI-assisted optimization is the right scale.

> The Mike Futia pattern (Claude Cowork + Google Ads MCP) is the right approach for a solo founder running a small ads budget. Revisit when monthly ad spend exceeds $500.

## 6. Subscriptions and Cost Control

### 6a. Current v1 stack costs

| Tool | Monthly Cost | Purpose | Activate When |
| --- | --- | --- | --- |
| Neon PostgreSQL | Free tier | Data storage | Now (active) |
| Netlify | Free tier | Portal hosting | Now (active) |
| GitHub Actions | Free tier | Crawl scheduling | Now (active) |
| Folk CRM | $24 | Relationship tracking | Now |
| Apollo.io | $49 (annual) | Contact enrichment | When outreach begins |
| Loops | $49 | Newsletter / email | When subscriber capture is live |
| Make.com | $29 | Lightweight automation | When 3+ workflows needed |
| Typefully | $19 | Social scheduling | When regular posting begins |
| Warmforge | $49 | Email warm-up | When cold outreach begins |

**Total when fully active:** $219-280/month plus free-tier infrastructure.

### 6b. Monthly tool review (5 minutes, last Friday of month)

For each paid tool, ask:

1. Did I use this tool in the last 30 days?
2. Did it save me more time than the cost represents?
3. Could I replace it with a free alternative without quality loss?

If the answer to #1 is no for two consecutive months, cancel it. Re-subscribe when the need returns.

### 6c. Supplier switching rules

Every critical layer in the stack was chosen to be swappable:

- Neon Postgres uses standard SQL. Can migrate to Supabase, Railway, or self-hosted with pg_dump.
- Netlify can swap to Vercel or Cloudflare Pages with minimal config change.
- Folk CRM exports to CSV. Replaceable with any lightweight CRM.
- Make.com is the main lock-in risk (proprietary visual logic). Keep workflows simple and documented.
- LLMs are not in the v1 runtime pipeline. If added later, use OpenAI-compatible API format for model-swappable config.

> **The only real lock-in risk is Make.com workflows. If a workflow takes more than 30 minutes to document in plain language, it is too complex for Make and should be a script instead.**

## 7. Dashboard and Health Model

### 7a. v1 dashboard (no new tools needed)

You do not need a dashboard product. Your dashboard is:

| What | Where | Cadence |
| --- | --- | --- |
| Portal traffic | Netlify Analytics (free) | Check Monday + Thursday |
| Crawl job health | GitHub Actions run history | Check Monday (or on alert) |
| Database health | Neon console | Check monthly or on issue |
| Daily ops summary | Slack #ops-digest | Read every morning |
| Pipeline / outreach | Folk CRM | Check Thursday |
| Newsletter metrics | Loops dashboard | Check after each send |

### 7b. Health signals to watch

These are the signals that something needs attention:

- Crawl success rate drops below 80% for any source (check GitHub Actions)
- Listing count changes by more than 20% without a known cause
- Site traffic drops to zero (Netlify Analytics)
- Newsletter open rate drops below 15%
- A source you depend on changes its HTML structure (crawl failures)

### 7c. Future dashboard (v1.5, optional)

When you want a single-pane view, the cheapest path is a simple Netlify-hosted page that pulls key metrics from Neon via a serverless function: total listings, source health, traffic trend, last crawl timestamps. This is a weekend project, not a tool purchase.

## 8. Guardrails and Policies

### 8a. Data policy (write before Market 2)

Before scaling beyond Cape Verde, write a short data policy covering:

- How AREI complies with robots.txt on every source
- What happens when a source asks AREI to stop crawling (honor immediately)
- How GDPR/data requests are handled (contact email, response within 30 days)
- That AREI only indexes publicly visible listing data, never private or login-gated content

### 8b. Outreach guardrails

Inherited from the Operating Model Second Pass and Execution Protocol:

- Full Autopilot: warm-up, enrichment, monitoring
- Human Review Gate: sequences, social posts, newsletter sends
- Human Only: first contacts, replies, complaints, legal, journalist messages

### 8c. Quality guardrails

- Never publish a market statistic without verifying the underlying data (crawl artifacts vs. real trends)
- KazaVerde is positioned as a read-only property index. Do not overclaim marketplace or transaction functionality.
- If in doubt about a data claim, downgrade it or omit it. Credibility is the asset.

## 9. Agent Inventory and Org Chart

There is no "agent manager agent" today. You review the automation inventory monthly.

| Process | What It Does | Runs On | Owner |
| --- | --- | --- | --- |
| Property crawlers | Scrape 11 Cape Verde sources, normalize to Neon | GitHub Actions cron | Founder |
| Daily ops digest | 9am summary of crawl health, alerts, traffic | GitHub Actions + Slack | Founder |
| Newsletter send | Biweekly Cape Verde property digest | Loops | Founder (human gate) |
| Social scheduling | Pre-approved posts published on schedule | Typefully | Founder (human gate) |
| Email warm-up | Domain reputation building | Warmforge | Autopilot |
| Contact enrichment | Lead data enrichment for outreach | Apollo.io | Autopilot |

### 9a. Monthly review (5 minutes, last Friday of month)

For each automated process, ask:

1. Is it still running? (Check last run timestamp)
2. Is it producing useful output?
3. Is it worth its cost?
4. Should anything be added, removed, or changed?

This is a spreadsheet problem, not an AI problem. When AREI scales to 3+ markets, consider a part-time ops person who owns this review.

## 10. Growth and Scaling Triggers

Do not scale prematurely. Each trigger below is a signal that a specific capability should be added.

| Trigger Signal | What to Add | Not Before |
| --- | --- | --- |
| 10+ independent crawl sources failing coordination | Windmill orchestration layer | Current: 11 sources, GitHub Actions cron is sufficient |
| Organic traffic baseline established + conversion defined | Google Ads ($5-10/day) | 2-3 months of organic data |
| Monthly ad spend exceeds $500 | Dedicated ads review cadence | Not in v1 |
| 3+ markets active with overlapping schedules | Windmill or dedicated scheduler | Market 2 launch |
| Content volume exceeds founder capacity | Part-time content contractor | When editing takes >5 hrs/week |
| Data depth allows credible claims (2-3 months) | Market pulse / press release engine | Pipeline must be stable first |
| Inbound leads exceed manual tracking | Upgrade Folk CRM or move to HubSpot | When Folk limits are hit |
| 5+ markets, complex pipelines | First engineering hire | Not in v1 or v2 |

> If you are not sure whether a trigger has been reached, it has not been reached. Premature scaling is the most common failure mode for solo-founder data platforms.

## 11. Open Questions

These are decisions that do not need to be made now but should be revisited at the indicated time.

| Question | Revisit When |
| --- | --- |
| Should AREI offer a data API to third parties? | When 3+ markets have stable feeds |
| Should AREI charge for premium data access? | When free index has proven traffic and trust |
| Does AREI need a mobile app? | When mobile traffic exceeds 60% and PWA is insufficient |
| Should KazaVerde become multilingual beyond PT/EN? | When Cape Verde traffic data shows demand |
| Should AREI use LLMs in the crawl pipeline for extraction? | When CSS selectors fail on >30% of sources |
| Is Videntic (AI visibility / GEO optimization) worth paying for? | When KazaVerde has real traffic to optimize |
