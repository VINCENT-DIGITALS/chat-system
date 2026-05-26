# chat-system

Discord-style chat web app — React + Vite + Tailwind frontend, Node.js + Express + Socket.IO backend, Supabase PostgreSQL + Storage, JWT auth, LiveKit-ready voice/video rooms.

## Project layout

```
chat-system/
  backend/        Node.js + Express + Socket.IO API
  frontend/       React + Vite + Tailwind SPA
```

## 1. Provision the database

The chat tables live in the **same Supabase project** as `portfolio-admin` and are prefixed `chat_` to avoid colliding with the portfolio's `users` table.

Run `backend/sql/schema.sql` in your Supabase SQL editor (or `psql`).

Tables created:
- `chat_users`
- `chat_servers`
- `chat_server_members`
- `chat_channels`
- `chat_messages`
- `chat_attachments`
- `chat_voice_room_participants`

(Optional) Create a Supabase Storage bucket called `chat-attachments` (public read or signed URLs as you prefer).

## 2. Backend

```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL, JWT_SECRET, Supabase, LiveKit (LiveKit placeholders work)
npm install
npm run dev                # http://localhost:4000
```

`backend/.env` is already populated with the portfolio-admin Supabase credentials for local dev. Replace `JWT_SECRET` and LiveKit values before deploying.

### Backend endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login`    | Get JWT |
| GET  | `/api/auth/me`       | Current user |
| GET  | `/api/servers`       | List user's servers |
| POST | `/api/servers`       | Create server (auto-creates `general` text channel) |
| POST | `/api/servers/join`  | Join by `invite_code` |
| GET  | `/api/servers/:id`   | Server detail |
| GET  | `/api/servers/:id/members` | Members list |
| GET  | `/api/channels/server/:serverId` | List channels |
| POST | `/api/channels/server/:serverId` | Create channel (`type`: `text`/`voice`/`video`) |
| GET  | `/api/messages/channel/:channelId` | Recent messages |
| POST | `/api/messages/channel/:channelId` | Send message (REST fallback) |
| POST | `/api/livekit/token` | Issue LiveKit access token for a voice/video channel |

### Socket.IO events

Auth: `auth: { token: <jwt> }` in the connection handshake.

| Event | Direction | Payload |
|---|---|---|
| `channel:join` | client → server | `{ channel_id }` |
| `channel:leave` | client → server | `{ channel_id }` |
| `message:send` | client → server | `{ channel_id, content }` |
| `message:new` | server → client | full message object |
| `typing:start` / `typing:stop` | both | `{ channel_id, user_id, username? }` |
| `presence:update` | server → client | `{ user_id, status }` |
| `channel:user_joined` / `channel:user_left` | server → client | `{ channel_id, user_id, username }` |

## 3. Frontend

```bash
cd frontend
cp .env.example .env       # defaults point at http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

Open http://localhost:5173, register a user, create a server, start chatting. Each new server gets a `#general` text channel by default. Voice/video channels surface the LiveKit token request button — the backend returns a stub response until you set real `LIVEKIT_*` env vars.

## 4. Enabling real voice/video (LiveKit)

The frontend is **already wired up** with `@livekit/components-react` and `livekit-client`. The only thing missing is your LiveKit project credentials.

### Option A — LiveKit Cloud (recommended, free for dev)

1. Sign up at <https://cloud.livekit.io> — no card needed for the free tier.
2. Create a project. From the project dashboard copy:
   - **API Key** (starts with `API…`)
   - **API Secret**
   - **Project URL** (`wss://your-project.livekit.cloud`)
3. Put them into `backend/.env`:
   ```
   LIVEKIT_API_KEY=APIxxxxxxxxxxxx
   LIVEKIT_API_SECRET=secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```
4. Restart the backend (`npm run dev` in `backend/`).
5. Click **Join Voice Room** or **Join Video Room** — your browser will ask for mic/camera permission, then drop you into a live room with real audio/video.

### Option B — Self-host with Docker

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret-must-be-at-least-32-chars-long" \
  livekit/livekit-server --dev
```
Then in `backend/.env`:
```
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret-must-be-at-least-32-chars-long
LIVEKIT_URL=ws://localhost:7880
```

### What you get
- **Voice channels** — Discord-style tile grid with speaking indicators (green ring + "Speaking…" label), mute/unmute, and a Disconnect button. Audio plays automatically.
- **Video channels** — LiveKit's full prebuilt video conference UI (grid + speaker view + screen-share), re-themed to match the Discord palette via [livekit-theme.css](frontend/src/livekit-theme.css).
- **Permissions** — the backend's `/api/livekit/token` endpoint already enforces channel membership before issuing a token; non-members get 403.

## 5. Admin backend (system maintenance)

Separate from per-server chat roles (`owner` / `admin` / `member`), there's a system-level admin flag (`chat_users.is_admin`) for operating the whole platform.

Apply the admin schema additions (one-time):

```bash
# from backend/
node -e "require('dotenv').config(); const fs=require('fs'); require('./src/config/db').pool.query(fs.readFileSync('sql/admin.sql','utf8')).then(()=>process.exit(0))"
```

Promote a registered user to system admin:

```bash
cd backend
npm run promote-admin -- you@example.com
```

When logged in as an admin, the chat sidebar shows a ⚙ button that opens `/admin`. Pages:

- **Dashboard** — totals, active users (24h), new users (7d), messages-per-day chart, top servers
- **Users** — search, block/unblock (with reason), promote/demote admin, delete
- **Servers** — list every server with member/channel counts; delete
- **Maintenance** — toggle global maintenance mode + edit user-facing message
- **Audit Log** — every admin action recorded with actor, target, details

### Admin API

All under `/api/admin/*`, requires `Authorization: Bearer <jwt>` from an `is_admin=true` user.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Totals + activity series |
| GET | `/admin/users?q=&limit=&offset=` | List/search users |
| POST | `/admin/users/:id/block` | `{ reason? }` — blocks login + JWT + sockets |
| POST | `/admin/users/:id/unblock` | Restore access |
| POST | `/admin/users/:id/promote` | Make system admin |
| POST | `/admin/users/:id/demote` | Revoke admin |
| DELETE | `/admin/users/:id` | Hard delete |
| GET | `/admin/servers` | Every server + counts |
| DELETE | `/admin/servers/:id` | Delete server (cascades) |
| GET | `/admin/settings` | All key/value system settings |
| PUT | `/admin/settings` | Body `{ key: value, ... }` — upsert settings |
| GET | `/admin/audit-log?limit=` | Most recent admin actions |

Public:

| Method | Path | Description |
|---|---|---|
| GET | `/api/system/status` | `{ maintenance, message }` — used by the frontend banner |

### How maintenance mode works

When `maintenance_mode = true`:
- Non-admin requests to `/api/servers`, `/api/channels`, `/api/messages`, `/api/livekit` return **503** with `{ error: "maintenance", message }`.
- `/api/health`, `/api/auth/*`, `/api/admin/*`, `/api/system/status` stay open.
- The frontend polls `/api/system/status` every 15s and shows a red banner above the chat layout.
- Admin accounts keep full access so they can fix things.

### Blocked users

Blocking a user (`is_blocked=true`):
- Rejects new login attempts with 403.
- Rejects further REST requests using their existing JWT (auth middleware re-checks every request).
- Rejects Socket.IO handshake.

## 6. Running it on your phone (same Wi-Fi)

The app already auto-detects the right backend URL based on whatever host the page is loaded from, and CORS auto-allows any private-LAN origin. So the setup is:

1. **Find your PC's LAN IP** (on Windows):
   ```powershell
   ipconfig | findstr IPv4
   ```
   You'll see something like `192.168.1.7`.

2. **Allow the ports through Windows Firewall** (once):
   ```powershell
   # Run PowerShell as Administrator:
   New-NetFirewallRule -DisplayName "chat-system backend"  -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "chat-system frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
   ```

3. **Start both servers on your PC** (two terminals):
   ```bash
   cd backend  && npm run dev      # listens on 0.0.0.0:4000
   cd frontend && npm run dev      # listens on 0.0.0.0:5173
   ```
   The Vite output will print both URLs:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.7:5173/   ← use this on your phone
   ```

4. **Connect the phone to the same Wi-Fi** as your PC, then open the Network URL above in the phone's browser (`http://192.168.1.7:5173`).

5. Add it to the home screen for an app-like experience: in Safari/Chrome use **Share → Add to Home Screen**.

Notes:
- The frontend resolves the API URL from the page's own hostname, so the same code works from `localhost` (on your PC) and `192.168.x.x` (on your phone) with no changes.
- Backend CORS allows any `localhost`, `127.0.0.1`, or RFC1918 private-LAN origin by default. To lock it down, set `CLIENT_ORIGIN` in `backend/.env` to an explicit list, or remove the `*`.
- If your phone can't connect: confirm the firewall rules above, confirm both devices are on the same Wi-Fi (not Guest network), and try `http://YOUR_IP:4000/api/health` from the phone's browser — should return `{"ok":true}`.
- Voice/video rooms over LiveKit require LiveKit credentials; the token endpoint will still return a stub from the phone.

## Notes

- `chat_users` is intentionally separate from the existing Laravel `users` table from `portfolio-admin`. They share the Supabase project but do not collide.
- The MVP focuses on auth + text chat + realtime. Voice/video is scaffolded (UI + token endpoint) without a full WebRTC UI.
- No paid services are required to run the MVP locally.
# chat-system
