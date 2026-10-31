import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';
import { IS_DEMO } from '@/lib/demo';
import { DEMO_KEY, DEMO_URL, bootstrapDemoSession, demoFetch } from '@/lib/demo/server';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Without Supabase credentials SiteSync runs in demo mode: the client talks to an
// in-browser backend (src/lib/demo/server.ts) seeded with sample data.
if (IS_DEMO) bootstrapDemoSession();

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(
  IS_DEMO ? DEMO_URL : SUPABASE_URL,
  IS_DEMO ? DEMO_KEY : SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: IS_DEMO ? localStorage : brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
    ...(IS_DEMO ? { global: { fetch: demoFetch } } : {}),
  },
);

if (IS_DEMO) {
  // No realtime server in demo mode — hand out inert channels instead of opening sockets.
  const inert = {
    on() { return inert; },
    subscribe(cb?: (status: string) => void) { setTimeout(() => cb?.("SUBSCRIBED"), 0); return inert; },
    unsubscribe() { return Promise.resolve("ok"); },
    send() { return Promise.resolve("ok"); },
  };
  (supabase as unknown as { channel: () => typeof inert }).channel = () => inert;
  (supabase as unknown as { removeChannel: () => Promise<string> }).removeChannel = () => Promise.resolve("ok");
  (supabase as unknown as { removeAllChannels: () => Promise<string[]> }).removeAllChannels = () => Promise.resolve([]);
}
