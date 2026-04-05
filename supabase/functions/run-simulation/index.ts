/**
 * run-simulation — AI Scenario Simulator edge function
 *
 * Accepts scenario parameters, queries real project data from the DB,
 * and returns calibrated cost/schedule/risk estimates based on actual
 * portfolio averages rather than hardcoded constants.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimulationRequest {
  laborChange: number;    // % change in labor cost  (-30 to +30)
  materialChange: number; // % change in material cost (-30 to +30)
  weatherDelay: number;   // additional delay days (0 to 30)
  scenario: "baseline" | "optimistic" | "pessimistic" | "supply_shock";
}

interface SimulationResult {
  costImpact: number;
  scheduleImpact: number;
  riskScore: number;
  confidence: number;
  baseBudget: number;
  dataPoints: number;
}

const SCENARIO_MULTIPLIERS: Record<string, { cost: number; schedule: number; risk: number }> = {
  baseline:     { cost: 1.0,  schedule: 1.0,  risk: 1.0  },
  optimistic:   { cost: 0.85, schedule: 0.80, risk: 0.70 },
  pessimistic:  { cost: 1.30, schedule: 1.40, risk: 1.50 },
  supply_shock: { cost: 1.60, schedule: 1.25, risk: 1.80 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SimulationRequest = await req.json();
    const { laborChange = 0, materialChange = 0, weatherDelay = 0, scenario = "baseline" } = body;

    // ── Query real project data for calibration ──
    const { data: projects } = await supabase
      .from("projects")
      .select("budget, spent, status")
      .not("budget", "is", null)
      .limit(500);

    const { data: budgets } = await supabase
      .from("budgets")
      .select("allocated, spent, status")
      .limit(500);

    const { data: changeOrders } = await supabase
      .from("change_orders")
      .select("amount, days_impact")
      .not("amount", "is", null)
      .limit(500);

    // ── Compute portfolio statistics ──
    const projectList = projects ?? [];
    const budgetList = budgets ?? [];
    const coList = changeOrders ?? [];

    const totalBudget = projectList.reduce((s, p) => s + Number(p.budget ?? 0), 0);
    const avgBudget = projectList.length > 0 ? totalBudget / projectList.length : 500_000;

    const avgSpendRate = projectList.length > 0
      ? projectList.reduce((s, p) => s + Number(p.spent ?? 0), 0) / Math.max(totalBudget, 1)
      : 0.65;

    const avgOverrun = budgetList.length > 0
      ? budgetList.filter(b => Number(b.spent) > Number(b.allocated)).length / budgetList.length
      : 0.20;

    const avgCOAmount = coList.length > 0
      ? coList.reduce((s, c) => s + Number(c.amount ?? 0), 0) / coList.length
      : 15_000;

    const avgCODays = coList.length > 0
      ? coList.reduce((s, c) => s + Number(c.days_impact ?? 0), 0) / coList.length
      : 5;

    const dataPoints = projectList.length + budgetList.length + coList.length;

    // ── Scenario multiplier ──
    const mult = SCENARIO_MULTIPLIERS[scenario] ?? SCENARIO_MULTIPLIERS.baseline;

    // ── Cost impact calculation ──
    // Labor is ~42% of construction cost, materials ~28% (industry standard ratios)
    const laborImpact   = (laborChange   / 100) * 0.42 * avgBudget * avgSpendRate;
    const materialImpact = (materialChange / 100) * 0.28 * avgBudget * avgSpendRate;
    const baseCostImpact = (laborImpact + materialImpact) * mult.cost;

    // Historical CO average adjusts estimate upward if portfolio has high overrun rate
    const overrunAdjustment = avgOverrun > 0.25 ? avgCOAmount * 0.5 : 0;
    const costImpact = Math.round(baseCostImpact + overrunAdjustment);

    // ── Schedule impact calculation ──
    // Each % labor change adds 0.3 days; weather delay compounds via critical-path factor
    const laborSchedule   = Math.abs(laborChange) * 0.3;
    const weatherSchedule = weatherDelay * 1.5;
    const coScheduleAdj   = avgCODays * (Math.abs(laborChange) / 30);
    const scheduleImpact  = Math.round((laborSchedule + weatherSchedule + coScheduleAdj) * mult.schedule);

    // ── Risk score (0–100) ──
    const baseRisk = 30
      + Math.abs(laborChange) * 0.8
      + Math.abs(materialChange) * 0.6
      + weatherDelay * 1.8
      + (avgOverrun * 20);
    const riskScore = Math.min(100, Math.max(0, Math.round(baseRisk * mult.risk)));

    // ── Confidence: decreases as variance increases and as inputs deviate from baseline ──
    const inputVariance = Math.abs(laborChange) + Math.abs(materialChange) + weatherDelay;
    const baseConfidence = 90
      - inputVariance * 0.4
      - (dataPoints < 10 ? 15 : 0); // lower confidence if portfolio is thin
    const confidence = Math.min(97, Math.max(50, Math.round(baseConfidence)));

    const result: SimulationResult = {
      costImpact,
      scheduleImpact,
      riskScore,
      confidence,
      baseBudget: Math.round(avgBudget),
      dataPoints,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
