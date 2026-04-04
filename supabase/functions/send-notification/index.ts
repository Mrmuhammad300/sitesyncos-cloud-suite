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

function buildEmail(payload: NotificationPayload): Email | null {
  const { type, record } = payload;

  switch (type) {
    case "rfi_created":
      return {
        to: payload.recipient_email ?? "",
        subject: `New RFI: ${record.rfi_number} — ${record.subject}`,
        html: `
          <h2>New RFI Submitted</h2>
          <p><strong>RFI #:</strong> ${record.rfi_number}</p>
          <p><strong>Subject:</strong> ${record.subject}</p>
          <p><strong>Priority:</strong> ${record.priority}</p>
          <p><strong>Due:</strong> ${record.due_date ?? "Not set"}</p>
          <p><a href="${SITE_URL}/build/rfis">View in SiteSync →</a></p>
        `,
      };

    case "draw_approved":
    case "draw_rejected": {
      const status = type === "draw_approved" ? "Approved ✅" : "Rejected ❌";
      return {
        to: payload.recipient_email ?? "",
        subject: `Draw Request ${status}: ${record.draw_number}`,
        html: `
          <h2>Draw Request ${status}</h2>
          <p><strong>Draw #:</strong> ${record.draw_number}</p>
          <p><strong>Amount:</strong> $${Number(record.amount_requested).toLocaleString()}</p>
          <p><strong>Status:</strong> ${record.status}</p>
          <p><a href="${SITE_URL}/ops/draws">View in SiteSync →</a></p>
        `,
      };
    }

    case "daily_report": {
      const hasSafety = Number(record.safety_incidents) > 0;
      return {
        to: payload.recipient_email ?? "",
        subject: hasSafety
          ? `⚠️ Safety Incident Reported — ${record.report_date}`
          : `Daily Report Filed — ${record.report_date}`,
        html: `
          <h2>Daily Report: ${record.report_number}</h2>
          <p><strong>Date:</strong> ${record.report_date}</p>
          <p><strong>Author:</strong> ${record.author_name ?? "Unknown"}</p>
          <p><strong>Crew:</strong> ${record.crew_count} workers · ${record.work_hours}h</p>
          <p><strong>Weather:</strong> ${record.weather ?? "Not recorded"}</p>
          ${hasSafety ? `<p style="color:red"><strong>Safety Incidents: ${record.safety_incidents}</strong></p>` : ""}
          <p><a href="${SITE_URL}/build/daily-reports">View in SiteSync →</a></p>
        `,
      };
    }

    case "change_order": {
      return {
        to: payload.recipient_email ?? "",
        subject: `Change Order ${record.co_number}: ${record.title} — ${record.status}`,
        html: `
          <h2>Change Order Update</h2>
          <p><strong>CO #:</strong> ${record.co_number}</p>
          <p><strong>Title:</strong> ${record.title}</p>
          <p><strong>Amount:</strong> $${Number(record.amount).toLocaleString()}</p>
          <p><strong>Status:</strong> ${record.status}</p>
          <p><a href="${SITE_URL}/build/change-orders">View in SiteSync →</a></p>
        `,
      };
    }

    default:
      return null;
  }
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const payload: NotificationPayload = await req.json();
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
        .select("user_id")
        .in("role", ["admin", "super_admin"]);

      if (!admins?.length) {
        return new Response(JSON.stringify({ skipped: true, reason: "No admin recipients found" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Send to first admin for now (extend to loop over all admins as needed)
      email.to = `${admins[0].user_id}@placeholder.com`; // replace with actual email lookup
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
