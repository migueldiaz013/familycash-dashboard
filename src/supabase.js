import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "https://nrszyrjakewmvsdiphvy.supabase.co"
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "sb_publishable_Q1t2poQ9ofzHsbrvpDhUeg_zPB-KGE7"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
