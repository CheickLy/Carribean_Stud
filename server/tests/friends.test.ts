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

  it('should successfully remove a friend', async () => {
    const friendship = {
      friendshipId: 1,
      userId: 1,
      friendId: 2,
      status: 'accepted',
      destroy: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(Friendship.findOne).mockResolvedValue(
      friendship as unknown as Friendship
    );

    const result = await removeFriendship(1, 1);

    expect(Friendship.findOne).toHaveBeenCalledOnce();
    expect(friendship.destroy).toHaveBeenCalledOnce();

    expect(result).toEqual({
      message: 'Friendship removed successfully.',
    });
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
it('should prevent users from deleting another users friendship', async () => {
  vi.mocked(Friendship.findOne).mockResolvedValue(null);

  await expect(
    removeFriendship(3, 1)
  ).rejects.toThrow('Friendship not found.');

  expect(Friendship.findOne).toHaveBeenCalledWith({
    where: {
      friendshipId: 1,
      [Op.or]: [
        { userId: 3 },
        { friendId: 3 },
      ],
    },
  });
});
});