# Plant Platform

A separate multi-plant dashboard for the workshop. This app is designed for:

- `Next.js` App Router on Vercel
- `Neon Postgres` as the persistence layer
- UUID-based sensor ingestion at `POST /api/plants/:plantId/readings`
- browser-side USB serial intake for per-plant streaming in Chrome or Edge

## Why this stack

- `Next.js` is the most natural deploy target on Vercel for a UI plus API in one codebase.
- `Neon Postgres` gives you a cheap serverless relational database with a single `DATABASE_URL`, which fits the plant + latest-reading snapshot model cleanly.
- The app keeps the current workshop calibration model:
  - dry fixed at `4095`
  - wet threshold default `1500`
  - wet threshold min `500`
  - wet threshold max `2049`

## Local development

1. Create a Neon Postgres database.
2. Copy `.env.example` to `.env.local`.
3. Add your Postgres connection string as `DATABASE_URL`.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

The database schema is created automatically on first request.

The app persists plant metadata and the latest reading snapshot for each plant. It does not keep a historical readings log.

## Vercel environment variables

When deploying from the monorepo, set the Vercel project root directory to `plant-platform`.
Then add the database connection string in the Vercel project settings for the same environment you are deploying to.

The app prefers `DATABASE_URL`, but also accepts the common Vercel Postgres/Neon integration names:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

Local `.env` and `.env.local` files are not uploaded to Vercel automatically. If the app shows the setup state after deploy, redeploy after adding the variable under Vercel's Environment Variables for Production, Preview, or Development as needed.

## Workshop flow

Each plant supports two ways of getting readings in:

1. Open the plant settings modal and click `Connect via USB` to stream raw values straight from the board in the browser.
2. Configure [`../plant-platform-sensor.cpp`](../plant-platform-sensor.cpp) and let the ESP32 post directly to the plant API by UUID.

USB readings are mirrored back to the same API endpoint, so other viewers of the dashboard see those updates too.

## API overview

- `GET /api/plants`
- `POST /api/plants`
- `GET /api/plants/:plantId`
- `PATCH /api/plants/:plantId`
- `DELETE /api/plants/:plantId`
- `POST /api/plants/:plantId/readings`

Create a plant from the dashboard to get its UUID, or provide your own UUID at creation time. Then use that UUID from the ESP32 sketch.
