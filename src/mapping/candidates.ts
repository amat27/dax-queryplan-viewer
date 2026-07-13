import { nodeColumnKeys } from '../parser/queryPlan';
import type { MappingCandidate, PlanEvent, PlanNode } from '../types';

export function buildMappingCandidates(logical: PlanEvent, physical: PlanEvent): MappingCandidate[] {
  const candidates: MappingCandidate[] = [];
  const physicalNodes = physical.nodes.filter((node) => node.logicalOperator);

  for (const physicalNode of physicalNodes) {
    const nameMatches = logical.nodes.filter(
      (logicalNode) => normalize(logicalNode.operator) === normalize(physicalNode.logicalOperator!),
    );
    for (const logicalNode of nameMatches) {
      candidates.push(scoreCandidate(logicalNode, physicalNode, nameMatches.length));
    }
  }
  return candidates.sort((a, b) => b.score - a.score || a.logicalNodeId.localeCompare(b.logicalNodeId));
}

function scoreCandidate(logical: PlanNode, physical: PlanNode, nameMatchCount: number): MappingCandidate {
  let score = 60;
  const reasons = [`LogOp=${physical.logicalOperator} matches logical operator ${logical.operator}`];
  const contradictions: string[] = [];
  const logicalColumns = nodeColumnKeys(logical);
  const physicalColumns = nodeColumnKeys(physical);
  const overlap = [...physicalColumns].filter((key) => logicalColumns.has(key));

  if (overlap.length > 0) {
    score += Math.min(30, overlap.length * 15);
    reasons.push(`${overlap.length} named column${overlap.length === 1 ? '' : 's'} overlap`);
  } else if (physicalColumns.size > 0 && logicalColumns.size > 0) {
    score -= 15;
    contradictions.push('No named columns overlap');
  }
  if (nameMatchCount === 1) {
    score += 10;
    reasons.push('Only one logical operator has this name');
  } else {
    reasons.push(`${nameMatchCount} logical operators share this name`);
  }
  if (logical.depth === 0 && physical.depth === 0) {
    score += 10;
    reasons.push('Both operators are event roots');
  }

  return {
    logicalNodeId: logical.id,
    physicalNodeId: physical.id,
    confidence: score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low',
    score,
    reasons,
    contradictions,
  };
}

function normalize(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLocaleLowerCase();
}
