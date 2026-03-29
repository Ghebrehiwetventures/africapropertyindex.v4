# Document Precedence

This file defines which documents govern AREI when documents overlap or conflict.

## Canonical order

1. **Operating Model Second Pass**
   - Governs control plane, automation boundaries, placement map, and when new orchestration layers are allowed.

2. **Founder Operating Runbook**
   - Governs weekly operating rhythm, intelligence loop, content/distribution cadence, dashboard checks, tool review cadence, and founder-facing business operations.

3. **Execution Protocol**
   - Governs how AI tools are allowed to work inside the repo: truth classes, task briefs, verification requirements, escalation rules, and done standard.

4. **Launch Plan / launch gating docs**
   - Govern current launch readiness, go/no-go gates, and launch sequencing.

5. **Market thesis docs**
   - Govern market choice and proof obligations for Market 1.

6. **Vision / strategy docs**
   - Govern long-range direction, company thesis, and architectural intent.

7. **Tool Stack Decision Memo**
   - Background research and selection rationale.
   - Use it as supporting context, not as the final authority when a later operating document makes a more explicit decision.

## Conflict rule

If two documents conflict, the higher document in this list wins.

## Interpretation rule

- Use newer operating documents over older research memos.
- Use operating documents for current execution rules.
- Use strategy docs for direction, not for proof of current state.
- Documentation never overrides live reality, current code, or current verified output.

## Current explicit overrides

The Tool Stack Decision Memo explored a Windmill-in-v1 path.
The Operating Model Second Pass supersedes that and sets the current rule:
**no orchestration layer in v1 unless the stated trigger conditions are reached.**

The Tool Stack Decision Memo also evaluated Paperclip as a candidate tool.
The Operating Model Second Pass supersedes that and sets the current rule:
**Paperclip is not part of AREI's runtime or control plane in v1; at most it is a possible later research/intelligence experiment.**
