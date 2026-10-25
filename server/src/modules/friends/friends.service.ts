import { Op } from 'sequelize';
import { Friendship } from '../../models/friendship.js';
import { User } from '../../models/user.js';

export async function sendFriendRequest(
  senderId: number,
  recipientUsername: string
) {
  const username = recipientUsername.trim();

  if (!username) {
    throw new Error('Username is required.');
  }

  const recipient = await User.findOne({
    where: { username },
  });

  if (!recipient) {
    throw new Error('User not found.');
  }

  if (recipient.userId === senderId) {
    throw new Error('You cannot add yourself as a friend.');
  }

  const existingFriendship = await Friendship.findOne({
    where: {
      [Op.or]: [
        { userId: senderId, friendId: recipient.userId },
        { userId: recipient.userId, friendId: senderId },
      ],
    },
  });

  if (existingFriendship) {
    if (existingFriendship.status === 'accepted') {
      throw new Error('You are already friends.');
    }

    if (existingFriendship.status === 'pending') {
      throw new Error('A friend request already exists.');
    }
  }

  const friendship = await Friendship.create({
    userId: senderId,
    friendId: recipient.userId,
    status: 'pending',
  });

  return {
    friendshipId: friendship.friendshipId,
    recipientId: recipient.userId,
    recipientUsername: recipient.username,
    status: friendship.status,
  };
}

export async function getFriends(userId: number) {
  const friendships = await Friendship.findAll({
    where: {
      status: 'accepted',
      [Op.or]: [{ userId }, { friendId: userId }],
    },
  });

  const friendIds = friendships.map((friendship) =>
    friendship.userId === userId
      ? friendship.friendId
      : friendship.userId
  );

  if (friendIds.length === 0) {
    return [];
  }

  const users = await User.findAll({
    where: {
      userId: { [Op.in]: friendIds },
    },
    attributes: ['userId', 'username'],
  });

  return users.map((user) => {
  const friendship = friendships.find(
    (f) => f.userId === userId
      ? f.friendId === user.userId
      : f.userId === user.userId
  );

  return {
    friendshipId: friendship!.friendshipId,
    userId: user.userId,
    username: user.username,
  };
});
}

export async function getPendingRequests(userId: number) {
  const requests = await Friendship.findAll({
    where: {
      friendId: userId,
      status: 'pending',
    },
  });

  const senderIds = requests.map((request) => request.userId);

  const senders = await User.findAll({
    where: {
      userId: { [Op.in]: senderIds },
    },
    attributes: ['userId', 'username'],
  });

  return requests.map((request) => {
    const sender = senders.find(
      (user) => user.userId === request.userId
    );

    return {
      friendshipId: request.friendshipId,
      senderId: request.userId,
      senderUsername: sender?.username ?? 'Unknown',
      status: request.status,
    };
  });
}

export async function respondToFriendRequest(
  userId: number,
  friendshipId: number,
  action: 'accept' | 'reject'
) {
  const request = await Friendship.findOne({
    where: {
      friendshipId,
      friendId: userId,
      status: 'pending',
    },
  });

  if (!request) {
    throw new Error('Friend request not found.');
  }

  if (action === 'accept') {
    request.status = 'accepted';
    await request.save();

    return {
      friendshipId,
      status: 'accepted',
    };
  }

  await request.destroy();

  return {
    friendshipId,
    status: 'rejected',
  };
}

export async function removeFriendship(
  userId: number,
  friendshipId: number
) {
  const friendship = await Friendship.findOne({
    where: {
      friendshipId,
      [Op.or]: [{ userId }, { friendId: userId }],
    },
  });

  if (!friendship) {
    throw new Error('Friendship not found.');
  }

  await friendship.destroy();

  return {
    message: 'Friendship removed successfully.',
  };
}