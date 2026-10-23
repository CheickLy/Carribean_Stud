# CS 482 Carribean Stud 

Developers: Miles, Sam, Cheick, Olu

## Project Links

<table border="1" style="border-collapse: collapse; width: 100%;">
  <tr>
    <th style="padding: 8px; text-align: left;">Document</th>
    <th style="padding: 8px; text-align: left;">Link</th>
  </tr>
  <tr>
    <td style="padding: 8px;">Client Meeting Notes (Word)</td>
    <td style="padding: 8px;"><a href="https://studentsloyola-my.sharepoint.com/:w:/r/personal/sghersick_loyola_edu/Documents/Caribbean_Stud_Client_Meeting_Notes.docx?d=w6f0246f0a541400ea0bd71549cd27d25&csf=1&web=1&e=Hg6TLo">Meeting Notes</a></td>
  </tr>
  <tr>
    <td style="padding: 8px;">User Stories (Excel)</td>
    <td style="padding: 8px;"><a href="https://studentsloyola-my.sharepoint.com/:x:/r/personal/sghersick_loyola_edu/Documents/Carribean_Stud_User_Stories.xlsx?d=w24368562c21c4f109a5c1fa71e056404&csf=1&web=1&e=jprSWG">User Stories</a></td>
  </tr>
</table>

## How to get started

### Requirements

```text
Node.js 20+
Docker
```

### To get up and running:
1. At the repo root, copy `.env.example` to `.env` and set the Postgres values. Do not commit `.env`.
2. At the repo root, start the database: `docker compose up -d`.
3. In `server/`, run `npm install`, then `npm run db:migrate`, then `npm run db:seed`, then `npm run dev`. The API listens on `http://localhost:3001`.
4. In `client/`, run `npm install`, then `npm run dev`. The frontend listens on `http://localhost:5173`.

Stop the database with `docker compose down` from the repo root. If `POSTGRES_PORT` is already in use, the container will not start. `docker compose down -v` also deletes the database volume. After that, run migrate and seed again.

## Server

The API lives in `server/`. PostgreSQL runs in Docker. The Express process runs on your machine and connects to that database.

### Tech stack

- **Node.js and TypeScript.** The client is TypeScript, and the server uses the same language so request and model types stay explicit.
- **Express.** The API is a small set of HTTP routes. Express is enough for that without a larger framework.
- **PostgreSQL.** Accounts, lobbies, sessions, hands, friendships, and support tickets are relational data with foreign keys. Postgres matches that ERD.
- **Docker Compose.** Postgres runs in a container, so nobody has to install the database directly. `docker-compose.yml` at the repo root reads the root `.env`.
- **Sequelize.** Models describe each table, and the CLI applies `server/src/db/migrations/001-db-schema.cjs` and the user seed. The running app uses the same column names through those models.
- **Vitest.** `npm test` and `npm run test:coverage` run the server tests. The project standard is coverage above 50%.

### Folder structure

```text
server/
  src/
    index.ts                 starts the API
    app.ts                   Express app and route mounting
    config/
      env.ts                 loads the repo-root .env for the server
      database.cjs           Sequelize CLI connection settings
    db/
      sequelize.ts           Sequelize connection used by the models
      migrations/            migration schemas 
      seeders/               Synthetic data for development
    models/                  one model per ERD table, plus associations (index.ts)
    modules/                 backend modules
  tests/                     Vitest tests
```

