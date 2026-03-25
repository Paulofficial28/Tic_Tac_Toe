# 🎮 Real-Time Multiplayer Tic-Tac-Toe

Welcome to the **Server-Authoritative Multiplayer Tic-Tac-Toe**! This project is a production-ready game built with React, Vite, and the Nakama Game Server. 

---

## 🔗 Assessment Deliverables Links

* **Source Code Repository:** [GitHub Repository](https://github.com/Paulofficial28/Tic_Tac_Toe)
* **Deployed Game URL:** `https://tic-tac-toe-ten-cyan-43.vercel.app/` *(Play the game here!)*
* **Deployed Nakama Server:** `https://tic-tac-toe-vpqp.onrender.com` *(Backend endpoint)*

---

## 🏗️ 1. Architecture and Design Decisions

This project is divided into two main parts: a fast **React Frontend** and a secure **Nakama Backend**.

### The Frontend (Client)
* **React 18 & Vite:** We chose React for components and Vite to make the app lightning-fast to load and build.
* **TypeScript:** Ensures all code is strictly typed, avoiding runtime game-breaking errors.
* **Vanilla CSS:** We used pure CSS for styling to keep the application lightweight while delivering a premium, dynamically responsive user interface without relying on heavy external libraries.
* **WebSocket Networking:** The browser uses the `nakama-js` client to maintain a persistent WebSocket (`wss://`) connection to the server.

### The Backend (Server-Authoritative Logic)
* **Nakama by Heroic Labs:** An open-source, scalable game server engine that handles matchmaking, leaderboards, and real-time multiplayer sockets.
* **PostgreSQL:** The database used by Nakama to save player accounts and leaderboard scores permanently.
* **Server-Authoritative Model (Security):** To prevent players from cheating (like moving out of turn or overriding the board), the client *never* decides who wins. The client only asks the server, "Can I place an X here?". The server validates the move, updates the board, calculates if someone won, and then tells both players the result.

---

## ⚙️ 2. Setup and Installation Instructions

Want to run this game on your own computer? Follow these simple steps.

### Prerequisites
You must have **Node.js** and **Docker Desktop** installed on your machine.

### Step 1: Start the Local Backend Server
Our backend uses Docker to effortlessly spin up the Nakama server and database.
1. Open your terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install the necessary packages and compile the custom server code:
   ```bash
   npm install
   npm run build
   ```
3. Start the server using Docker Compose:
   ```bash
   docker compose up -d
   ```
*(The backend is now running locally on `http://127.0.0.1:7350`)*

### Step 2: Start the Frontend Application
1. Open a **new** terminal window and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install the frontend packages:
   ```bash
   npm install
   ```
3. Start the local web server:
   ```bash
   npm run dev
   ```
4. Open your web browser and go to `http://localhost:5173/`. 

---

## 📡 3. API & Server Configuration Details

### How the Client and Server Talk (OP Codes)
To keep the game lightning fast, the server and client communicate using simple numeric codes called **OP Codes**.
* **OP Code `1` (MOVE):** The browser sends this to the server when a player clicks a square.
* **OP Code `2` (STATE_UPDATE):** The server broadcasts this to both players to update their screens when a valid move happens.
* **OP Code `3` (MATCH_END):** The server broadcasts this when someone wins, loses, or the game is a draw.

### Matchmaking & Game Timers
* **Matchmaking RPC (`find_match`):** When a user clicks "Find Match", the frontend triggers a Remote Procedure Call (RPC) to the server. The server instantly drops them into a matchmaking pool and pairs them with the next available opponent.
* **30-Second Match Loop Logic:** The server has an internal "Tick Loop". Every second, it calculates the time difference (`Date.now() / 1000`). If a player takes more than 30 seconds to make a move, the server triggers an automatic Forfeit and awards the win to the other player.

---

## 🧪 4. How to Test the Multiplayer Functionality

We have designed the game so that you can easily test it by yourself using two browser windows!

**Step-by-Step Testing Guide:**
1. Open the **Deployed Game URL** (`https://tic-tac-toe-ten-cyan-43.vercel.app/`) in your normal web browser (like Chrome).
2. Open the same exact URL in an **Incognito / Private Window** (This simulates a second completely separate computer).
3. **Player 1 (Normal Window):** Login with a name (e.g., "Alice") and click the **"Find Match"** button. You will see a "Waiting for opponent..." screen.
4. **Player 2 (Incognito Window):** Login with a different name (e.g., "Bob") and click the **"Find Match"** button. 
5. The Nakama server will instantly detect both of you, pair you together in a secure room, and transition both screens to the Tic-Tac-Toe board!
6. **Play a Match:** Try clicking the squares. Notice how Player 2's screen updates instantly when Player 1 moves.
7. **Test the Timer:** Once the game starts, let the timer run out completely without clicking anything. You will see the server automatically end the game and declare a winner due to inactivity.
8. **Test the Leaderboard:** Click the "Leaderboard" button on the home screen to verify your wins were permanently saved to the database.

---

## 🚀 5. Deployment Process Documentation

Here is exactly how this project was deployed to the public internet for free.

### Part A: Deploying the Frontend (Vercel)
Vercel is heavily optimized for React applications.
1. We uploaded our codebase to GitHub.
2. We logged into Vercel and imported our GitHub repository.
3. We set the Root Directory to `frontend`.
4. We clicked **Deploy**. Vercel automatically built the React code and generated our live `https://tic-tac-toe-ten-cyan-43.vercel.app/` URL.

### Part B: Deploying the Backend (Render.com)
Vercel is "serverless", meaning it cannot host continuous WebSockets. We deployed our backend to **Render**, which natively supports Docker containers.
1. We created a free **PostgreSQL** database on Render.
2. We created a free **Web Service** on Render and connected it to our GitHub repository, choosing the `backend` folder.
3. We created a custom `Dockerfile` in the `backend` folder that instructs Render to build our TypeScript logic and inject it into the base Nakama server image.
4. We added our Render Postgres database link as an environment variable (`DB_URL`).
5. Render automatically built the Docker container and exposed it securely via SSL (`wss://`) at `https://tic-tac-toe-vpqp.onrender.com`.