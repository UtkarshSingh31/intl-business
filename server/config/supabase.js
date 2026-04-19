const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Global supply hard caps (matches physical box)
const GLOBAL_SUPPLY = {
  50:    32,
  100:   32,
  500:   32,
  1000:  32,
  5000:  24,
  10000: 24
};

const DENOMINATIONS = [50, 100, 500, 1000, 5000, 10000];

module.exports = { supabase, GLOBAL_SUPPLY, DENOMINATIONS };
