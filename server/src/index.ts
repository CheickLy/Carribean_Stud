import { env } from './config/env.js';
import { app } from './app.js';
import { startTableClock } from './modules/shared-game/service.js';

startTableClock();
app.listen(env.port, () => console.log(`ReefRoyale API listening on ${env.port}`));
