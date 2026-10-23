import { env } from './config/env.js';
import { app } from './app.js';

app.listen(env.port, () => console.log(`ReefRoyale API listening on ${env.port}`));
