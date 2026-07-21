import { test, expect } from 'vitest';
import { SupabaseStore } from './SupabaseStore';

function fakeClient(rows: any[]) {
  return {
    from() {
      return {
        insert(vals: any[]) {
          const inserted = { id: 'x', created_at: 'now', ...vals[0] };
          rows.push(inserted);
          return {
            select() {
              return { single: async () => ({ data: inserted, error: null }) };
            },
          };
        },
        select() {
          const chain = {
            _sig: '',
            eq(_col: string, val: string) {
              if (!chain._sig) chain._sig = val;
              return chain;
            },
            order() { return chain; },
            limit: async () => ({ data: rows.filter((r) => r.signature === chain._sig), error: null }),
          };
          return chain;
        },
      };
    },
    channel() {
      return { on() { return this; }, subscribe() { return this; } };
    },
    removeChannel() {},
  } as any;
}

test('submitScore inserts and returns the row', async () => {
  const rows: any[] = [];
  const store = new SupabaseStore(fakeClient(rows));
  const row = await store.submitScore({
    signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 1, mode: 'timed',
  });
  expect(row.display_name).toBe('A');
  expect(rows).toHaveLength(1);
});

test('getLeaderboard filters by signature', async () => {
  const rows = [
    { id: '1', signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 1, mode: 'timed', created_at: 'now' },
    { id: '2', signature: 'other', display_name: 'B', score: 99, accuracy: 1, total_ms: 1, mode: 'timed', created_at: 'now' },
  ];
  const store = new SupabaseStore(fakeClient(rows));
  const board = await store.getLeaderboard('sig', 'timed');
  expect(board).toHaveLength(1);
  expect(board[0].display_name).toBe('A');
});
