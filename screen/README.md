# ForgeLoop Studio screenshot documentation

These images are documentation captures of the real ForgeShop demo fixture,
the production renderer build and the default dark theme. They are not
illustrations or edited mockups. The capture metadata and page/task mapping are
in [`manifest.json`](manifest.json).

## Source and freshness

The source project is [`../demo/`](../demo/) and the capture uses
`FORGELOOP_STUDIO_FIXTURE_PROJECT=demo` with a 1440 × 900 renderer viewport,
100% zoom, an expanded sidebar and reduced motion. The capture contains the
Electron content area only; it excludes operating-system chrome, local paths,
credentials and transient loading state.

Regenerate the complete set after a user-visible layout, demo-state,
terminology, theme or navigation change:

```bash
npm run screenshots:readme
npm run screenshots:check
```

Do not edit PNG files manually. The capture script asserts the expected page,
task and scenario text before writing each image. The checker validates the
manifest, exact dimensions, README references, source metadata and absence of
orphaned screenshot files.

## Capture mapping

| File | Surface | Selected task | Scenario |
|---|---|---|---|
| `overview.png` | Overview | `TASK-003` | Project identity, canonical freshness, monitored state and selected-task boundaries |
| `tasks.png` | Tasks | — | Six mixed lifecycle states |
| `lifecycle-flow.png` | Flow | `TASK-004` | Blocked lifecycle and recovery |
| `contract-inspector.png` | Contract | `TASK-006` | Security-review contract |
| `evidence-matrix.png` | Evidence | `TASK-002` | `AUTO` → `CHANGED` verification scope |
| `event-ledger.png` | Events | `TASK-004` | Live-updating recovery event ledger |
| `continuity.png` | Continuity | `TASK-004` | Continuity and canonical handoff |
| `diagnostics.png` | Diagnostics | `TASK-004` | Canonical diagnostic signals |
| `actions.png` | Actions | `TASK-002` | Durable actions and approvals |
| `policy.png` | Policy | `TASK-006` | Capability and task policy |
| `settings.png` | Settings | — | Project context, Studio preferences and ForgeLoop capability metadata |
| `task-boundaries.png` | Overview | `TASK-003` | Workspace mismatch and invalid responsibility |

## Review checklist

- all images show the ForgeShop demo and current navigation;
- no loading spinner, personal path, credential or OS chrome is visible;
- status labels and warnings remain canonical and readable;
- optional capabilities remain clearly optional;
- Handoff, Continuity, Verification Scope and Attestation are not conflated;
- alt text in the root README describes the visible scenario; and
- `npm run screenshots:check` passes after review.
