# ForgeLoop Studio — UI Design Direction

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
│ ForgeLoop Studio      project-name      protocol v1       ● Live   │
├──────────────┬───────────────────────────────────────────────────────┤
│ Overview     │                                                       │
│ Tasks        │                                                       │
│ Flow         │                    Main View                          │
│ Contract     │                                                       │
│ Evidence     │                                                       │
│ Events       │                                                       │
│ Continuity   │                                                       │
│ Policy       │                                                       │
│              │                                                       │
│ Settings     │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

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
