import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}



// this is for recognising req.session.userId