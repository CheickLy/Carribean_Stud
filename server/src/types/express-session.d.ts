import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    practiceGame?: import("../modules/game/round.js").PracticeGame;
  }
}



// this is for recognising req.session.userId