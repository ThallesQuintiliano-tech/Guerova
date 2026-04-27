import { describe, it, expect } from 'vitest';
import { sumFechadoDealValues } from './mockData';

describe('sumFechadoDealValues', () => {
  it('soma valueNum apenas na coluna Fechado', () => {
    const kanban = {
      Novo: [{ id: 'a' }],
      Fechado: [{ id: 'x', valueNum: 100 }, { id: 'y', valueNum: 50.5 }],
    };
    expect(sumFechadoDealValues(kanban)).toBe(150.5);
  });

  it('retorna 0 quando não há Fechado', () => {
    expect(sumFechadoDealValues({})).toBe(0);
  });
});
