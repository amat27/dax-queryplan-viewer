import { memo } from 'react';
import type { EdgeProps } from 'reactflow';
import { buildOrthoPath, type Point } from '../../layout/elk';

export interface TreeEdgeData {
  points: Point[];
  highlighted: boolean;
  dimmed: boolean;
}

function TreeEdgeImpl({ data }: EdgeProps<TreeEdgeData>) {
  if (!data?.points.length) return null;
  const path = buildOrthoPath(data.points);
  return (
    <g className="transition-opacity duration-200" style={{ opacity: data.dimmed ? 0.14 : 1 }}>
      {data.highlighted && (
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--ring))"
          strokeOpacity={0.18}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={data.highlighted ? 'hsl(var(--ring))' : 'hsl(var(--muted-foreground))'}
        strokeOpacity={data.highlighted ? 1 : 0.42}
        strokeWidth={data.highlighted ? 2.4 : 1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

export const TreeEdge = memo(TreeEdgeImpl);
