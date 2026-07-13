# DAX Query Plan Viewer

Interactive viewer for DAX Query Plan trace text. It renders logical and physical operator forests side by side without merging repeated operator names.

## Run

On Windows, double-click `Open DAX Query Plan Viewer.cmd`.

Developer workflow:

```powershell
pnpm install
pnpm dev
```

Production build:

```powershell
pnpm build
pnpm preview
```

Open `http://127.0.0.1:4173` after `pnpm preview`, or `http://127.0.0.1:5173` during development.

## Input

Use **Open file** for a DQPN JSON file whose top-level value is an array of plan strings:

```json
[
  "logical plan text...",
  "physical plan text..."
]
```

Use **Paste** for either that JSON envelope or one raw plan event. The built-in demo is a real GroupSemiJoin logical/physical plan.

**DAX Studio exports** are also supported directly: open the JSON that DAX Studio
saves (an object with `LogicalQueryPlanRows` / `PhysicalQueryPlanRows`, where each
row carries an `Operation` and an explicit `Level`). Both trees are rebuilt from
`Level`, logical before physical.

## Interaction

| Action | Trigger |
|---|---|
| Pan | Drag empty space or scroll |
| Zoom | Pinch, controls, or right-button drag |
| Select operator | Click the node outside a column chip |
| Highlight a column across plans | Click a column chip |
| Focus a subtree | Double-click a node or use Inspector |
| Search operators, columns, variables and metrics | `/` or Search |
| Switch logical / split / physical view | Top segmented control |
| Toggle layout direction | Arrow toolbar button |
| Export | Download button (first visible canvas as SVG) |
| Back / clear selection | `Esc` |

## Semantics

- Each source line is one operator instance. Repeated `Scan_Vertipaq` lines remain distinct nodes.
- Indentation defines an ordered forest; depth-zero lines are independent roots.
- Column IDs are interpreted only within their emitted operator/event context. Named columns drive cross-plan highlighting.
- `0-1` and similar ranges are relation-space column-slot ranges, not row ranges.
- `#KeyCols` is cache key-layout width, not lookup arity. `LookupCols` describes lookup probe fields.
- Logical/physical mappings are candidates only. Physical `LogOp=` records an operator name, not a stable logical-node ID. The Inspector displays confidence and reasons rather than asserting identity.
- Unknown fields stay in `rawLine`/`rawTail`; malformed or truncated input is surfaced in Diagnostics.

## Architecture

```text
src/
  parser/queryPlan.ts     JSON/raw input -> typed events and ordered forests
  mapping/candidates.ts   auditable logical/physical candidate scoring
  layout/elk.ts           ordered layered layout and orthogonal routing
  graph/                  React Flow canvas, nodes and edges
  state/store.ts          document and view state
  ui/                     toolbar, events, search, filters and Inspector
```

## Verify

```powershell
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

Unit tests cover the GroupSemiJoin plan, a multi-root RLS plan, duplicate operators, fields/metrics, raw input, malformed JSON, truncation, and mapping candidates. Playwright covers file/paste input, both canvases, search, Inspector semantics, column highlighting and narrow layout.
