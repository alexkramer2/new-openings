// One shared Supabase connection for the website's pages.
// vendor/supabase.js (loaded first by each page) provides window.supabase.
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" }
});

// Name to show for the signed-in person.
export function displayName(user) {
  const meta = user?.user_metadata ?? {};
  return meta.full_name || meta.name || user?.email || "Signed in";
}
