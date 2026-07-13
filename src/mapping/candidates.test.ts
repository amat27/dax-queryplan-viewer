import { describe, expect, it } from 'vitest';
import { DEMO_INPUT } from '../data/demo';
import { parseQueryPlanInput } from '../parser/queryPlan';
import { buildMappingCandidates } from './candidates';

describe('logical/physical mapping candidates', () => {
  it('maps the unique roots with high confidence', () => {
    const document = parseQueryPlanInput(DEMO_INPUT);
    const candidates = buildMappingCandidates(document.events[0], document.events[1]);
    const root = candidates.find((candidate) => candidate.physicalNodeId === document.events[1].rootIds[0]);
    expect(root?.logicalNodeId).toBe(document.events[0].rootIds[0]);
    expect(root?.confidence).toBe('high');
    expect(root?.reasons).toContain('Both operators are event roots');
  });

  it('uses named columns to distinguish repeated Scan_Vertipaq candidates', () => {
    const document = parseQueryPlanInput(DEMO_INPUT);
    const [logical, physical] = document.events;
    const lookup = physical.nodes.find((node) => node.operator === 'Spool_MultiValuedHashLookup')!;
    const candidates = buildMappingCandidates(logical, physical).filter(
      (candidate) => candidate.physicalNodeId === lookup.id,
    );
    expect(candidates).toHaveLength(3);
    const best = candidates[0];
    const bestNode = logical.nodes.find((node) => node.id === best.logicalNodeId)!;
    expect(bestNode.columns.required?.names.map((column) => column.column)).toEqual(['ProductId', 'CityAndState']);
    expect(best.score).toBeGreaterThan(candidates[1].score);
  });

  it('does not invent mappings for physical wrappers without LogOp', () => {
    const document = parseQueryPlanInput(DEMO_INPUT);
    const projection = document.events[1].nodes.find((node) => node.operator.startsWith('ProjectionSpool'))!;
    const candidates = buildMappingCandidates(document.events[0], document.events[1]);
    expect(candidates.some((candidate) => candidate.physicalNodeId === projection.id)).toBe(false);
  });
});
