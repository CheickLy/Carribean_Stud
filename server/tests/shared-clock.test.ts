import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableGame } from '../src/models/tableGame.js';
import { Lobby } from '../src/models/lobby.js';
import { startTableClock } from '../src/modules/shared-game/service.js';
import { sequelize } from '../src/db/sequelize.js';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
describe('autonomous table clock resilience', () => {
  it('retries after database failures and isolates one failed table from the others', async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(sequelize, 'transaction').mockImplementation(async (callback: any) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
    const tables = vi.spyOn(TableGame, 'findAll').mockRejectedValueOnce(new Error('Database unavailable'));
    const stop = startTableClock();
    try {
      await vi.advanceTimersByTimeAsync(1000);
      expect(log).toHaveBeenCalledWith('Table clock unavailable', expect.any(Error));
      tables.mockResolvedValue([{ lobbyId: 1 }, { lobbyId: 2 }] as TableGame[]);
      const lobby = vi.spyOn(Lobby, 'findByPk').mockRejectedValueOnce(new Error('Table failure')).mockResolvedValue(null);
      await vi.advanceTimersByTimeAsync(1000);
      expect(log).toHaveBeenCalledWith('Table clock failed', expect.any(Error));
      expect(lobby).toHaveBeenCalledTimes(2);
      // A deleted table is expected and should not be logged as a server error.
      expect(log).toHaveBeenCalledTimes(2);
    } finally { stop(); }
  });
  it('does not overlap clock sweeps when a database request is slow', async () => {
    vi.useFakeTimers();
    let finish!: (value: TableGame[]) => void;
    const tables = vi.spyOn(TableGame, 'findAll').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const stop = startTableClock();
    try {
      await vi.advanceTimersByTimeAsync(3000);
      expect(tables).toHaveBeenCalledTimes(1);
      finish([]);
      await vi.advanceTimersByTimeAsync(1000);
      expect(tables).toHaveBeenCalledTimes(2);
      finish([]);
    } finally { stop(); }
  });
});
