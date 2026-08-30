import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildForgeShopProject } from './project-builder.mjs';

const DEMO_SOURCES = {
  'package.json': `${JSON.stringify(
    {
      name: 'forgeshop-demo',
      version: '0.1.0',
      private: true,
      description: 'ForgeShop — the ForgeLoop Studio demo project (a small premium e-commerce application built through ForgeLoop).',
    },
    null,
    2,
  )}\n`,
  'src/app.ts': `export interface AppConfiguration {
  environment: 'demo';
  features: string[];
}

export const configuration: AppConfiguration = {
  environment: 'demo',
  features: ['catalog', 'cart', 'checkout'],
};

export function startApp(config: AppConfiguration): string[] {
  return config.features.map((feature) => \`forgeshop:\${feature}\`);
}
`,
  'src/catalog.ts': `export interface Product {
  id: string;
  name: string;
  category: 'audio' | 'desk' | 'travel';
  price: number;
}

export interface CatalogFilter {
  category?: Product['category'];
  maxPrice?: number;
}

export function filterProducts(products: Product[], filter: CatalogFilter): Product[] {
  return products.filter((product) => {
    if (filter.category && product.category !== filter.category) return false;
    if (filter.maxPrice !== undefined && product.price > filter.maxPrice) return false;
    return true;
  });
}
`,
  'src/cart.ts': `import type { Product } from './catalog';

export interface CartLine {
  productId: string;
  quantity: number;
}

export class CartStore {
  private lines: CartLine[] = [];

  add(product: Product, quantity = 1): void {
    const existing = this.lines.find((line) => line.productId === product.id);
    if (existing) existing.quantity += quantity;
    else this.lines.push({ productId: product.id, quantity });
  }

  lines(): CartLine[] {
    return [...this.lines];
  }

  serialize(): string {
    return JSON.stringify({ version: 1, lines: this.lines });
  }

  hydrate(payload: string | null): void {
    if (!payload) return;
    try {
      const parsed = JSON.parse(payload) as { version?: number; lines?: CartLine[] };
      if (parsed.version !== 1 || !Array.isArray(parsed.lines)) throw new Error('unsupported payload');
      this.lines = parsed.lines.filter((line) => typeof line?.productId === 'string' && Number.isInteger(line?.quantity));
    } catch {
      // Corrupted carts are discarded; see TASK-002 in the demo ledger.
    }
  }
}
`,
  'src/checkout.ts': `export type CheckoutError =
  | { kind: 'validation'; field: string }
  | { kind: 'transient'; retryable: true }
  | { kind: 'declined'; reason: string };

export interface CheckoutRequest {
  cartTotalCents: number;
  currency: 'BRL' | 'USD';
}

export function validateRequest(request: CheckoutRequest): CheckoutError | null {
  if (!Number.isInteger(request.cartTotalCents) || request.cartTotalCents <= 0) {
    return { kind: 'validation', field: 'cartTotalCents' };
  }
  return null;
}

export async function submitOrder(request: CheckoutRequest, gateway: (r: CheckoutRequest) => Promise<CheckoutError | null>): Promise<CheckoutError | null> {
  const invalid = validateRequest(request);
  if (invalid) return invalid;
  return gateway(request);
}
`,
  'tests/catalog.test.ts': `import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterProducts, type Product } from '../src/catalog';

const products: Product[] = [
  { id: 'p1', name: 'Field Headphones', category: 'audio', price: 289 },
  { id: 'p2', name: 'Travel Kit', category: 'travel', price: 95 },
  { id: 'p3', name: 'Desk Shelf', category: 'desk', price: 149 },
];

test('filters by category', () => {
  assert.equal(filterProducts(products, { category: 'audio' }).length, 1);
});

test('filters by maximum price', () => {
  assert.equal(filterProducts(products, { maxPrice: 150 }).length, 2);
});

test('combines filters', () => {
  assert.deepEqual(filterProducts(products, { category: 'desk', maxPrice: 100 }), []);
});
`,
  'tests/cart.test.ts': `import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CartStore } from '../src/cart';
import type { Product } from '../src/catalog';

const product: Product = { id: 'p1', name: 'Field Headphones', category: 'audio', price: 289 };

test('adds and merges lines', () => {
  const store = new CartStore();
  store.add(product);
  store.add(product, 2);
  assert.equal(store.lines().length, 1);
  assert.equal(store.lines()[0]?.quantity, 3);
});

test('survives a serialize/hydrate round trip', () => {
  const store = new CartStore();
  store.add(product, 2);
  const restored = new CartStore();
  restored.hydrate(store.serialize());
  assert.deepEqual(restored.lines(), [{ productId: 'p1', quantity: 2 }]);
});

test('discards corrupted payloads instead of throwing', () => {
  const store = new CartStore();
  store.hydrate('{"version":9,"lines":"nope"}');
  assert.equal(store.lines().length, 0);
});
`,
  'tests/checkout.test.ts': `import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submitOrder, type CheckoutError } from '../src/checkout';

test('rejects non-positive totals without calling the gateway', async () => {
  let called = false;
  const error = await submitOrder({ cartTotalCents: 0, currency: 'USD' }, async () => {
    called = true;
    return null;
  });
  assert.equal(called, false);
  assert.equal(error?.kind, 'validation');
});

test('maps transient gateway failures as retryable', async () => {
  const error: CheckoutError | null = await submitOrder({ cartTotalCents: 4200, currency: 'USD' }, async () => ({
    kind: 'transient',
    retryable: true,
  }));
  assert.deepEqual(error, { kind: 'transient', retryable: true });
});
`,
};

function writeAll(root, files) {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const [relativePath, content] of files) {
    const target = join(root, relativePath);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, content);
  }
}

export function generateDemoFiles() {
  const { files, eventCount } = buildForgeShopProject();
  for (const [relativePath, content] of Object.entries(DEMO_SOURCES)) {
    files.set(relativePath, content);
  }
  files.set(
    'README.md',
    `# ForgeShop — ForgeLoop Studio demo project

ForgeShop is a fictional premium e-commerce web application being built through
ForgeLoop. Everything under \`.forgeloop/\` is a real, schema-valid ForgeLoop
project fixture — Studio reads it with exactly the same pipeline it uses for any
other project (ProjectDetector → PathBoundary → SchemaValidator → ProjectSnapshot).
No external service, network access or build step is required.

## Open it

1. Launch ForgeLoop Studio.
2. Choose **Open Demo Project** on the start screen (or **Open Project** and select this \`demo/\` directory).
3. Explore Overview, Tasks, Flow, Contract, Evidence, Events, Continuity and Policy. The active task's Overview includes the read-only Task Boundaries surface.

## Task map

| Task | Title | Phase | Demonstrates |
|---|---|---|---|
| TASK-001 | Implement premium product catalog | COMPLETE | Full lifecycle plus unsigned code-attestation artifacts; policy does not claim a signature |
| TASK-002 | Add shopping cart persistence | VERIFYING | Verification cycle with a rejected completion attempt and AUTO → CHANGED scope |
| TASK-003 | Implement checkout API integration | EXECUTING | Portable workspace-binding warning plus Responsibility Contract |
| TASK-004 | Accessibility and keyboard navigation audit | BLOCKED | Failed gate, recovery route, mutable continuity and canonical handoff |
| TASK-005 | Improve image loading performance | PLANNED | Planned work with a recorded baseline |
| TASK-006 | Security review of checkout flow | COMPLETE | Security policy gates and attestation policy metadata |

TASK-004 is the continuity showcase: \`harness-a\` failed the keyboard-navigation
gate, recorded findings, selected a recovery route and handed off to
\`harness-b\`, which resumed from \`continuity.json\`.

The optional boundary capabilities are intentionally distributed across the
tasks. TASK-003 contains a deterministic portable workspace binding, so a real
checkout normally shows ForgeLoop's canonical MISMATCH or UNAVAILABLE result;
the demo never pretends to know the host worktree. TASK-002 shows a persisted
verification scope, TASK-003 shows responsibility constraints, and TASK-004
shows that immutable handoffs are distinct from mutable Continuity. TASK-001's
attestation files are unsigned and the project policy is \`off\`; the fixture
does not claim ATTESTED trust.

## Intentional scenario states

ForgeShop is a scenario-rich demo, not a fixture where every task is expected
to be complete. Studio labels these known states as demo scenarios so users can
distinguish protocol examples from application failures.

The scenario label never suppresses real validation or integrity errors.
Schema errors, invalid artifacts, broken event hashes, policy-lock mismatches,
unexpected phase drift, IPC errors, and Studio failures must still be treated as
real defects.

## Regenerating

This directory is generated by \`scripts/generate-demo-project.mjs\`:

\`\`\`bash
npm run demo:generate   # regenerate deterministically
npm run demo:verify     # schema + integrity + drift verification
\`\`\`

Never edit \`.forgeloop/\` artifacts by hand — change the generator instead so the
demo stays an executable compatibility fixture.
`,
  );
  return { files, eventCount };
}

export function writeDemoProject(root) {
  const { files, eventCount } = generateDemoFiles();
  writeAll(root, files);
  return { fileCount: files.size, eventCount };
}
