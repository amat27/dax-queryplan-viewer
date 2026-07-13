export const BUILD_INFO = {
  version: __APP_VERSION__,
  commit: __GIT_SHA__,
  builtAt: __BUILD_TIME__,
};

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

/** Newest first. The top entry's version should match package.json. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.5.0',
    date: '2026-07-13',
    changes: [
      'Draggable dividers: resize the sidebar, the two plans, and the Inspector.',
      'The source query is now a collapsible top strip (toggle it and still see both trees), instead of a modal.',
      'Fix the view-mode segmented control\'s misaligned active highlight.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-07-13',
    changes: [
      'Collapsible left sidebar.',
      'Show a physical Constant operator\'s value on the node (e.g. "Constant: LookupPhyOp … Integer 1" → = 1).',
      'Show the source DAX query when the file carries it (DAX Studio CommandText) via a Query button.',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-07-13',
    changes: [
      "Fix the minimap's mismatched rounded corner (clip the mask to the rounded container).",
    ],
  },
  {
    version: '0.3.0',
    date: '2026-07-13',
    changes: [
      'Version badge with this changelog and the deployed build (commit + build time).',
      "Show a Constant operator's DominantValue on the node card; hide the BLANK / NONE defaults.",
      'Installable as a PWA (web app manifest + icons).',
      'New brand icon: a query-plan tree glyph on an indigo–teal badge.',
      'Read DAX Studio query plan exports (LogicalQueryPlanRows / PhysicalQueryPlanRows).',
      'Neutral physical-operator colours (teal / amber / indigo) instead of the red/green success–fail feel.',
      'Refined, compact node cards that auto-refit when the view or Inspector resizes.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-07-13',
    changes: [
      'Initial release: logical and physical DAX query plan viewer with the DQPN parser, side-by-side canvases, search, focus, Inspector with a field glossary, and heuristic logical↔physical mapping.',
    ],
  },
];
