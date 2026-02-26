import { AREIClient } from "arei-sdk";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const arei = new AREIClient({ supabaseUrl: url, supabaseAnonKey: key });
