export const DEMO_LOGICAL = `GroupSemiJoin: RelLogOp DependOnCols()() 0-1 RequiredCols(0, 1)('Sales'[ProductId], ''[X])
\tScan_Vertipaq: RelLogOp DependOnCols()() 0-0 RequiredCols(0)('Sales'[ProductId])
\tCalculate: ScaLogOp DependOnCols(0)('Sales'[ProductId]) Integer DominantValue=BLANK
\t\tCalculate: ScaLogOp DependOnCols(0)('Sales'[ProductId]) Integer DominantValue=BLANK
\t\t\tCount_Vertipaq: ScaLogOp DependOnCols(0)('Sales'[ProductId]) Integer DominantValue=BLANK
\t\t\t\tScan_Vertipaq: RelLogOp DependOnCols(0)('Sales'[ProductId]) 84-113 RequiredCols(0)('Sales'[ProductId])
\t\tScan_Vertipaq: RelLogOp DependOnCols(0)('Sales'[ProductId]) 1-83 RequiredCols(0, 11)('Sales'[ProductId], 'Customer'[CityAndState])
`;

export const DEMO_PHYSICAL = `GroupSemijoin: IterPhyOp LogOp=GroupSemiJoin IterCols(0, 1)('Sales'[ProductId], ''[X])
\tSpool_Iterator<SpoolIterator>: IterPhyOp LogOp=Count_Vertipaq IterCols(0)('Sales'[ProductId]) #Records=1559 #KeyCols=1 #ValueCols=1
\t\tAggregationSpool<AggFusion<Sum>>: SpoolPhyOp #Records=1559
\t\t\tCrossApply: IterPhyOp LogOp=Count_Vertipaq IterCols(0)('Sales'[ProductId])
\t\t\t\tSpool_MultiValuedHashLookup: IterPhyOp LogOp=Scan_Vertipaq LookupCols(11)('Customer'[CityAndState]) IterCols(0)('Sales'[ProductId]) #Records=49483 #KeyCols=83 #ValueCols=0
\t\t\t\t\tProjectionSpool<ProjectFusion<>>: SpoolPhyOp #Records=49483
\t\t\t\t\t\tCache: IterPhyOp #FieldCols=2 #ValueCols=0
\t\t\t\tCache: IterPhyOp #FieldCols=1 #ValueCols=1
\t\t\t\t\tSpool_Iterator<SpoolIterator>: IterPhyOp LogOp=Scan_Vertipaq IterCols(0, 11)('Sales'[ProductId], 'Customer'[CityAndState]) #Records=49483 #KeyCols=83 #ValueCols=0
\t\t\t\t\t\tProjectionSpool<ProjectFusion<>>: SpoolPhyOp #Records=49483
\t\t\t\t\t\t\tCache: IterPhyOp #FieldCols=2 #ValueCols=0
`;

export const DEMO_INPUT = JSON.stringify([DEMO_LOGICAL, DEMO_PHYSICAL], null, 2);
export const DEMO_NAME = 'groupsemijoin_actual_queryplan.json';
