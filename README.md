# 🌍 International Business — Digital Ledger

A private, real-time digital ledger and inventory system for the **International Business** board game. Replaces physical paper money and property tickets with a secure, escrow-based transaction system.

---

## 🗂️ Project Structure

```
intl-business/
├── server/               # Express + Supabase backend
│   ├── config/
│   │   └── supabase.js   # Supabase client + global supply constants
│   ├── middleware/
│   │   └── auth.js       # JWT auth + role middleware
│   ├── routes/
│   │   ├── auth.js       # Room creation, join endpoints
│   │   ├── game.js       # Inventory, setup, properties, corrections
│   │   └── transactions.js # Escrow send/accept/reject + change algo
│   ├── schema.sql        # ⭐ Run this in Supabase SQL Editor first
│   ├── .env              # ⭐ Fill in your Supabase credentials
│   └── index.js          # Express entry point
│
└── client/               # React + Vite frontend
    ├── src/
    │   ├── components/
    │   │   ├── banker/   # SetupPanel, InventoryOverview, AuditLog, etc.
    │   │   ├── player/   # SendTransaction, PendingTransaction, History
    │   │   └── shared/   # NoteComponents, Topbar
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── hooks/
    │   │   └── useRealtime.js  # Supabase realtime subscriptions
    │   ├── lib/
    │   │   ├── api.js    # API calls with JWT auth
    │   │   └── supabase.js  # Supabase client + constants
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── BankerDashboard.jsx
    │   │   └── PlayerDashboard.jsx
    │   └── index.css     # Full design system (dark luxury theme)
    └── .env              # ⭐ Fill in your Supabase public credentials
```

---

## 🚀 Setup Instructions

### Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a **New Project** — note your project URL and keys
3. Go to **SQL Editor** → paste the entire contents of `server/schema.sql` → **Run**
4. This creates all tables and enables realtime

### Step 2 — Configure Environment Variables

**server/.env**
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
JWT_SECRET=pick-a-long-random-secret-string
PORT=5000
CLIENT_URL=http://localhost:5173
```

**client/.env**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:5000/api
```

> 🔑 Find your keys in Supabase Dashboard → **Project Settings** → **API**
> - `SUPABASE_URL` = Project URL
> - `SUPABASE_ANON_KEY` = `anon` `public` key
> - `SUPABASE_SERVICE_ROLE_KEY` = `service_role` key (**keep secret — server only**)

### Step 3 — Install Dependencies

```bash
# From project root
cd server && npm install
cd ../client && npm install
```

### Step 4 — Run in Development

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🎲 How to Play

### Banker Flow
1. Go to the app, click **Create Room**
2. Set a Room Name, Banker Password, and Player Password
3. Share the **Room Code** and **Player Password** with friends
4. In the **Setup Phase**, distribute starting notes to each player (or use Equal Split)
5. Click **Apply Distribution** → **Start Game**
6. During the game: monitor all inventories, manage properties, view the live audit log, and use Force Corrections if needed

### Player Flow
1. Click **Join as Player**, enter Room Code + Player Password + your Name
2. Wait for the Banker to start the game
3. Use the **Wallet** tab to see your notes
4. Click **Send Payment** to initiate a transaction — pick the recipient and choose your notes
5. If someone sends you money, a **Pending Incoming Payment** banner appears with Accept/Reject options
6. You can set the actual "owed amount" if the sender overpaid — the app auto-calculates change

---

## 💰 Global Supply (Hard Caps)

| Denomination | Notes in Box |
|---|---|
| ₹50    | 32 |
| ₹100   | 32 |
| ₹500   | 32 |
| ₹1,000 | 32 |
| ₹5,000 | 24 |
| ₹10,000| 24 |

The system enforces these limits at the database level. Notes cannot be created or destroyed — only transferred.

---

## 🔐 Security Features

- **JWT auth** — separate tokens for banker and players
- **Banker-only routes** — players cannot access other players' inventories
- **Escrow system** — notes deducted from sender immediately, released only on acceptance
- **One pending transaction at a time** per sender — prevents double-spending
- **Greedy change algorithm** — automatically calculates optimal change from receiver's inventory
- **Immutable audit log** — every action is timestamped and logged permanently
- **Supply enforcement** — Force Corrections validated against bank inventory

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, JWT, bcryptjs
- **Database**: Supabase (PostgreSQL + Realtime)
- **Frontend**: React 18, Vite, React Router, react-hot-toast
- **Realtime**: Supabase Postgres Changes subscriptions
