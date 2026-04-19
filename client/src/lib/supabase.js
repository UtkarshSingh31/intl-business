import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_PROJECT_URL_HERE') {
  console.warn('⚠️ Supabase URL not configured. Realtime features will not work.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  { realtime: { params: { eventsPerSecond: 10 } } }
);

export const DENOMINATIONS = [50, 100, 500, 1000, 5000, 10000];

export const GLOBAL_SUPPLY = {
  50: 32, 100: 32, 500: 32, 1000: 32, 5000: 24, 10000: 24
};

export const NOTE_COLORS = {
  50:    { bg: '#3b7a57', text: '#d4f4de', label: 'Emerald' },
  100:   { bg: '#1a3a6b', text: '#c8d9f5', label: 'Navy'    },
  500:   { bg: '#7b2d8b', text: '#f0d4f8', label: 'Violet'  },
  1000:  { bg: '#c17f24', text: '#fef3d0', label: 'Gold'    },
  5000:  { bg: '#8b1a1a', text: '#fdd9d9', label: 'Crimson' },
  10000: { bg: '#1a1a2e', text: '#e0d5ff', label: 'Onyx'    },
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
