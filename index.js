require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('Supabase client initialized successfully');

// Add your server code here
