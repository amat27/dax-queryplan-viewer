import { describe, expect, it } from 'vitest';
import { DEMO_INPUT } from '../data/demo';
import { parseQueryPlanInput } from './queryPlan';

const RLS_INPUT = JSON.stringify([
  `__DS0Core: GroupBy_Vertipaq: RelLogOp VarName=__DS0Core DependOnCols()() 0-1 RequiredCols(0, 1)('DimCustomer'[FirstName], 'DimCustomer'[LastName])
\tScan_Vertipaq: RelLogOp DependOnCols()() 0-10 RequiredCols(2, 3)('DimCustomer'[FirstName], 'DimCustomer'[LastName])
__DS0PrimaryWindowed: TopN: RelLogOp VarName=__DS0PrimaryWindowed DependOnCols()() 0-1 RequiredCols(0, 1)('DimCustomer'[FirstName], 'DimCustomer'[LastName])
\tTableVarProxy_VertiPaq: RelLogOp DependOnCols()() 0-1 RequiredCols(0, 1)('DimCustomer'[FirstName], 'DimCustomer'[LastName]) RefVarName=__DS0Core
\tConstant: ScaLogOp DependOnCols()() Integer DominantValue=501
\tColPosition<'DimCustomer'[FirstName]>: ScaLogOp DependOnCols(0)('DimCustomer'[FirstName]) String DominantValue=NONE
\tColPosition<'DimCustomer'[LastName]>: ScaLogOp DependOnCols(1)('DimCustomer'[LastName]) String DominantValue=NONE
Order: RelLogOp DependOnCols()() 0-1 RequiredCols(0, 1)('DimCustomer'[FirstName], 'DimCustomer'[LastName])
\tTableVarProxy: RelLogOp DependOnCols()() 0-1 RequiredCols(0, 1)('DimCustomer'[FirstName], 'DimCustomer'[LastName]) RefVarName=__DS0PrimaryWindowed
\tColPosition<'DimCustomer'[FirstName]>: ScaLogOp DependOnCols(0)('DimCustomer'[FirstName]) String DominantValue=NONE
\tColPosition<'DimCustomer'[LastName]>: ScaLogOp DependOnCols(1)('DimCustomer'[LastName]) String DominantValue=NONE
`,
  `PartitionIntoGroups: IterPhyOp LogOp=Order IterCols(0, 1)('DimCustomer'[FirstName], 'DimCustomer'[LastName]) #Groups=1 #Rows=6
\tAggregationSpool<Order>: SpoolPhyOp #Records=1
\t\tProxy: IterPhyOp LogOp=TableVarProxy IterCols(0, 1)('DimCustomer'[FirstName], 'DimCustomer'[LastName])
\t\t\tSpool_Iterator<SpoolIterator>: IterPhyOp LogOp=TableVarProxy_VertiPaq IterCols(0, 1)('DimCustomer'[FirstName], 'DimCustomer'[LastName]) #Records=6 #KeyCols=11 #ValueCols=0
\t\t\t\tProjectionSpool<ProjectFusion<>>: SpoolPhyOp #Records=6
\t\t\t\t\tCache: IterPhyOp #FieldCols=2 #ValueCols=0
\t\tColPosition<'DimCustomer'[FirstName]>: LookupPhyOp LogOp=ColPosition<'DimCustomer'[FirstName]> LookupCols(0)('DimCustomer'[FirstName]) String
\t\tColPosition<'DimCustomer'[LastName]>: LookupPhyOp LogOp=ColPosition<'DimCustomer'[LastName]> LookupCols(1)('DimCustomer'[LastName]) String
`,
]);

describe('query plan parser', () => {
  it('parses the real GroupSemiJoin logical and physical trees', () => {
    const document = parseQueryPlanInput(DEMO_INPUT, 'demo.json');
    expect(document.diagnostics).toEqual([]);
    expect(document.events.map((event) => event.kind)).toEqual(['vp-logical', 'vp-physical']);
    expect(document.events[0].nodes).toHaveLength(7);
    expect(document.events[1].nodes).toHaveLength(11);
    expect(document.events[0].rootIds).toHaveLength(1);
    expect(document.events[1].rootIds).toHaveLength(1);
  });

  it('keeps repeated operators as distinct line-addressed nodes', () => {
    const logical = parseQueryPlanInput(DEMO_INPUT).events[0];
    const scans = logical.nodes.filter((node) => node.operator === 'Scan_Vertipaq');
    expect(scans).toHaveLength(3);
    expect(new Set(scans.map((node) => node.id)).size).toBe(3);
  });

  it('parses paired column ids/names, empty table aliases, ranges and metrics', () => {
    const document = parseQueryPlanInput(DEMO_INPUT);
    const logicalRoot = document.events[0].nodes[0];
    const lookup = document.events[1].nodes.find((node) => node.operator === 'Spool_MultiValuedHashLookup')!;
    expect(logicalRoot.columns.required?.ids).toEqual(['0', '1']);
    expect(logicalRoot.columns.required?.names[1]).toMatchObject({ table: '', column: 'X' });
    expect(document.events[0].nodes.at(-1)?.relationRange).toEqual({ first: '1', last: '83' });
    expect(lookup.columns.lookup?.names[0]).toMatchObject({ table: 'Customer', column: 'CityAndState' });
    expect(lookup.metrics.find((metric) => metric.name === 'KeyCols')?.value).toBe('83');
  });

  it('parses a logical forest and resolves variable references without changing parentage', () => {
    const document = parseQueryPlanInput(RLS_INPUT, 'rls.json');
    const logical = document.events[0];
    expect(logical.nodes).toHaveLength(11);
    expect(logical.rootIds).toHaveLength(3);
    expect(logical.nodes[0]).toMatchObject({ queryObject: '__DS0Core', operator: 'GroupBy_Vertipaq' });
    expect(logical.references).toHaveLength(2);
    expect(logical.references[0].targetRootId).toBe(logical.rootIds[0]);
  });

  it('accepts empty arrays, raw plans and reports malformed JSON', () => {
    expect(parseQueryPlanInput('[]').events).toEqual([]);
    expect(parseQueryPlanInput('GroupBy: RelLogOp DependOnCols()() 0-0 RequiredCols()()').events[0].kind).toBe('vp-logical');
    expect(parseQueryPlanInput('[broken').diagnostics[0].code).toBe('invalid-json');
  });

  it('records truncation sentinels rather than making fake nodes', () => {
    const document = parseQueryPlanInput('Root: RelLogOp DependOnCols()() 0-0 RequiredCols()()\n\tMore operators skipped...');
    expect(document.events[0].nodes).toHaveLength(1);
    expect(document.events[0].truncated).toBe(true);
    expect(document.events[0].diagnostics[0].code).toBe('truncated-plan');
  });
});
