import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Op } from 'sequelize';

vi.mock('../src/models/user.js', () => ({
  User: {
    findOne: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock('../src/models/friendship.js', () => ({
  Friendship: {
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    destroy: vi.fn(),
  },
}));

import { User } from '../src/models/user.js';
import { Friendship } from '../src/models/friendship.js';

import {
  sendFriendRequest,
  respondToFriendRequest,
  removeFriendship,
  getFriends,
  getPendingRequests,
} from '../src/modules/friends/friends.service.js';

describe('Friends CRUD', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should prevent users from sending friend requests to themselves', async () => {
    vi.mocked(User.findOne).mockResolvedValue({
      userId: 1,
      username: 'miles',
    } as User);

    await expect(
      sendFriendRequest(1, 'miles')
    ).rejects.toThrow('You cannot add yourself as a friend.');

    expect(Friendship.create).not.toHaveBeenCalled();
  });

  it('should successfully send a friend request', async () => {
    vi.mocked(User.findOne).mockResolvedValue({
      userId: 2,
      username: 'cheick',
    } as User);

    vi.mocked(Friendship.findOne).mockResolvedValue(null);

    vi.mocked(Friendship.create).mockResolvedValue({
      friendshipId: 1,
      userId: 1,
      friendId: 2,
      status: 'pending',
    } as Friendship);

    const result = await sendFriendRequest(1, 'cheick');

    expect(Friendship.create).toHaveBeenCalledWith({
      userId: 1,
      friendId: 2,
      status: 'pending',
    });

    expect(result).toEqual({
      friendshipId: 1,
      recipientId: 2,
      recipientUsername: 'cheick',
      status: 'pending',
    });
  });

  it('should prevent duplicate friend requests', async () => {
    vi.mocked(User.findOne).mockResolvedValue({
      userId: 2,
      username: 'cheick',
    } as User);

    vi.mocked(Friendship.findOne).mockResolvedValue({
      friendshipId: 1,
      userId: 1,
      friendId: 2,
      status: 'pending',
    } as Friendship);

    await expect(
      sendFriendRequest(1, 'cheick')
    ).rejects.toThrow('A friend request already exists.');

    expect(Friendship.create).not.toHaveBeenCalled();
  });

  it('should accept a pending friend request', async () => {
    const request = {
      friendshipId: 1,
      userId: 1,
      friendId: 2,
      status: 'pending',
      save: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(Friendship.findOne).mockResolvedValue(
      request as unknown as Friendship
    );

    const result = await respondToFriendRequest(2, 1, 'accept');

    expect(Friendship.findOne).toHaveBeenCalledWith({
      where: {
        friendshipId: 1,
        friendId: 2,
        status: 'pending',
      },
    });

    expect(request.status).toBe('accepted');
    expect(request.save).toHaveBeenCalledOnce();

    expect(result).toEqual({
      friendshipId: 1,
      status: 'accepted',
    });
  });

  it('should reject a pending friend request', async () => {
    const request = {
      friendshipId: 1,
      userId: 1,
      friendId: 2,
      status: 'pending',
      destroy: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(Friendship.findOne).mockResolvedValue(
      request as unknown as Friendship
    );

    const result = await respondToFriendRequest(2, 1, 'reject');

    expect(request.destroy).toHaveBeenCalledOnce();

    expect(result).toEqual({
      friendshipId: 1,
      status: 'rejected',
    });
  });

  it('removes only an accepted friendship belonging to the signed-in player', async () => {
    vi.mocked(Friendship.destroy).mockResolvedValue(1);
    expect(await removeFriendship(1, 7)).toEqual({ message: 'Friendship removed successfully.' });
    expect(Friendship.destroy).toHaveBeenCalledWith({ where: {
      friendshipId: 7, status: 'accepted', [Op.or]: [{ userId: 1 }, { friendId: 1 }],
    } });
  });

  it('makes repeated or concurrent removals harmless', async () => {
    vi.mocked(Friendship.destroy).mockResolvedValueOnce(1).mockResolvedValue(0);
    const results = await Promise.all([removeFriendship(1, 7), removeFriendship(2, 7), removeFriendship(1, 7)]);
    expect(results).toEqual(Array(3).fill({ message: 'Friendship removed successfully.' }));
  });

  it('should retrieve a users accepted friends', async () => {
    vi.mocked(Friendship.findAll).mockResolvedValue([
      {
        friendshipId: 1,
        userId: 1,
        friendId: 2,
        status: 'accepted',
      } as Friendship,
    ]);

    vi.mocked(User.findAll).mockResolvedValue([
      {
        userId: 2,
        username: 'cheick',
        get: vi.fn().mockReturnValue({
          userId: 2,
          username: 'cheick',
        }),
      } as unknown as User,
    ]);

   const result = await getFriends(1);

expect(result).toEqual([
  {
    friendshipId: 1,
    userId: 2,
    username: 'cheick',
  },
]);

    expect(Friendship.findAll).toHaveBeenCalledOnce();
    expect(User.findAll).toHaveBeenCalledOnce();
  });

  it('should retrieve pending friend requests', async () => {
    vi.mocked(Friendship.findAll).mockResolvedValue([
      {
        friendshipId: 3,
        userId: 2,
        friendId: 1,
        status: 'pending',
      } as Friendship,
    ]);

    vi.mocked(User.findAll).mockResolvedValue([
      {
        userId: 2,
        username: 'cheick',
      } as User,
    ]);

    const result = await getPendingRequests(1);

    expect(result).toEqual([
      {
        friendshipId: 3,
        senderId: 2,
        senderUsername: 'cheick',
        status: 'pending',
      },
    ]);

    expect(Friendship.findAll).toHaveBeenCalledOnce();
    expect(User.findAll).toHaveBeenCalledOnce();
  });
  
  it('should prevent users from accepting another users friend request', async () => {
  vi.mocked(Friendship.findOne).mockResolvedValue(null);

  await expect(
    respondToFriendRequest(3, 1, 'accept')
  ).rejects.toThrow('Friend request not found.');

  expect(Friendship.findOne).toHaveBeenCalledWith({
    where: {
      friendshipId: 1,
      friendId: 3,
      status: 'pending',
    },
  });
});
it('scopes removal to the caller even when the ID belongs to someone else', async () => {
  vi.mocked(Friendship.destroy).mockResolvedValue(0);
  await expect(removeFriendship(3, 1)).resolves.toEqual({ message: 'Friendship removed successfully.' });
  expect(Friendship.destroy).toHaveBeenCalledWith({ where: {
    friendshipId: 1, status: 'accepted', [Op.or]: [{ userId: 3 }, { friendId: 3 }],
  } });
});
});