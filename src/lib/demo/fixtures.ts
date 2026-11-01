/* eslint-disable @typescript-eslint/no-explicit-any */
// Demo dataset used when SiteSync runs without a Supabase project (and by the visual QA harness).
// Shapes match src/integrations/supabase/types.ts. Dates are relative to "now" so the demo never goes stale.
const DAY = 86_400_000;
const now = Date.now();
const iso = (offsetDays: any) => new Date(now + Number(offsetDays) * DAY).toISOString();
const date = (offsetDays: any) => iso(offsetDays).slice(0, 10);
export const id = (p: string, i: number) => `${p}-0000-4000-8000-${String(i).padStart(12, "0")}`;
export const USER_ID = "u0000000-0000-4000-8000-000000000001";
const base = (p: string, i: number) => ({ id: id(p, i), created_at: iso(-200 + i * 9), updated_at: iso(-i) });

const PROJECTS = [
  ["Harbor Point Tower", "Seattle, WA", "Maya Chen", "On Track", 48_000_000, 31_200_000, 64, -330, 220, "Superstructure", 84],
  ["Riverside Medical Pavilion", "Austin, TX", "Daniel Ortiz", "At Risk", 36_500_000, 29_900_000, 71, -300, 120, "MEP Rough-in", 62],
  ["Cedar Flats Residences", "Denver, CO", "Priya Nair", "On Track", 22_000_000, 9_800_000, 41, -150, 300, "Framing", 45],
  ["North Yard Logistics Hub", "Reno, NV", "Sam Whitaker", "Behind", 18_750_000, 15_400_000, 58, -260, 60, "Envelope", 38],
  ["Lumen Labs Campus", "San Jose, CA", "Elena Rossi", "On Track", 64_000_000, 21_000_000, 28, -90, 480, "Foundations", 120],
  ["Mesa Verde Retail", "Phoenix, AZ", "Jordan Blake", "Complete", 12_400_000, 12_100_000, 100, -420, -20, "Closeout", 0],
  ["Elm Street Adaptive Reuse", "Chicago, IL", "Grace Kim", "At Risk", 15_200_000, 11_900_000, 66, -240, 90, "Interiors", 51],
  ["Bayview School Modernization", "Oakland, CA", "Marcus Lee", "On Track", 27_300_000, 8_100_000, 24, -60, 400, "Demolition", 33],
].map(([name, location, pm, status, budget, spent, progress, s, e, phase, team], i) => ({
  ...base("p", i + 1), name, location, project_manager: pm, status, budget, spent, progress,
  start_date: date(s), end_date: date(e), phase, team_size: team, created_by: null,
}));

const RFI_SUBJECTS = [
  "Curtain wall anchor embed conflict at L12", "Clarify fire damper location, corridor B", "Slab edge detail at balcony transition",
  "Structural steel connection at grid C-4", "Waterproofing termination at podium", "Elevator pit sump pump spec",
  "Rooftop unit curb dimensions", "Door hardware set 14 discrepancy", "Revised grading at north entry", "Sprinkler main routing above ceiling",
];
const RFIS = RFI_SUBJECTS.map((subject, i) => ({
  ...base("r", i + 1), rfi_number: `RFI-${String(140 + i).padStart(3, "0")}`, subject,
  description: "Field team requests clarification before proceeding.",
  status: ["Open", "Open", "Pending", "Answered", "Open", "Closed", "Pending", "Open", "Answered", "Open"][i],
  priority: ["High", "Medium", "High", "Low", "Medium", "Low", "High", "Medium", "Low", "High"][i],
  due_date: date([-3, 2, -1, 5, 0, -10, 6, 9, -6, 1][i]), assigned_to: ["Arcadia Structural", "MEP Partners", "Studio North"][i % 3],
  project_id: PROJECTS[i % 5].id, created_by_user: null,
}));

const PROPERTIES = [
  ["The Meridian", "1200 Pine St, Seattle, WA", "Multifamily", 86_000_000, 5.2, 14.1, 4_470_000, 96, 312, 412_000, 2019],
  ["Granary Row Offices", "88 Mill Ave, Austin, TX", "Office", 54_500_000, 6.1, 11.8, 3_320_000, 88, null, 236_000, 2016],
  ["Lakeshore Commons", "455 Shore Dr, Chicago, IL", "Retail", 31_200_000, 6.8, 12.4, 2_120_000, 93, 42, 128_000, 2012],
  ["Summit Industrial Park", "3 Summit Way, Reno, NV", "Industrial", 44_900_000, 5.9, 15.6, 2_650_000, 100, 8, 610_000, 2021],
  ["Alder House", "71 Alder Ln, Denver, CO", "Multifamily", 39_800_000, 5.5, 13.2, 2_190_000, 91, 168, 198_000, 2018],
  ["Vista Medical Plaza", "900 Vista Blvd, Phoenix, AZ", "Healthcare", 28_600_000, 7.1, 10.9, 2_030_000, 85, 24, 96_000, 2009],
].map(([name, address, property_type, price, cap_rate, irr, noi, occupancy, units, sqft, year_built], i) => ({
  ...base("pr", i + 1), name, address, property_type, price, cap_rate, irr, noi, occupancy, units, sqft, year_built,
  status: ["Stabilized", "Active", "Active", "Stabilized", "Lease-up", "Under Review"][i],
}));

const SUBMITTALS = ["Structural steel shop drawings", "Curtain wall mockup", "Elevator cab finishes", "Roofing membrane", "Light fixtures package", "Fire alarm devices", "Millwork shop drawings", "Concrete mix design"].map((title, i) => ({
  ...base("s", i + 1), submittal_number: `SUB-${String(210 + i)}`, title, spec_section: ["05 12 00", "08 44 13", "14 21 00", "07 54 00", "26 51 00", "28 31 00", "06 41 00", "03 30 00"][i],
  status: ["Approved", "In Review", "Revise and Resubmit", "Submitted", "Approved", "Pending", "In Review", "Approved"][i],
  revision: i % 3, reviewer: ["Studio North", "Arcadia Structural"][i % 2], submitted_by: ["Apex Steel", "Clearview Glazing", "Otis", "Summit Roofing"][i % 4],
  submitted_date: date(-20 + i * 2), due_date: date(-4 + i * 3), description: null, project_id: PROJECTS[i % 4].id,
}));

const CHANGE_ORDERS = ["Added structural bracing at L3", "Owner-requested lobby upgrade", "Unforeseen rock excavation", "MEP reroute at podium", "Value-engineered façade panels", "Additional fire stopping"].map((title, i) => ({
  ...base("co", i + 1), co_number: `CO-${String(31 + i).padStart(3, "0")}`, title, amount: [184_000, 412_500, 96_300, 58_900, -122_000, 33_400][i],
  days_impact: [4, 12, 9, 2, -3, 1][i], status: ["Approved", "Pending", "Approved", "In Review", "Approved", "Rejected"][i],
  category: ["Design", "Owner", "Unforeseen", "Coordination", "VE", "Code"][i], reason: "See attached narrative.", requested_by: "GC", approved_by: i % 2 ? null : "Owner Rep",
  project_id: PROJECTS[i % 4].id,
}));

const DAILY_REPORTS = Array.from({ length: 8 }, (_, i) => ({
  ...base("dr", i + 1), report_number: `DR-${String(400 + i)}`, report_date: date(-i), author_name: ["Maya Chen", "Daniel Ortiz", "Priya Nair"][i % 3],
  author_user: null, crew_count: [42, 38, 51, 29, 46, 33, 40, 44][i], work_hours: [336, 304, 408, 232, 368, 264, 320, 352][i],
  delay_hours: [0, 2, 0, 4, 0, 1, 0, 0][i], safety_incidents: i === 3 ? 1 : 0, weather: ["Clear", "Overcast", "Rain", "Windy", "Clear", "Fog", "Clear", "Partly cloudy"][i],
  temp_high: 68 - i, temp_low: 51 - i, summary: "Deck pour on level 9 completed; curtain wall install continues on east elevation.",
  activities: ["Concrete pour L9", "Curtain wall east", "MEP rough-in L4"], project_id: PROJECTS[i % 4].id,
}));

const BUDGETS = ["Site Work", "Concrete", "Structural Steel", "Envelope", "MEP", "Interiors", "General Conditions", "Contingency"].map((category, i) => ({
  ...base("b", i + 1), category, allocated: [2.1, 6.4, 8.9, 7.2, 11.6, 5.8, 3.4, 2.6][i] * 1e6, spent: [2.0, 5.9, 8.1, 4.4, 7.9, 1.6, 2.7, 0.9][i] * 1e6,
  status: ["On Track", "On Track", "At Risk", "On Track", "On Track", "On Track", "At Risk", "On Track"][i], fiscal_year: "2026", description: null, created_by: null, project_id: PROJECTS[0].id,
}));

const DRAWS = Array.from({ length: 6 }, (_, i) => ({
  ...base("dw", i + 1), draw_number: `DRAW-${String(12 + i)}`, title: `Pay application #${12 + i}`, amount: [1.84, 2.12, 1.67, 2.48, 1.93, 2.31][i] * 1e6,
  status: ["Paid", "Paid", "Approved", "Submitted", "Pending", "Draft"][i], submitted_date: date(-150 + i * 30), requested_by: "Harbor GC", approved_by: i < 3 ? "First Meridian Bank" : null,
  description: null, project_id: PROJECTS[0].id,
}));

const TENANTS = [
  ["Northwind Coffee", "The Meridian", "101", 8_400, "Active"], ["Atlas Legal LLP", "Granary Row Offices", "Suite 400", 42_000, "Active"],
  ["Peak Fitness", "Lakeshore Commons", "B-12", 15_600, "Active"], ["Helios Robotics", "Summit Industrial Park", "Bldg 2", 61_000, "Active"],
  ["Juniper Dental", "Vista Medical Plaza", "210", 9_800, "Expiring"], ["Fable & Co.", "Lakeshore Commons", "A-03", 6_200, "Delinquent"],
  ["Orbit Analytics", "Granary Row Offices", "Suite 220", 18_900, "Pending"],
].map(([tenant_name, property_name, unit, monthly_rent, status], i) => ({
  ...base("t", i + 1), tenant_name, property_name, unit, monthly_rent, status, lease_start: date(-700 + i * 40), lease_end: date(60 + i * 120),
  contact_email: `ops@${String(tenant_name).toLowerCase().replace(/[^a-z]/g, "")}.com`, contact_phone: "(555) 010-12" + i, notes: null,
}));

const WORK_ORDERS = ["HVAC not cooling — unit 1402", "Lobby door closer failure", "Leak at parking level P2", "Replace corridor LED fixtures", "Elevator 3 inspection", "Irrigation controller fault"].map((title, i) => ({
  ...base("wo", i + 1), wo_number: `WO-${String(880 + i)}`, title, priority: ["High", "Medium", "High", "Low", "Medium", "Low"][i],
  status: ["Open", "In Progress", "Open", "Completed", "Scheduled", "Open"][i], category: ["HVAC", "Doors", "Plumbing", "Electrical", "Vertical", "Landscape"][i],
  property_name: PROPERTIES[i % 5].name, unit: ["1402", "Lobby", "P2", "L3", "—", "Grounds"][i], assigned_to: ["CoolAir Svc", "Metro Doors", "BluePipe"][i % 3],
  reported_by: "Property Mgmt", due_date: date(-2 + i * 2), completed_date: i === 3 ? date(-1) : null, description: null,
}));

const DOCUMENTS = ["Architectural Drawings Set — IFC", "Geotechnical Report", "Building Permit #B-22931", "Owner–Contractor Agreement", "MEP Coordination Model", "Safety Plan Rev 3", "Insurance Certificate", "Specifications Vol. 2"].map((title, i) => ({
  ...base("d", i + 1), title, doc_number: `DOC-${String(1000 + i)}`, doc_type: ["Drawing", "Report", "Permit", "Contract", "Model", "Plan", "Certificate", "Specification"][i],
  status: ["Current", "Current", "Approved", "Signed", "In Review", "Current", "Expiring", "Current"][i], version: (i % 4) + 1, file_size: `${(i + 1) * 3.4} MB`,
  file_url: null, uploaded_by: "Maya Chen", description: null, project_id: PROJECTS[i % 4].id,
}));

const LENDERS = [
  ["First Meridian Bank", "Construction Loan", 42_000_000, 27_300_000, "SOFR + 2.75%", 96, "Active"],
  ["Pacific Capital Partners", "Mezzanine", 9_500_000, 6_100_000, "11.0%", 88, "Active"],
  ["Granite Life Insurance", "Permanent Loan", 58_000_000, 0, "5.85%", 100, "Committed"],
  ["Summit Credit Union", "Bridge Loan", 12_000_000, 11_400_000, "SOFR + 3.50%", 74, "Watch"],
].map(([name, loan_type, commitment, drawn, rate, compliance_score, status], i) => ({
  ...base("l", i + 1), name, loan_type, commitment, drawn, rate, compliance_score, status, maturity: date(400 + i * 200), project_id: PROJECTS[i].id,
}));

const TXNS = Array.from({ length: 10 }, (_, i) => ({
  ...base("tx", i + 1), txn_number: `TXN-${String(5000 + i)}`, txn_date: date(-i * 4), txn_type: ["Draw", "Payment", "Retainage", "Transfer", "Payment"][i % 5],
  description: ["Draw #17 funding", "Apex Steel — progress payment", "Retainage release — concrete", "Interest reserve transfer", "Clearview Glazing — deposit"][i % 5],
  account: ["Construction", "Operating", "Escrow"][i % 3], debit: i % 2 ? [412_000, 96_000, 1_240_000][i % 3] : null, credit: i % 2 ? null : [1_930_000, 250_000, 610_000][i % 3],
  status: ["Approved", "Pending", "Completed", "Approved", "Pending Approval"][i % 5], project_name: PROJECTS[i % 4].name, requestor: ["Maya Chen", "Daniel Ortiz"][i % 2],
}));

const COMPLIANCE = ["Building permit renewal", "Stormwater (SWPPP) inspection", "OSHA 30 certification — site leads", "Elevator certificate of operation", "Fire marshal pre-occupancy walk", "ADA accessibility review"].map((requirement, i) => ({
  ...base("ci", i + 1), requirement, category: ["Permits", "Environmental", "Safety", "Inspections", "Fire", "Accessibility"][i],
  status: ["Compliant", "Pending", "Compliant", "Expiring", "Scheduled", "Non-Compliant"][i], due_date: date(-5 + i * 9), last_checked: date(-10 + i),
  assignee: ["Grace Kim", "Sam Whitaker", "Maya Chen"][i % 3], project_id: PROJECTS[i % 4].id,
}));

const AGENTS = [
  ["binary-loom", "Binary Loom", "reporting", "supervised", "Compiles owner reports and summaries from field data."],
  ["quantum-ledger", "Quantum Ledger", "finance", "approval_required", "Monitors budgets, draws and cost variance."],
  ["schedule-oracle", "Schedule Oracle", "scheduling", "autonomous", "Forecasts critical path slippage."],
  ["safety-sentinel", "Safety Sentinel", "safety", "supervised", "Scans daily reports for safety signals."],
  ["rfi-router", "RFI Router", "coordination", "autonomous", "Routes and nudges RFIs to the right reviewer."],
  ["clash-scout", "Clash Scout", "bim", "supervised", "Detects MEP/structural clashes in federated models."],
].map(([agent_id, name, agent_type, autonomy_level, description], i) => ({
  ...base("ag", i + 1), agent_id, name, agent_type, autonomy_level, description, is_active: i !== 5, routing_logic: null, configuration: {},
  metrics: { executions: 1200 - i * 140, success_rate: 0.97 - i * 0.02, avg_latency_ms: 800 + i * 150 },
}));

const EXECUTIONS = Array.from({ length: 12 }, (_, i) => ({
  ...base("ex", i + 1), execution_id: `exec-${1000 + i}`, agent_id: AGENTS[i % 6].agent_id, event_type: ["rfi.created", "draw.submitted", "report.daily", "co.requested"][i % 4],
  status: ["completed", "completed", "pending_approval", "completed", "failed", "running"][i % 6], confidence_score: 0.72 + (i % 5) * 0.05, duration_ms: 600 + i * 120,
  requires_approval: i % 3 === 0, approval_status: i % 3 === 0 ? "pending" : null, reasoning: "Matched routing policy and confidence threshold.", risk_flags: i % 4 === 0 ? ["budget_variance"] : [],
  input_data: {}, output_data: {}, pipeline_id: null, pipeline_position: null, approved_by: null, approval_feedback: null, escalated_to: null,
}));

const CONTROLS = ["Access control review", "Change management", "Audit logging", "Data retention", "Human-in-the-loop approvals", "Model output monitoring"].map((title, i) => ({
  ...base("cc", i + 1), control_ref: `CC${6 + i}.${i + 1}`, title, framework: ["SOC 2", "SOC 2", "ISO 27001", "SOC 2", "NIST AI RMF", "NIST AI RMF"][i],
  category: ["Security", "Change", "Monitoring", "Privacy", "Governance", "Monitoring"][i], description: null, applies_to: ["all"],
}));
const MAPPINGS = CONTROLS.flatMap((c, i) => AGENTS.slice(0, 3).map((a, j) => ({
  ...base("m", i * 3 + j + 1), control_id: c.id, agent_id: a.agent_id, status: ["implemented", "in_progress", "not_started", "implemented"][(i + j) % 4],
  is_required: true, evidence: null, notes: null, owner: "Grace Kim", last_reviewed: date(-i * 7),
})));

const PUNCH = [
  ["Touch-up paint at L4 corridor", "Finishes", "Completed"], ["Missing cover plate, room 312", "Electrical", "Open"],
  ["Adjust door closer, stair B", "Doors", "In Progress"], ["Caulk gap at storefront mullion", "Glazing", "Open"],
  ["Replace cracked tile, lobby restroom", "Finishes", "Completed"], ["Label breaker panel 2A", "Electrical", "Completed"],
  ["Ceiling tile stain, suite 220", "Finishes", "Open"], ["Sprinkler escutcheon missing, L6", "Fire Protection", "Completed"],
].map(([title, trade, status], i) => ({
  ...base("pl", i + 1), wo_number: `PL-${String(301 + i)}`, title, category: "Punch List", priority: ["Low", "Medium", "Medium", "High"][i % 4],
  status, property_name: PROJECTS[i % 3].name, unit: `L${(i % 6) + 1}`, assigned_to: ({ Finishes: "Pro Finish Co.", Electrical: "Volt Electric", Doors: "Metro Doors", Glazing: "Clearview Glazing", "Fire Protection": "Guardian Fire" } as Record<string, string>)[trade as string],
  reported_by: "Owner walk", due_date: date(-3 + i * 2), completed_date: status === "Completed" ? date(-1 - i) : null, description: trade,
}));

const TXN_EXTRA = [
  ["Milestone", "Topping-out milestone release", 2_400_000, "Released"], ["Milestone", "Envelope dry-in milestone", 1_850_000, "Pending"],
  ["Milestone", "Substantial completion — retainage", 3_100_000, "Scheduled"], ["Approval", "Change order CO-032 funding", 412_500, "Pending"],
  ["Approval", "Curtain wall deposit — Clearview", 286_000, "Pending"],
].map(([txn_type, description, amt, status], i) => ({
  ...base("txm", i + 1), txn_number: `TXN-${String(5100 + i)}`, txn_date: date(-10 + i * 12), txn_type, description, account: "Construction",
  debit: txn_type === "Approval" ? amt : null, credit: txn_type === "Milestone" ? amt : null, status, project_name: PROJECTS[i % 3].name, requestor: "Maya Chen",
}));

const AUDIT = [
  ["UPDATE", "projects", PROJECTS[1].id, { status: "On Track", progress: 68 }, { status: "At Risk", progress: 71 }],
  ["INSERT", "rfis", RFIS[0].id, null, { rfi_number: "RFI-140", subject: RFIS[0].subject, priority: "High" }],
  ["UPDATE", "change_orders", CHANGE_ORDERS[1].id, { status: "Draft" }, { status: "Pending" }],
  ["UPDATE", "draw_requests", DRAWS[2].id, { status: "Submitted" }, { status: "Approved", approved_by: "First Meridian Bank" }],
  ["DELETE", "documents", "d-legacy-0042", { title: "Superseded spec Vol. 1" }, null],
  ["INSERT", "daily_reports", DAILY_REPORTS[0].id, null, { report_number: "DR-400", crew_count: 42 }],
  ["UPDATE", "tenants", TENANTS[4].id, { status: "Active" }, { status: "Expiring" }],
  ["UPDATE", "budgets", BUDGETS[2].id, { spent: 7_600_000 }, { spent: 8_100_000 }],
].map(([action, table_name, record_id, old_values, new_values], i) => ({
  id: id("al", i + 1), user_id: USER_ID, action, table_name, record_id, old_values, new_values,
  ip_address: "10.0.4.12", user_agent: "SiteSync OS", created_at: iso(-i * 0.4),
}));

export const PROFILE: Record<string, any> = { id: id("pf", 1), user_id: USER_ID, display_name: "Jordan Reyes", role: "admin", avatar_url: null, created_at: iso(-300), updated_at: iso(-1) };

const ROOM_SETS = [
  [["Living", "living", 0, 0, 7, 5], ["Kitchen", "kitchen", 7, 0, 4, 5], ["Bedroom 1", "bedroom", 0, 5, 5, 4], ["Bath", "bath", 5, 5, 2, 4], ["Bedroom 2", "bedroom", 7, 5, 4, 4]],
  [["Open Office", "office", 0, 0, 8, 6], ["Meeting", "meeting", 8, 0, 3, 3], ["Phone", "office", 8, 3, 3, 3], ["Lobby", "lobby", 0, 6, 5, 3], ["Core", "core", 5, 6, 6, 3]],
  [["Retail A", "retail", 0, 0, 5, 6], ["Retail B", "retail", 5, 0, 6, 6], ["Back of House", "service", 0, 6, 7, 3], ["Restrooms", "bath", 7, 6, 4, 3]],
] as const;

/** Build a floor-plan layout in the shape FloorPlanVariant.layout_json expects. */
export function demoLayout(set: number, scale = 1) {
  const rooms = ROOM_SETS[set % ROOM_SETS.length].map(([name, type, x, y, w, h]) => ({
    name, type, x: x * scale, y: y * scale, width: w * scale, height: h * scale, area: Math.round(w * h * scale * scale * 10.76),
  }));
  const W = Math.max(...rooms.map((r) => r.x + r.width));
  const H = Math.max(...rooms.map((r) => r.y + r.height));
  const walls = rooms.flatMap((r) => [
    { x1: r.x, y1: r.y, x2: r.x + r.width, y2: r.y }, { x1: r.x + r.width, y1: r.y, x2: r.x + r.width, y2: r.y + r.height },
    { x1: r.x, y1: r.y + r.height, x2: r.x + r.width, y2: r.y + r.height }, { x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.height },
  ]);
  const total = rooms.reduce((s, r) => s + r.area, 0);
  return {
    layout_json: { rooms, walls, dimensions: { total_width: W, total_height: H } },
    metrics: { total_area: total, efficiency_ratio: Math.round((0.78 + (set % 3) * 0.05) * 100) / 100, room_count: rooms.length },
  };
}

const VARIANTS = ["Option A — efficient core", "Option B — open plan", "Option C — retail podium"].map((variant_name, i) => ({
  id: id("fv", i + 1), project_id: PROJECTS[0].id, blender_job_id: null, variant_number: i + 1, variant_name,
  status: ["approved", "draft", "draft"][i], approved_by: i === 0 ? USER_ID : null, approved_at: i === 0 ? iso(-3) : null,
  notes: null, created_at: iso(-6 + i), ...demoLayout(i, 1 + (i % 2) * 0.2),
}));

const TEAM = [
  ["Maya Chen", "project_manager"], ["Daniel Ortiz", "superintendent"], ["Priya Nair", "architect"],
  ["Sam Whitaker", "engineer"], ["Grace Kim", "owner"], ["Marcus Lee", "field_staff"],
].map(([display_name, role], i) => ({
  id: id("pf", i + 2), user_id: `u0000000-0000-4000-8000-${String(i + 2).padStart(12, "0")}`, display_name, role, avatar_url: null,
  created_at: iso(-280 + i * 30), updated_at: iso(-i),
}));

export const FIXTURES: Record<string, Record<string, any>[]> = {
  projects: PROJECTS, rfis: RFIS, properties: PROPERTIES, submittals: SUBMITTALS, change_orders: CHANGE_ORDERS,
  daily_reports: DAILY_REPORTS, budgets: BUDGETS, draw_requests: DRAWS, tenants: TENANTS, work_orders: [...WORK_ORDERS, ...PUNCH],
  documents: DOCUMENTS, audit_logs: AUDIT, blender_jobs: [], generated_models: [], floor_plan_variants: VARIANTS, lenders: LENDERS, treasury_transactions: [...TXNS, ...TXN_EXTRA], compliance_items: COMPLIANCE, ai_agents: AGENTS,
  agent_executions: EXECUTIONS, compliance_controls: CONTROLS, agent_control_mappings: MAPPINGS, profiles: [PROFILE, ...TEAM],
  user_roles: [{ id: id("ur", 1), user_id: USER_ID, role: "admin" }, ...TEAM.map((t, i) => ({ id: id("ur", i + 2), user_id: t.user_id, role: t.role }))], agent_decisions: [], agent_learning_signals: [], submittal_files: [],
};
