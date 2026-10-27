import { Op } from 'sequelize';
import { FriendMessage } from '../../models/friendMessage.js';
import { Friendship } from '../../models/friendship.js';
import { User } from '../../models/user.js';

async function checkFriendship(userId: number, friendId: number) {
  // friendship can be saved in either direction
  return Friendship.findOne({
    where: {
      status: 'accepted',
      [Op.or]: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    },
  });
}

export async function sendMessage(userId: number, friendId: number, text: string) {
  // only accepted friends can send private messages
  if (!(await checkFriendship(userId, friendId))) throw new Error('You can only message current friends.');
  const friend = await User.findByPk(friendId, { attributes: ['userId', 'username'] });
  if (!friend) throw new Error('Friend not found.');
  const message = await FriendMessage.create({ senderId: userId, recipientId: friendId, message: text.trim(), readAt: null });
  return message.get({ plain: true });
}

export async function getConversation(userId: number, friendId: number) {
  if (!(await checkFriendship(userId, friendId))) throw new Error('You can only read messages from current friends.');

  // mark messages as read when the conversation opens
  await FriendMessage.update({ readAt: new Date() }, {
    where: { senderId: friendId, recipientId: userId, readAt: null },
  });

  return FriendMessage.findAll({
    where: { [Op.or]: [{ senderId: userId, recipientId: friendId }, { senderId: friendId, recipientId: userId }] },
    order: [['createdAt', 'ASC'], ['messageId', 'ASC']],
  });
}
