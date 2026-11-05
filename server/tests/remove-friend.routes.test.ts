import { beforeEach, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Op } from 'sequelize';
import { Friendship } from '../src/models/friendship.js';
import { friendsRouter } from '../src/modules/friends/friends.routes.js';
function appAs(userId?: number) {
  const app = express();
  app.use((req, _res, next) => { req.session = { userId } as typeof req.session; next(); });
  app.use('/api/friends', friendsRouter); return app;
}
beforeEach(() => vi.restoreAllMocks());
it('requires authentication and validates friendship IDs', async () => {
  const destroy = vi.spyOn(Friendship, 'destroy').mockResolvedValue(1);
  expect((await request(appAs()).delete('/api/friends/7')).status).toBe(401);
  for (const id of ['0', '-1', '1.5', 'bad', '9007199254740992']) expect((await request(appAs(1)).delete(`/api/friends/${id}`)).status).toBe(400);
  expect(destroy).not.toHaveBeenCalled();
});
it('uses the session identity and succeeds when already removed', async () => {
  const destroy = vi.spyOn(Friendship, 'destroy').mockResolvedValueOnce(1).mockResolvedValue(0);
  const app = appAs(2);
  for(let i=0;i<2;i++) expect((await request(app).delete('/api/friends/7')).status).toBe(200);
  expect(destroy).toHaveBeenCalledWith({ where: { friendshipId: 7, status: 'accepted', [Op.or]: [{ userId: 2 }, { friendId: 2 }] } });
});
