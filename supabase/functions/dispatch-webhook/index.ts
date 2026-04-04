/**
 * SiteSync — dispatch-webhook Edge Function
 *
 * Sends outbound HTTP POST payloads to registered webhook URLs.
 * Called from Database Webhooks or directly from the client.
 *
 * Request body:
 *   {
 *     event_type: string,     // e.g. "rfi.created"
 *     record: { ... },        // the DB row that triggered the event
 *     table: string,          // DB table name
 *   }
 *
 * Security:
 *   - Each registered webhook can have an optional HMAC-SHA256 secret.
 *   - The signature is sent in the X-SiteSync-Signature header.
 *   - Receiving endpoints should verify: HMAC-SHA256(secret, JSON.stringify(body))
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface DispatchPayload {
  event_type: string;
  record: Record<string, unknown>;
  table: string;
}

async function hmacSign(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deliverToWebhook(
  webhook: { id: string; url: string; secret: string | null },
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ status: number; body: string }> {
  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "SiteSync-Webhook/1.0",
    "X-SiteSync-Event": eventType,
  };

  if (webhook.secret) {
    const sig = await hmacSign(webhook.secret, body);
    headers["X-SiteSync-Signature"] = `sha256=${sig}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    const resBody = await res.text().catch(() => "");
    return { status: res.status, body: resBody.slice(0, 500) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 0, body: msg };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const payload: DispatchPayload = await req.json();

    if (!payload.event_type || !payload.record) {
      return new Response(JSON.stringify({ error: "event_type and record are required" }), { status: 400 });
    }

    // Find all active webhooks subscribed to this event
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("id, url, secret")
      .eq("is_active", true)
      .contains("events", [payload.event_type]);

    if (error) throw error;
    if (!webhooks?.length) {
      return new Response(JSON.stringify({ dispatched: 0, reason: "No active subscribers" }), { status: 200 });
    }

    // Dispatch to all matching webhooks (parallel, best-effort)
    const results = await Promise.allSettled(
      webhooks.map(async (wh) => {
        const { status, body } = await deliverToWebhook(wh, payload.event_type, payload.record);

        // Log delivery
        await supabase.from("webhook_deliveries" as never).insert({
          webhook_id: wh.id,
          event_type: payload.event_type,
          payload: payload.record,
          response_status: status || null,
          response_body: body || null,
        });

        // Update last_triggered_at and last_status on webhook
        await supabase.from("webhooks").update({
          last_triggered_at: new Date().toISOString(),
          last_status: status,
        }).eq("id", wh.id);

        return { webhook_id: wh.id, status };
      })
    );

    const dispatched = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(JSON.stringify({ dispatched, failed, total: webhooks.length }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("dispatch-webhook error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
