import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://nyupmwxwnqkoebgdeaky.supabase.co';
// Публичный (publishable) ключ: его безопасно хранить во фронтенде, доступ ограничен RLS
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable___mKaq1Uatm_kVhJ9d5lbw_d04tnbsI';

export const supabase = createClient(url, key);
