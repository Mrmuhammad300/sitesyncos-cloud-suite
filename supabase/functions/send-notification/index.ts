/**
 * SiteSync — send-notification Edge Function
 *
 * Triggered by Supabase Database Webhooks or called directly from the client.
 * Sends transactional emails via Resend (https://resend.com).
 *
 * Setup:
 *   1. Create a Resend account and get an API key.
 *   2. In Supabase Dashboard → Edge Functions → Secrets, add:
 *        RESEND_API_KEY=re_xxxxxxxxxxxx
 *        SITE_URL=https://your-app.com
 *   3. Deploy: supabase functions deploy send-notification --no-verify-jwt
 *   4. Wire Supabase Database Webhooks (Dashboard → Database → Webhooks) to
 *      fire on INSERT events for: rfis, draw_requests, daily_reports, change_orders
 *
 * Request body (from webhook or direct call):
 *   {
 *     type: "rfi_created" | "draw_approved" | "draw_rejected" | "daily_report" | "change_order",
 *     record: { ... }    // the inserted/updated DB row
 *     recipient_email?: string   // optional override; falls back to querying profiles
 *   }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SITE_URL       = Deno.env.get("SITE_URL") ?? "https://app.sitesyncos.com";
const FROM_EMAIL     = "noreply@sitesyncos.com";

// ─── HTML escaping to prevent XSS in email templates ─────────────────────────

function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function fmtCurrency(value: unknown): string {
  const n = Number(value);
  return isNaN(n) ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationPayload {
  type: string;
  record: Record<string, unknown>;
  recipient_email?: string;
}

interface Email {
  to: string;
  subject: string;
  html: string;
}

// ─── Email templates ─────────────────────────────────────────────────────────

function buildEmail(payload: NotificationPayload): Email | null {
  const { type, record } = payload;

  switch (type) {
    case "rfi_created":
      return {
        to: payload.recipient_email ?? "",
        subject: `New RFI: ${esc(record.rfi_number)} — ${esc(record.subject)}`,
        html: `
          <h2>New RFI Submitted</h2>
          <p><strong>RFI #:</strong> ${esc(record.rfi_number)}</p>
          <p><strong>Subject:</strong> ${esc(record.subject)}</p>
          <p><strong>Priority:</strong> ${esc(record.priority)}</p>
          <p><strong>Due:</strong> ${record.due_date ? esc(record.due_date) : "Not set"}</p>
          ${record.description ? `<p><strong>Description:</strong> ${esc(record.description)}</p>` : ""}
          <p><a href="${esc(SITE_URL)}/build/rfis">View in SiteSync →</a></p>
        `,
      };

    case "draw_approved":
    case "draw_rejected": {
      const approved = type === "draw_approved";
      const statusLabel = approved ? "Approved ✅" : "Rejected ❌";
      return {
        to: payload.recipient_email ?? "",
        subject: `Draw Request ${statusLabel}: ${esc(record.draw_number)}`,
        html: `
          <h2>Draw Request ${statusLabel}</h2>
          <p><strong>Draw #:</strong> ${esc(record.draw_number)}</p>
          <p><strong>Title:</strong> ${esc(record.title)}</p>
          <p><strong>Amount:</strong> ${fmtCurrency(record.amount)}</p>
          <p><strong>Status:</strong> ${esc(record.status)}</p>
          ${record.description ? `<p><strong>Notes:</strong> ${esc(record.description)}</p>` : ""}
          <p><a href="${esc(SITE_URL)}/ops/draws">View in SiteSync →</a></p>
        `,
      };
    }

    case "daily_report": {
      const hasSafety = Number(record.safety_incidents) > 0;
      return {
        to: payload.recipient_email ?? "",
        subject: hasSafety
          ? `⚠️ Safety Incident Reported — ${esc(record.report_date)}`
          : `Daily Report Filed — ${esc(record.report_date)}`,
        html: `
          <h2>Daily Report: ${esc(record.report_number)}</h2>
          <p><strong>Date:</strong> ${esc(record.report_date)}</p>
          <p><strong>Author:</strong> ${record.author_name ? esc(record.author_name) : "Unknown"}</p>
          <p><strong>Crew:</strong> ${esc(record.crew_count)} workers · ${esc(record.work_hours)}h</p>
          <p><strong>Weather:</strong> ${record.weather ? esc(record.weather) : "Not recorded"}</p>
          ${hasSafety ? `<p style="color:red"><strong>Safety Incidents: ${esc(record.safety_incidents)}</strong></p>` : ""}
          ${record.summary ? `<p><strong>Summary:</strong> ${esc(record.summary)}</p>` : ""}
          <p><a href="${esc(SITE_URL)}/build/daily-reports">View in SiteSync →</a></p>
        `,
      };
    }

    case "change_order": {
      return {
        to: payload.recipient_email ?? "",
        subject: `Change Order ${esc(record.co_number)}: ${esc(record.title)} — ${esc(record.status)}`,
        html: `
          <h2>Change Order Update</h2>
          <p><strong>CO #:</strong> ${esc(record.co_number)}</p>
          <p><strong>Title:</strong> ${esc(record.title)}</p>
          <p><strong>Amount:</strong> ${fmtCurrency(record.amount)}</p>
          <p><strong>Days Impact:</strong> ${esc(record.days_impact)} days</p>
          <p><strong>Status:</strong> ${esc(record.status)}</p>
          ${record.reason ? `<p><strong>Reason:</strong> ${esc(record.reason)}</p>` : ""}
          <p><a href="${esc(SITE_URL)}/build/change-orders">View in SiteSync →</a></p>
        `,
      };
    }

    case "work_order_created": {
      return {
        to: payload.recipient_email ?? "",
        subject: `New Work Order ${esc(record.wo_number)}: ${esc(record.title)}`,
        html: `
          <h2>New Work Order</h2>
          <p><strong>WO #:</strong> ${esc(record.wo_number)}</p>
          <p><strong>Title:</strong> ${esc(record.title)}</p>
          <p><strong>Priority:</strong> ${esc(record.priority)}</p>
          ${record.assigned_to ? `<p><strong>Assigned To:</strong> ${esc(record.assigned_to)}</p>` : ""}
          ${record.due_date ? `<p><strong>Due:</strong> ${esc(record.due_date)}</p>` : ""}
          ${record.description ? `<p><strong>Description:</strong> ${esc(record.description)}</p>` : ""}
          <p><a href="${esc(SITE_URL)}/ops/work-orders">View in SiteSync →</a></p>
        `,
      };
    }

    default:
      return null;
  }
}

// ─── Email sender ─────────────────────────────────────────────────────────────

async function sendEmail(email: Email): Promise<void> {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY secret not set");
  if (!email.to) throw new Error("No recipient email address");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email.to,
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": SITE_URL,
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload: NotificationPayload = await req.json();

    if (!payload.type || typeof payload.type !== "string") {
      return new Response(JSON.stringify({ error: "Invalid payload: type is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!payload.record || typeof payload.record !== "object") {
      return new Response(JSON.stringify({ error: "Invalid payload: record is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = buildEmail(payload);

    if (!email) {
      return new Response(JSON.stringify({ skipped: true, reason: `Unknown type: ${payload.type}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If no recipient provided, look up admin emails from profiles
    if (!email.to) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: admins } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("role", ["admin", "super_admin"])
        .limit(10);

      if (!admins?.length) {
        return new Response(JSON.stringify({ skipped: true, reason: "No admin recipients found" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Look up actual email from auth.users via service role
      const { data: authUser } = await supabase.auth.admin.getUserById(admins[0].user_id);
      if (!authUser?.user?.email) {
        return new Response(JSON.stringify({ skipped: true, reason: "Could not resolve admin email" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      email.to = authUser.user.email;
    }

    await sendEmail(email);

    return new Response(JSON.stringify({ sent: true, to: email.to, subject: email.subject }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-notification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
