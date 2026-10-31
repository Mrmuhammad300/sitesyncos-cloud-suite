import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';
import { IS_DEMO } from '@/lib/demo';
import { DEMO_KEY, DEMO_URL, bootstrapDemoSession, demoFetch, demoRows } from '@/lib/demo/server';

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
  // No realtime server in demo mode. Channels replay sample INSERT/UPDATE events
  // from the demo dataset so live feeds (e.g. Notifications) still feel alive.
  type Handler = { table?: string; event?: string; cb: (payload: { new: unknown; old: unknown; eventType: string }) => void };
  const makeChannel = () => {
    const handlers: Handler[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const channel = {
      on(_type: string, filter: { table?: string; event?: string }, cb: Handler["cb"]) {
        handlers.push({ table: filter?.table, event: filter?.event, cb });
        return channel;
      },
      subscribe(cb?: (status: string) => void) {
        timers.push(setTimeout(() => cb?.("SUBSCRIBED"), 300));
        const delays = [1800, 5000, 11000, 20000, 34000, 52000];
        delays.forEach((ms, i) => {
          timers.push(setTimeout(() => {
            const h = handlers[i % Math.max(handlers.length, 1)];
            if (!h?.table) return;
            const rows = demoRows(h.table);
            if (!rows.length) return;
            const row = rows[i % rows.length];
            const eventType = h.event && h.event !== "*" ? h.event : "INSERT";
            h.cb({ new: eventType === "UPDATE" ? { ...row, status: "Approved" } : row, old: row, eventType });
          }, ms));
        });
        return channel;
      },
      unsubscribe() { timers.forEach(clearTimeout); return Promise.resolve("ok"); },
      send() { return Promise.resolve("ok"); },
    };
    return channel;
  };
  const sb = supabase as unknown as Record<string, unknown>;
  sb.channel = () => makeChannel();
  sb.removeChannel = (ch: { unsubscribe?: () => unknown }) => { ch?.unsubscribe?.(); return Promise.resolve("ok"); };
  sb.removeAllChannels = () => Promise.resolve([]);
}
