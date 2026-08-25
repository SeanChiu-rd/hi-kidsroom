import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('缺少 Supabase 環境變數，請檢查 .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
