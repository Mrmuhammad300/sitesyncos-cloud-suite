/**
 * Demo mode is on when the deployment has no Supabase credentials, or when
 * VITE_DEMO_MODE=true is set explicitly (useful for previews and screenshots).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === "true" || !url || !key;
