import { describe, expect, it } from 'vitest';
import type { Board } from '../shared/board';
import type { Item, Strokes } from '../shared/schemas';
import { applyEvent } from './board-state';
import {
  afterRevert,
  emptyHistory,
  HISTORY_LIMIT,
  inWriteOrder,
  nextStep,
  pushStep,
  recordStep,
  revert,
  type BoardEdit,
  type Direction,
  type History,
} from './history';

const note = (id: string, fields: Partial<Item> = {}): Item =>
  ({ type: 'note', x: 0, y: 0, w: 100, h: 80, id, body: '', ...fields }) as Item;
const frame = (id: string): Item => ({ type: 'frame', x: 0, y: 0, w: 400, h: 300, id, body: '' });
const connector = (id: string, from: string, to: string): Item => ({
  type: 'connector',
  from,
  to,
  id,
  body: '',
});
const link = (id: string, preview?: { title: string }): Item => ({
  type: 'link',
  x: 0,
  y: 0,
  w: 300,
  h: 200,
  url: 'https://example.com/',
  preview,
  id,
  body: '',
});
const drawing = (...ids: string[]): Strokes => ({
  strokes: ids.map((id) => ({ id, color: 'gray', size: 'm', points: [[0, 0, 0.5]] })),
});

const board = (items: Item[] = [], strokes: Strokes = drawing()): Board => ({
  items,
  strokes,
  problems: [],
  outputs: {},
});

/** The board after an edit's writes, as the editor applies them. */
function written(start: Board, change: BoardEdit): Board {
  const { saved = [], deleted = [], strokes } = inWriteOrder(start, change);
  let next = deleted.reduce((b, id) => applyEvent(b, { type: 'item-removed', id }), start);
  next = saved.reduce((b, item) => applyEvent(b, { type: 'item', item }), next);
  return strokes === undefined ? next : applyEvent(next, { type: 'strokes', strokes });
}

/** Records an edit, then undoes and redoes it, returning each board on the way. */
function roundTrip(start: Board, change: BoardEdit) {
  const step = recordStep(start, change);
  const edited = written(start, change);
  const undone = revert(edited, step, 'undo');
  const afterUndo = written(edited, undone.change);
  const redone = revert(afterUndo, undone.applied, 'redo');
  return { step, edited, afterUndo, afterRedo: written(afterUndo, redone.change), undone, redone };
}

const sorted = (b: Board) => b.items.toSorted((x, y) => x.id.localeCompare(y.id));

describe('undo and redo', () => {
  const start = board([note('aaaa0001'), note('aaaa0002', { color: 'red' })], drawing('s1'));

  it.each<[string, BoardEdit]>([
    ['create', { saved: [note('aaaa0003')] }],
    ['move', { saved: [note('aaaa0001', { x: 40, y: 20 }), note('aaaa0002', { x: 5 })] }],
    ['resize', { saved: [note('aaaa0001', { w: 300, h: 200 })] }],
    ['text edit', { saved: [note('aaaa0001', { body: 'Hello\n' })] }],
    ['style change', { saved: [note('aaaa0001', { color: 'blue' })] }],
    ['connect', { saved: [connector('aaaa0009', 'aaaa0001', 'aaaa0002')] }],
    ['delete', { deleted: ['aaaa0001'], strokes: drawing() }],
    ['draw', { strokes: drawing('s1', 's2') }],
  ])('%s undoes and redoes in one step', (_name, change) => {
    const { edited, afterUndo, afterRedo, undone, redone } = roundTrip(start, change);
    expect(sorted(afterUndo)).toEqual(sorted(start));
    expect(afterUndo.strokes).toEqual(start.strokes);
    expect(sorted(afterRedo)).toEqual(sorted(edited));
    expect(afterRedo.strokes).toEqual(edited.strokes);
    expect(undone.skipped).toEqual([]);
    expect(redone.skipped).toEqual([]);
  });

  it('brings back a deleted frame, its children and their connectors, frame first', () => {
    const child = note('aaaa0002', { frame: 'aaaa0001' });
    const items = [
      frame('aaaa0001'),
      child,
      note('aaaa0003'),
      connector('aaaa0004', 'aaaa0002', 'aaaa0003'),
    ];
    const full = board(items);
    const { afterUndo, undone } = roundTrip(full, {
      deleted: ['aaaa0001', 'aaaa0002', 'aaaa0004'],
    });
    expect(sorted(afterUndo)).toEqual(sorted(full));
    expect(inWriteOrder(board(), undone.change).saved?.map((item) => item.type)).toEqual([
      'frame',
      'note',
      'connector',
    ]);
  });

  it('deletes connectors before the items and frames they name', () => {
    const items = [
      frame('aaaa0001'),
      note('aaaa0002'),
      connector('aaaa0003', 'aaaa0001', 'aaaa0002'),
    ];
    const order = inWriteOrder(board(items), { deleted: ['aaaa0001', 'aaaa0002', 'aaaa0003'] });
    expect(order.deleted).toEqual(['aaaa0003', 'aaaa0002', 'aaaa0001']);
  });

  it('leaves alone an item that changed since the step and undoes the rest', () => {
    const change = { saved: [note('aaaa0001', { x: 50 }), note('aaaa0002', { x: 50 })] };
    const step = recordStep(start, change);
    const agentEdit = note('aaaa0002', { x: 50, body: 'agent\n' });
    const edited = applyEvent(written(start, change), { type: 'item', item: agentEdit });
    const undone = revert(edited, step, 'undo');
    expect(undone.skipped).toEqual(['.post-lab/items/aaaa0002.md']);
    expect(sorted(written(edited, undone.change))).toEqual([note('aaaa0001'), agentEdit]);
    expect(undone.applied.items.map((entry) => entry.id)).toEqual(['aaaa0001']);
  });

  it('leaves alone an item deleted since the step', () => {
    const change = { saved: [note('aaaa0001', { x: 50 })] };
    const step = recordStep(start, change);
    const edited = applyEvent(written(start, change), { type: 'item-removed', id: 'aaaa0001' });
    const undone = revert(edited, step, 'undo');
    expect(undone.skipped).toEqual(['.post-lab/items/aaaa0001.md']);
    expect(undone.change.saved).toEqual([]);
  });

  it('leaves the drawing alone if strokes.json changed since the step', () => {
    const change = { deleted: ['aaaa0001'], strokes: drawing() };
    const step = recordStep(start, change);
    const edited = applyEvent(written(start, change), { type: 'strokes', strokes: drawing('s9') });
    const undone = revert(edited, step, 'undo');
    expect(undone.skipped).toEqual(['.post-lab/strokes.json']);
    expect(undone.change.strokes).toBeUndefined();
    expect(undone.change.saved).toEqual([note('aaaa0001')]);
  });

  it('undoes creating a link after the server wrote its preview', () => {
    const change = { saved: [link('aaaa0005')] };
    const step = recordStep(start, change);
    const previewed = applyEvent(written(start, change), {
      type: 'item',
      item: link('aaaa0005', { title: 'Example' }),
    });
    const undone = revert(previewed, step, 'undo');
    expect(undone.skipped).toEqual([]);
    expect(undone.change.deleted).toEqual(['aaaa0005']);
  });

  it('keeps the first state before and the last after for an item touched twice', () => {
    const step = recordStep(start, {
      deleted: ['aaaa0001'],
      saved: [note('aaaa0001', { x: 9 })],
    });
    expect(step.items).toEqual([
      { id: 'aaaa0001', before: note('aaaa0001'), after: note('aaaa0001', { x: 9 }) },
    ]);
  });

  it('records nothing for an edit that changes nothing', () => {
    const step = recordStep(start, { saved: [note('aaaa0001')], strokes: drawing('s1') });
    expect(pushStep(emptyHistory, step)).toBe(emptyHistory);
  });
});

describe('history', () => {
  const step = (id: string) => recordStep(board(), { saved: [note(id)] });
  const travel = (history: History, direction: Direction) => {
    const next = nextStep(history, direction);
    if (next === undefined) throw new Error('no step');
    return afterRevert(history, direction, next);
  };

  it('moves steps between undo and redo, and a new edit clears redo', () => {
    let history = pushStep(pushStep(emptyHistory, step('aaaa0001')), step('aaaa0002'));
    history = travel(history, 'undo');
    expect(history.undo).toEqual([step('aaaa0001')]);
    expect(history.redo).toEqual([step('aaaa0002')]);
    history = travel(history, 'redo');
    expect(history).toEqual({ undo: [step('aaaa0001'), step('aaaa0002')], redo: [] });
    history = pushStep(travel(history, 'undo'), step('aaaa0003'));
    expect(history.redo).toEqual([]);
  });

  it('drops a step whose every file changed instead of moving it', () => {
    const history = pushStep(emptyHistory, step('aaaa0001'));
    expect(afterRevert(history, 'undo', { items: [] })).toEqual(emptyHistory);
  });

  it('keeps the last 100 steps', () => {
    let history = emptyHistory;
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      history = pushStep(history, step(`a${String(index).padStart(7, '0')}`));
    }
    expect(history.undo).toHaveLength(HISTORY_LIMIT);
    expect(history.undo[0]).toEqual(step('a0000005'));
  });
});
