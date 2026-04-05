/**
 * invite-member — Send a Supabase magic-link invite to a new team member
 * and pre-assign their role in the profiles table upon first sign-in.
 *
 * Setup: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as Supabase secrets.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify caller is admin or super_admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(token);
  if (callerError || !callerUser) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", callerUser.id)
    .single();

  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
    return new Response(JSON.stringify({ error: "Admin role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const { email, role } = body as { email?: string; role?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Valid email required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allowedRoles = [
    "admin", "project_manager", "superintendent", "architect",
    "engineer", "owner", "subcontractor", "lender", "field_staff",
  ];
  const assignedRole = allowedRoles.includes(role ?? "") ? role! : "field_staff";

  // Send invite email via Supabase Auth
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${Deno.env.get("SITE_URL") ?? ""}/login`,
    data: { initial_role: assignedRole },
  });

  if (inviteError) {
    return new Response(JSON.stringify({ error: inviteError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pre-set the role on the auto-created profile row if it already exists
  if (inviteData.user?.id) {
    await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: inviteData.user.id, role: assignedRole }, { onConflict: "user_id" });
  }

  return new Response(JSON.stringify({ success: true, email }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
