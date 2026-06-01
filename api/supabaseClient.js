import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client. Requires these environment variables:
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (use Service Role key for server-side inserts)
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  // In serverless environments, fail fast so deployment logs show missing env
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable')
}

export const supabase = createClient(url || '', key || '')

export default supabase
