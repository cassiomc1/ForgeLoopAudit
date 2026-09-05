# ForgeLoopAudit — UI Design Direction

## Goal

Create a premium dark developer interface that makes ForgeLoop state readable at a glance without becoming visually noisy.

## Visual language

The product should feel calm, precise, technical and modern.

Reference quality bar:

- Linear
- Raycast
- Vercel dashboard
- GitHub Desktop
- modern observability tooling

Do not clone any product directly.

## Core principles

1. Dark by default.
2. Minimal chrome.
3. Strong hierarchy through spacing and typography rather than decoration.
4. Color is semantic.
5. Current state is obvious immediately.
6. Healthy systems look calm.
7. Blockers and protocol errors are impossible to miss.
8. Technical detail is available on demand, not forced on the default view.

## Palette

```text
App background       #09090B
Primary surface      #0D0D10
Secondary surface    #121216
Elevated surface     #17171C
Hover surface        #1C1C22
Border subtle        #24242A
Border strong        #303038
Text primary         #F5F5F6
Text secondary       #A1A1AA
Text muted           #71717A
Forge accent         #FF7A18
Forge accent hover   #FF8A32
Success              #22C55E
Warning              #F59E0B
Danger               #EF4444
Info                  #60A5FA
```

## Typography

Primary: Inter  
Technical: JetBrains Mono

Use restrained font weights. Prefer whitespace and alignment over oversized headings.

## Main shell

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ForgeLoopAudit      project-name      protocol v1       ● Live   │
├──────────────┬───────────────────────────────────────────────────────┤
│ Audit Summary│                                                       │
│ Findings     │                                                       │
│ Tasks        │                    Main View                          │
│ Evidence     │                                                       │
│ Quality      │                                                       │
│ Policy & Trust│                                                     │
│ Audit History│                                                       │
│ Reports      │                                                       │
│ Diagnostics  │                                                       │
│ Settings     │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

## Current navigation and trust surfaces

The current release is ForgeLoopAudit `0.2.0-rc.3` with ForgeLoop `1.10.1` at
`b6802b8b5d0cb7e8edbf811350d9a94f4cb1942d` (protocol v1, schema v1, Integration
API v1). The auditor-first shell exposes these surfaces in order: Audit Summary,
Findings, Tasks, Evidence, Quality, Policy & Trust, Audit History, Reports,
Diagnostics and Settings. The former protocol-object surfaces remain available
as read-only drill-down views from the auditor and selected-task surfaces.
Verification Scope and Code Attestation are presented in Evidence, while
Workspace Binding, Responsibility Constraints and Canonical Handoffs are
presented through Policy & Trust, Task Boundaries and task-boundary detail.

Trust states must remain explicit and must never rely on color alone:

| State | Presentation guidance |
|---|---|
| `UNAVAILABLE` | Neutral warning with the missing capability or resource and no inferred value |
| `UNKNOWN` | Neutral unresolved value; distinguish missing knowledge from a negative result |
| `UNBOUND` | Neutral informational state; no workspace binding was recorded |
| `UNRESOLVED` | Warning state for a canonical verification-scope result that ForgeLoop could not resolve |
| `INVALID` | Strong danger state with the canonical error code/message and fail-closed semantics |
| `VERIFIED` | Positive trust label only when the canonical attestation result says so |
| `ATTESTED` | Strongest trust label only when the canonical completion-ledger-bound attestation says so |
| `ACCEPTED` | Operational receipt only; no claims, evidence, authority, delegation or completion state |

`PROCESSED`, `VERIFIED` and `ATTESTED` are attestation trust levels, not
verification-scope values. `canonicalHandoffs v2` acceptance is rendered as
**Accepted — operational receipt only**. Handoffs, acceptance receipts and
Continuity are context surfaces, not completion or review evidence. The
`advisoryContextProviders v1` row reports a host-provided capability as
**Not loaded by ForgeLoopAudit**; it never exposes memory or retrieved results.
Optional capability failure should degrade only the affected surface and leave
the core protocol mode visible.

## Signature view

The lifecycle graph is the product identity.

Completed nodes should be quiet. The current node should carry the strongest visual emphasis. Failure and blocked states should be strongly semantic without using constant animation.

```text
REQUEST
   │
DISCOVERY
   │
CONTRACT
   │
ROUTING
   │
DESIGN
   │
PLAN
   │
EXECUTE ─────────────────┐
   │                     │
VERIFY                   │
   │                     │
 failure                 │
   ▼                     │
DIAGNOSE                 │
   │                     │
CORRECT ─────────────────┘
   │
REVIEW
   │
COMPLETE
```

## Motion

Use subtle transition animation only when it communicates new state. Respect `prefers-reduced-motion`.

Recommended motion:

- node status transition;
- new event insertion;
- inspector reveal;
- selected task transition;
- live status pulse at low frequency.

Avoid glow, parallax, looping background effects and decorative particle systems.

## Density

This is a developer tool. Prefer compact information-rich rows over large marketing-style cards.

Use metric cards only for high-level summary values.

## Panels

Right-side inspectors should expose technical details without navigating away from context.

Recommended width: 360–440 px depending on window size.

## Status treatment

Never rely on color alone.

Examples:

```text
✓ VALID
○ INCOMPLETE
! STALE
! INCONSISTENT
× INVALID
```

## Empty states

Empty states must explain what ForgeLoop artifact or action will make content appear. Avoid generic illustrations.

## Accessibility

- WCAG AA contrast
- visible keyboard focus
- semantic labels
- reduced motion
- keyboard navigable graph alternative
- no status conveyed only through color

## Final design criterion

The interface should look production-ready even when no animation is running and no gradient is visible. Its quality must come from composition, spacing, typography, information hierarchy and precise state visualization.
