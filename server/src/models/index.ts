import { Friendship } from './friendship.js';
import { GameHand } from './gameHand.js';
import { Lobby } from './lobby.js';
import { Session } from './session.js';
import { SupportTicket } from './supportTicket.js';
import { User } from './user.js';

User.hasMany(Lobby, { foreignKey: 'hostId', as: 'hostedLobbies' });
Lobby.belongsTo(User, { foreignKey: 'hostId', as: 'host' });

Lobby.hasMany(Session, { foreignKey: 'lobbyId', as: 'sessions' });
Session.belongsTo(Lobby, { foreignKey: 'lobbyId', as: 'lobby' });

User.hasMany(Friendship, { foreignKey: 'userId', as: 'friendships' });
User.hasMany(Friendship, { foreignKey: 'friendId', as: 'friendshipsReceived' });
Friendship.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Friendship.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });

Session.hasMany(GameHand, { foreignKey: 'sessionId', as: 'gameHands' });
GameHand.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });
User.hasMany(GameHand, { foreignKey: 'userId', as: 'gameHands' });
GameHand.belongsTo(User, { foreignKey: 'userId', as: 'player' });

User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'supportTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { Friendship, GameHand, Lobby, Session, SupportTicket, User };
