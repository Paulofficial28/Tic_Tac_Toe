# Real-Time Multiplayer Server-Authoritative Tic-Tac-Toe

A production-ready, server-authoritative multiplayer Tic-Tac-Toe game.

## Assessment Deliverables Links
* **Source Code Repository:** [GitHub Repository](https://github.com/Paulofficial28/Tic_Tac_Toe)
* **Deployed Game URL:** `[INSERT_YOUR_FRONTEND_URL_HERE]` *(e.g., https://my-tic-tac-toe.vercel.app)*
* **Deployed Nakama Server:** `https://tic-tac-toe-vpqp.onrender.com`

---

## 1. Architecture & Design Decisions

### Frontend
- **Framework:** React 18 with Vite for lightning-fast HMR and optimized production builds.
- **Language:** TypeScript for strict typing of Nakama match states and OP codes.
- **Styling:** Vanilla CSS for a premium, lightweight, dynamic, and responsive UI without external bloat.
- **Networking:** Nakama JS Client communicating via WebSocket (`wss://`) to send Match States and OP Codes continuously.

### Backend (Server-Authoritative)
- **Engine:** Nakama Server (by Heroic Labs), an open-source, scalable game server.
- **Database:** PostgreSQL used by Nakama to persist Leaderboard data, accounts, and server state.
- **Server Module:** TypeScript Backend Module containing all game state management, win logic, turn timers, and Tick rate execution.

### Security & Game Logic
- All game logic validation happens on the Nakama server specifically in the match handler (`backend/src/match_handler.ts`).
- The client never computes the result of the match. It only sends an **OP Code (1 = MOVE)** and the server validates if the move is legal (checking whose turn it is, and if the cell is empty). The server calculates win/draw conditions and broadcasts a **STATE_UPDATE** or **MATCH_END** to clients.
- **Anti-Cheat:** Because the server is authoritative, hacked clients cannot force a win or an illegal move.

---

## 2. Setup & Installation Instructions (Local Development)

You will need **Node.js** and **Docker Desktop** (or Docker Engine/Compose) installed locally.

### Start the Backend Infrastructure
The backend directory contains the `.ts` scripts for the server logic and a `docker-compose.yml` to boot Nakama + Postgres locally.
```bash
cd backend
npm install
npm run build
docker compose up -d
```
*Nakama will bind to `127.0.0.1:7350` and auto-load the compiled `build/index.js` module.*
*(Default Nakama local credentials are `admin:password`, and server key `defaultkey`)*

### Start the Frontend Application
In a separate terminal, install the frontend dependencies and spin up Vite.
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173/` in your browser. Open an Incognito window to simulate Player 2 alongside Player 1!

---

## 3. API & Server Configuration Details

### OP Codes
The server and client communicate using predefined operation codes:
* `1` (**MOVE**): Client sends to Server to request a move.
* `2` (**STATE_UPDATE**): Server broadcasts the updated board state to all connected clients.
* `3` (**MATCH_END**): Server broadcasts the final game result (win/draw/forfeit).

### Matchmaking & Timers
- A global RPC call `find_match` uses Nakama's match maker, automatically routing players into the same active session.
- **30-Second Match Loop:** By computing standard `Date.now() / 1000` boundaries, the server verifies timeouts and triggers a Forfeit scenario inside the `matchLoop` tick execution.

---

## 4. How to Test the Multiplayer Functionality

1. Ensure the backend (`docker compose up -d`) and frontend (`npm run dev`) are running.
2. Open two distinct browser tabs (e.g., normal Chrome and an Incognito window).
3. On **Tab 1**, login as "Alice_Player". Click **"Find Match"**. The server creates a custom match ID and places Alice in the waiting pool.
4. On **Tab 2**, login as "Bob_Player". Click **"Find Match"**. The server assigns Bob to Alice's active match room via the `rpcFindMatch`.
5. The game transitions both users to the game UI simultaneously using React Router `/game` parameters.
6. Play the game! 
7. **Timeout Testing:** Try letting the 30-second timer elapse without playing a move to test the server-authoritative auto-forfeit.
8. **Disconnect Testing:** Exit the browser tab mid-game to verify the match gracefully shuts down and the opponent receives a win.
9. Return to the Lobby, click **"Leaderboard"** to see your global recorded wins persistence!

---

## 5. Deployment Process Documentation

Follow these steps to deploy your application to the cloud.

### A. Deploying the Frontend (Vercel)
Vercel is the easiest place to host the React/Vite frontend for free.

1. Ensure this codebase is pushed to your GitHub repository.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. **Important Configuration:**
   * **Framework Preset:** Vite
   * **Root Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. Click **Deploy**. Vercel will give you a live URL (e.g., `https://my-tic-tac-toe.vercel.app`).

**Before you push:** Remember to update `frontend/src/lib/nakama.ts` to point to your deployed Nakama Production server URL!
```typescript
const useSSL = true; // MUST be true in production
const client = new Client("defaultkey", "YOUR_NAKAMA_DOMAIN_OR_IP", "443", useSSL);
```

### B. Deploying the Nakama Backend

**Why not Vercel?** 
Vercel is a "serverless" platform meant for hosting static files (React) and short-lived API endpoints. Nakama requires a **continuous, long-running WebSocket server** to maintain active player match states, which serverless platforms like Vercel do not support. 

Therefore, you must host the backend on a platform that supports Docker containers, such as **Render**, **Railway**, or a standard Cloud VM (AWS/DigitalOcean).

#### Option 1: Free Tier via Render.com (Easiest)
1. Create a free account on [Render](https://render.com/).
2. Create a new **PostgreSQL** database on Render and copy its Internal Database URL.
3. Create a new **Web Service** on Render, connect your GitHub repository, and choose the `backend` directory.
4. Set the Environment to `Docker`.
5. Add an Environment Variable for the database: `DB_URL` = `[Your Render Postgres URL]`.
6. Render will automatically build your Docker container and give you a live HTTPS/WSS URL!

#### Option 2: Cloud VM (DigitalOcean Droplet / AWS EC2 Free Tier)
For game servers, a standard Cloud Virtual Machine (Ubuntu) running Docker Compose is highly recommended.
1. **Provision a VM:** Create a basic Ubuntu VM (1GB or 2GB RAM is sufficient).
2. **Install Docker:** SSH into the server and run `sudo apt update && sudo apt install docker.io docker-compose -y`.
3. **Upload the Backend:** Clone your repository `git clone https://github.com/Paulofficial28/Tic_Tac_Toe.git`.
4. **Start the Server:** `cd Tic_Tac_Toe/backend` then `sudo docker-compose up -d`.
5. **Secure with SSL:** Set up an **Nginx Reverse Proxy** with **Certbot (Let's Encrypt)** targeting `localhost:7350` to secure your Nakama endpoints.

---
**After Backend Deployment:** Once your backend is live (e.g., `nakama.onrender.com`), paste its domain into your `frontend/src/lib/nakama.ts`, ensure `useSSL` is set to `true`, and re-deploy your Vercel frontend.