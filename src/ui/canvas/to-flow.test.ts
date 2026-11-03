import { describe, expect, it } from 'vitest';
import type { Item } from '../../shared/schemas';
import { toFlow } from './to-flow';

const base = { x: 10, y: 20, w: 100, h: 50, body: '' };
const items: Item[] = [
  { ...base, id: 'note0002', type: 'note' },
  { ...base, id: 'note0001', type: 'note', z: 3 },
  { ...base, id: 'note0003', type: 'note', frame: 'frame001' },
  { ...base, id: 'frame001', type: 'frame', z: 5 },
  { id: 'conn0001', type: 'connector', from: 'note0001', to: 'note0002', body: ' leads to\n' },
  { id: 'conn0002', type: 'connector', from: 'note0002', to: 'note0003', body: '' },
];

describe('toFlow', () => {
  const { nodes, edges } = toFlow(items);

  it('puts frames first, then orders by z and ID', () => {
    expect(nodes.map((node) => node.id)).toEqual(['frame001', 'note0002', 'note0003', 'note0001']);
  });

  it('maps position, size, draw order and frame', () => {
    expect(nodes[2]).toMatchObject({
      id: 'note0003',
      type: 'note',
      position: { x: 10, y: 20 },
      width: 100,
      height: 50,
      zIndex: 0,
      parentId: 'frame001',
    });
    expect(nodes[0]).toMatchObject({ zIndex: 5, parentId: undefined });
  });

  it('turns connectors into edges between the items’ centre handles', () => {
    expect(edges).toEqual([
      {
        id: 'conn0001',
        source: 'note0001',
        target: 'note0002',
        sourceHandle: 'centre-source',
        targetHandle: 'centre-target',
        type: 'connector',
        data: { connector: items[4] },
      },
      {
        id: 'conn0002',
        source: 'note0002',
        target: 'note0003',
        sourceHandle: 'centre-source',
        targetHandle: 'centre-target',
        type: 'connector',
        data: { connector: items[5] },
      },
    ]);
  });
});
