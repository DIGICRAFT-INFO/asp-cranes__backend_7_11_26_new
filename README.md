# ASP Cranes Backend — Vercel Deployment

## What changed for Vercel
1. **`api/index.js`** — serverless entry point Vercel auto-detects. Exports the Express app from `server.js`.
2. **`vercel.json`** — rewrites all traffic to the single function; 30s max duration.
3. **`server.js`**
   - Removed `process.exit()` on missing/failed Mongo connection (fatal in serverless — it would crash the function instead of returning an error response).
   - Mongo connection is cached across invocations (`isConnected` flag) to avoid reconnecting on every cold start.
   - `/api/health` is registered before the DB-connection gate so it responds even if the DB is down — needed for uptime monitoring.
   - `app.listen()` only runs when the file is executed directly (`node server.js`), never when imported by Vercel.
4. **`routes/upload.js`** — switched from `multer.diskStorage` to `multer.memoryStorage` + **Cloudinary**. Vercel's filesystem is read-only (except `/tmp`, which is wiped between invocations and isn't publicly servable), so disk-based uploads silently disappear in production.
5. Removed the committed `uploads/` folder and `.env` (secrets don't belong in the zip/repo) — see `.env.example`.

## Deploy steps
```bash
npm install
vercel login
vercel          # first deploy, links the project
vercel --prod   # production deploy
```

## Required environment variables (Vercel Project Settings → Environment Variables)
| Variable | Notes |
|---|---|
| `MONGODB_URI` | Atlas connection string. Use a dedicated Atlas user, not the one in the original `.env`. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Rotate these — the originals were committed in plaintext. |
| `FRONTEND_URL`, `ADMIN_URL` | Your deployed frontend/admin origins, for CORS. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Required for `/api/upload/*` in production. Free tier is fine to start. |
| `SMTP_HOST/PORT/USER/PASS`, `CONTACT_RECEIVER` | Only if `routes/contact.js` sends email. |

## ⚠️ Action item before going live
The uploaded zip's `.env` contained live Atlas credentials and JWT secrets in plaintext. Rotate the Atlas password and generate new JWT secrets before deploying — treat the old ones as compromised.
