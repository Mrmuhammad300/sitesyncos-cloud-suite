import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, provider = "lovable" } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let contextData = "";
    let systemPrompt = "";

    if (type === "daily-report-summary") {
      const { data: reports } = await supabase
        .from("daily_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(10);

      contextData = JSON.stringify(reports ?? []);
      systemPrompt = `You are Binary Loom, an AI construction intelligence agent for BuildOS SiteSync.
Analyze these daily reports and provide:
1. **Executive Summary** — 2-3 sentence overview of recent field activity
2. **Safety Alert** — Flag any safety incidents or concerning patterns
3. **Productivity Insights** — Crew utilization, delay patterns, weather impacts
4. **Recommendations** — Actionable next steps
Be concise and data-driven. Use bullet points.`;

    } else if (type === "budget-monitor") {
      const { data: budgets } = await supabase.from("budgets").select("*");
      const { data: projects } = await supabase.from("projects").select("name, budget, spent");
      const { data: changeOrders } = await supabase.from("change_orders").select("amount, status, title");

      contextData = JSON.stringify({ budgets, projects, changeOrders });
      systemPrompt = `You are Quantum Ledger, an AI financial monitoring agent for BuildOS SiteSync.
Analyze budget data and flag:
1. **🚨 Budget Overruns** — Any category where spent > 85% of allocated (CRITICAL if > 95%)
2. **⚠️ Risk Forecast** — Project burn rate trends that suggest future overruns
3. **📊 Change Order Impact** — Net cost impact from approved/pending change orders
4. **💡 Cost Optimization** — Specific savings opportunities
Be precise with dollar amounts and percentages. Flag severity levels.`;

    } else if (type === "project-health") {
      const { data: projects } = await supabase.from("projects").select("*");
      const { data: rfis } = await supabase.from("rfis").select("status, priority, created_at");
      const { data: submittals } = await supabase.from("submittals").select("status, created_at");

      contextData = JSON.stringify({ projects, rfis, submittals });
      systemPrompt = `You are Binary Loom, an AI construction intelligence agent.
Provide a project health assessment:
1. **Overall Health Score** — Rate each project (Green/Yellow/Red)
2. **RFI Bottlenecks** — Open high-priority RFIs that need attention
3. **Submittal Velocity** — Review turnaround trends
4. **Schedule Risk** — Projects behind schedule or at risk
Be actionable and specific.`;

    } else {
      return new Response(JSON.stringify({ error: "Unknown insight type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = `Analyze this data and provide insights:\n\n${contextData}`;

    // Route to the appropriate AI provider
    let aiResponse: string;

    if (provider === "claude") {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Claude API error:", resp.status, errText);
        throw new Error(`Claude API error: ${resp.status}`);
      }

      const data = await resp.json();
      aiResponse = data.content?.[0]?.text ?? "No response from Claude";

    } else {
      // Default: Lovable AI (GPT-5 / Gemini)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited — please try again shortly" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted — add funds in Settings > Workspace > Usage" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await resp.text();
        console.error("Lovable AI error:", resp.status, errText);
        throw new Error(`AI gateway error: ${resp.status}`);
      }

      const data = await resp.json();
      aiResponse = data.choices?.[0]?.message?.content ?? "No response";
    }

    return new Response(JSON.stringify({ insight: aiResponse, provider, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
