require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const transactionRoutes = require('./routes/transactions');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/transactions', transactionRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🎲 International Business Ledger API is running!',
    healthCheck: '/api/health'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🎲 International Business Ledger Server`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}\n`);
});
