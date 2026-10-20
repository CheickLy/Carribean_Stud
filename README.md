# ReefRoyale — Caribbean Stud

Team project scaffold for CS482. Existing project documentation remains in the GitHub `Docs/` directory.

## Structure
- `client/`: React + TypeScript frontend
- `server/`: Express + TypeScript backend
- `server/src/modules/auth/`: S1 player login and S4 registration

## Start locally
1. Install Node.js 20+ and PostgreSQL.
2. In `server/`, run `npm install`, copy `.env.example` to `.env`, then `npm run dev`.
3. In `client/`, run `npm install` and `npm run dev`.
4. Run backend tests with `cd server && npm run test:coverage`.

Authentication routes are intentionally placeholders until S1/S4 are implemented. Do not commit `.env` or real credentials.
