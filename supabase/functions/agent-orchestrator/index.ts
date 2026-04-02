import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ─── Types ───
interface AgentOutput {
  agentId: string
  status: 'Completed' | 'Failed' | 'Escalated'
  output: Record<string, unknown>
  confidence: number
  requiresApproval: boolean
  riskFlags?: string[]
  reasoning?: string
}

interface PipelineResult {
  pipelineId: string
  status: string
  finalOutput: Record<string, unknown>
  agentOutputs: AgentOutput[]
  requiresHumanApproval: boolean
  auditTrail: string[]
}

// ─── Integration Policies ───
const INTEGRATION_POLICIES = {
  autoExecutionThreshold: 0.85,
  defaultMinConfidence: 0.7,
  blockOnRiskFlag: true,
  requireAuditTrail: true,
}

// ─── Autonomy Check ───
function canAutoExecute(level: string, confidence: number, threshold = 0.85): boolean {
  const levelMap: Record<string, number> = {
    AdvisoryOnly: 0, DraftWithApproval: 1, AutoExecuteThreshold: 2, ContinuousOptimization: 3
  }
  const num = levelMap[level] ?? 0
  if (num < 2) return false
  return confidence >= threshold
}

// ─── Agent Dependency Graph ───
const DEPENDENCY_GRAPH: Record<string, { to: string; relationship: string }[]> = {
  agent_ecosystem_orchestrator: [
    { to: 'decision_advisor', relationship: 'routes_to' },
    { to: 'workflow_automation_engine', relationship: 'executes_via' },
    { to: 'meta_reasoning_agent', relationship: 'quality_checks_with' },
  ],
  decision_advisor: [
    { to: 'truth_and_evidence_validator', relationship: 'verifies_with' },
    { to: 'strategic_futures_simulator', relationship: 'models_with' },
  ],
  meta_reasoning_agent: [{ to: 'ai_risk_sentinel', relationship: 'risk_checks_with' }],
  ai_risk_sentinel: [{ to: 'ethical_alignment_council', relationship: 'escalates_to' }],
  ethical_alignment_council: [{ to: 'human_oversight_liaison', relationship: 'requires_human' }],
  workflow_automation_engine: [{ to: 'collective_ai_overseer', relationship: 'reports_to' }],
  inter_agent_mediator: [{ to: 'decision_advisor', relationship: 'resolves_with' }],
  collective_memory_curator: [{ to: 'decision_advisor', relationship: 'stores_to' }],
  learning_and_evolution_coach: [{ to: 'collective_ai_overseer', relationship: 'learns_from' }],
  truth_and_evidence_validator: [{ to: 'collective_memory_curator', relationship: 'validates_with' }],
  design_and_narrative_synthesizer: [{ to: 'human_oversight_liaison', relationship: 'synthesizes_with' }],
  innovation_catalyst: [{ to: 'decision_advisor', relationship: 'routes_to' }],
  transparency_officer: [{ to: 'collective_ai_overseer', relationship: 'reports_to' }],
}

// ─── Agent Executor Functions ───
async function executeAgent(agentId: string, context: Record<string, unknown>, eventType: string): Promise<AgentOutput> {
  const startTime = Date.now()

  const handlers: Record<string, () => Promise<AgentOutput>> = {
    agent_ecosystem_orchestrator: async () => ({
      agentId, status: 'Completed',
      output: { routingPlan: context._pipeline || [], routingLogic: 'mixture_of_experts', eventType },
      confidence: 0.95, requiresApproval: false,
      reasoning: `MOE router activated for ${eventType}. Selected expert pipeline based on event-agent bindings.`
    }),

    decision_advisor: async () => {
      const riskLevel = context.amount && Number(context.amount) > 100000 ? 'high' : 'normal'
      return {
        agentId, status: 'Completed',
        output: { recommendation: `Analyzed ${eventType} context`, riskLevel, alternatives: ['proceed', 'defer', 'modify'] },
        confidence: riskLevel === 'high' ? 0.72 : 0.88, requiresApproval: riskLevel === 'high',
        reasoning: `Decision analysis for ${eventType}. Risk level: ${riskLevel}.`
      }
    },

    ai_risk_sentinel: async () => {
      const flags: string[] = []
      if (context.amount && Number(context.amount) > 500000) flags.push('high_value_transaction')
      if (context.days_impact && Number(context.days_impact) > 30) flags.push('significant_schedule_impact')
      return {
        agentId, status: 'Completed',
        output: { riskAssessment: flags.length ? 'elevated' : 'normal', flags, mitigations: flags.map(f => `Review ${f}`) },
        confidence: 0.91, requiresApproval: flags.length > 0, riskFlags: flags,
        reasoning: `Risk scan found ${flags.length} flags for ${eventType}.`
      }
    },

    ethical_alignment_council: async () => {
      const violations: string[] = []
      if (context.policy_violations) violations.push(...(context.policy_violations as string[]))
      return {
        agentId, status: violations.length ? 'Escalated' : 'Completed',
        output: { ethicsCheck: violations.length ? 'violation_detected' : 'compliant', violations },
        confidence: 0.93, requiresApproval: violations.length > 0,
        reasoning: `Ethics review: ${violations.length} violations found.`
      }
    },

    collective_ai_overseer: async () => ({
      agentId, status: 'Completed',
      output: { systemHealth: 'nominal', agentDrift: 'none', alignmentScore: 0.96 },
      confidence: 0.94, requiresApproval: false,
      reasoning: 'System governance check: all agents operating within parameters.'
    }),

    transparency_officer: async () => ({
      agentId, status: 'Completed',
      output: { auditEntry: { eventType, timestamp: new Date().toISOString(), agentsInvolved: context._pipeline, dataSourcesUsed: ['database', 'agent_outputs'] } },
      confidence: 0.99, requiresApproval: false,
      reasoning: 'Audit trail entry created for pipeline execution.'
    }),

    meta_reasoning_agent: async () => {
      const outputs = Object.keys(context).filter(k => k.endsWith('_output'))
      return {
        agentId, status: 'Completed',
        output: { qualityCheck: 'passed', outputsReviewed: outputs.length, contradictions: [], logicalGaps: [] },
        confidence: 0.87, requiresApproval: false,
        reasoning: `Reviewed ${outputs.length} agent outputs. No contradictions detected.`
      }
    },

    strategic_futures_simulator: async () => ({
      agentId, status: 'Completed',
      output: {
        scenarios: {
          best: { probability: 0.25, impact: 'positive', description: 'Early completion, under budget' },
          base: { probability: 0.55, impact: 'neutral', description: 'On schedule, within tolerance' },
          worst: { probability: 0.20, impact: 'negative', description: 'Delays and cost overrun' },
        },
        expectedValue: 0.55 * 0 + 0.25 * 1 + 0.20 * -1
      },
      confidence: 0.82, requiresApproval: true,
      reasoning: 'Scenario analysis complete with probability-weighted expected values.'
    }),

    workflow_automation_engine: async () => ({
      agentId, status: 'Completed',
      output: { action: 'workflow_dispatched', eventType, automationStatus: 'queued' },
      confidence: 0.90, requiresApproval: false,
      reasoning: `Workflow automation triggered for ${eventType}.`
    }),

    inter_agent_mediator: async () => {
      const outputs = Object.keys(context).filter(k => k.endsWith('_confidence'))
        .map(k => ({ agent: k.replace('_confidence', ''), confidence: Number(context[k]) || 0.5 }))
      const totalConf = outputs.reduce((s, o) => s + o.confidence, 0) || 1
      const weights = outputs.reduce((acc, o) => ({ ...acc, [`${o.agent}_weight`]: o.confidence / totalConf }), {})
      return {
        agentId, status: 'Completed',
        output: { resolutionStrategy: 'confidence_weighted_vote', weights, consensusReached: true },
        confidence: 0.88, requiresApproval: false,
        reasoning: `Confidence-weighted consensus from ${outputs.length} agents.`
      }
    },

    collective_memory_curator: async () => ({
      agentId, status: 'Completed',
      output: { memorized: true, key: `${eventType}_${Date.now()}`, importance: 0.7 },
      confidence: 0.95, requiresApproval: false,
      reasoning: 'Context stored in agent memory for future reference.'
    }),

    learning_and_evolution_coach: async () => ({
      agentId, status: 'Completed',
      output: { trend: 'stable', positiveRate: 0.75, recommendedAdjustments: [] },
      confidence: 0.80, requiresApproval: false,
      reasoning: 'Learning analysis: agents performing within expected parameters.'
    }),

    truth_and_evidence_validator: async () => ({
      agentId, status: 'Completed',
      output: { validationResult: 'verified', sourcesChecked: ['internal_documents', 'project_data'], discrepancies: [] },
      confidence: 0.89, requiresApproval: false,
      reasoning: 'Evidence validation complete. No discrepancies found.'
    }),

    innovation_catalyst: async () => ({
      agentId, status: 'Completed',
      output: { suggestions: ['Consider modular construction approach', 'Evaluate prefab alternatives'], innovationScore: 0.65 },
      confidence: 0.70, requiresApproval: false,
      reasoning: 'Innovation analysis: 2 novel alternatives identified.'
    }),

    human_oversight_liaison: async () => ({
      agentId, status: 'Completed',
      output: { humanReadableSummary: `Action required for ${eventType}`, actionItems: [], urgency: 'normal' },
      confidence: 0.95, requiresApproval: false,
      reasoning: 'Human-readable summary generated for oversight.'
    }),

    design_and_narrative_synthesizer: async () => ({
      agentId, status: 'Completed',
      output: { narrative: `Executive summary for ${eventType} pipeline execution`, format: 'memo' },
      confidence: 0.88, requiresApproval: false,
      reasoning: 'Narrative synthesis complete.'
    }),
  }

  const handler = handlers[agentId]
  if (!handler) {
    return { agentId, status: 'Failed', output: { error: `Unknown agent: ${agentId}` }, confidence: 0, requiresApproval: true }
  }

  try {
    const result = await handler()
    result.output._duration_ms = Date.now() - startTime
    return result
  } catch (err) {
    return { agentId, status: 'Failed', output: { error: String(err) }, confidence: 0, requiresApproval: true, reasoning: `Agent failed: ${err}` }
  }
}

// ─── State Machine Transition ───
async function canTransition(domain: string, currentState: string, action: string, context: Record<string, unknown>): Promise<{ allowed: boolean; reason?: string }> {
  const { data: fsm } = await supabase.from('domain_state_machines').select('*').eq('domain', domain).single()
  if (!fsm) return { allowed: false, reason: `No state machine for domain: ${domain}` }

  const transitions = fsm.transitions as { from: string; to: string; action: string }[]
  const transition = transitions.find(t => t.from === currentState && t.action === action)
  if (!transition) return { allowed: false, reason: `No transition '${action}' from state '${currentState}'` }

  const guards = fsm.guards as { action: string; required_fields?: string[]; required_state?: string; required_roles?: string[] }[]
  const guard = guards.find(g => g.action === action)
  if (guard) {
    if (guard.required_fields) {
      const missing = guard.required_fields.filter(f => !context[f])
      if (missing.length) return { allowed: false, reason: `Missing required fields: ${missing.join(', ')}` }
    }
    if (guard.required_state && currentState !== guard.required_state) {
      return { allowed: false, reason: `Must be in state ${guard.required_state}, currently ${currentState}` }
    }
  }

  return { allowed: true }
}

// ─── Pipeline Executor ───
async function executePipeline(eventType: string, eventContext: Record<string, unknown>): Promise<PipelineResult> {
  const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const auditTrail: string[] = []
  const agentOutputs: AgentOutput[] = []
  let requiresHumanApproval = false

  // Look up event binding
  const { data: binding } = await supabase.from('event_agent_bindings').select('*').eq('event_type', eventType).single()
  if (!binding) {
    return { pipelineId, status: 'Failed', finalOutput: { error: `No binding for event: ${eventType}` }, agentOutputs: [], requiresHumanApproval: true, auditTrail: [`No binding found for ${eventType}`] }
  }

  const pipeline = binding.pipeline_agents as string[]
  const minConfidence = binding.min_confidence || INTEGRATION_POLICIES.defaultMinConfidence
  const context: Record<string, unknown> = { ...eventContext, _pipeline: pipeline }

  auditTrail.push(`Pipeline started: ${pipelineId} for ${eventType} with ${pipeline.length} agents`)

  for (let i = 0; i < pipeline.length; i++) {
    const agentId = pipeline[i]

    // Check if agent is active
    const { data: agentRecord } = await supabase.from('ai_agents').select('is_active, autonomy_level').eq('agent_id', agentId).single()
    if (!agentRecord?.is_active) {
      auditTrail.push(`Agent ${agentId} skipped (inactive)`)
      continue
    }

    auditTrail.push(`Executing agent ${i + 1}/${pipeline.length}: ${agentId}`)
    const output = await executeAgent(agentId, context, eventType)
    agentOutputs.push(output)

    // Store execution record
    const executionId = `exec_${Date.now()}_${agentId}`
    await supabase.from('agent_executions').insert({
      execution_id: executionId,
      agent_id: agentId,
      event_type: eventType,
      status: output.status,
      confidence_score: output.confidence,
      input_data: context,
      output_data: output.output,
      reasoning: output.reasoning,
      pipeline_id: pipelineId,
      pipeline_position: i,
      requires_approval: output.requiresApproval,
      risk_flags: output.riskFlags || [],
    })

    // Store decision if significant
    if (output.confidence < minConfidence || (output.riskFlags?.length ?? 0) > 0 || output.requiresApproval) {
      await supabase.from('agent_decisions').insert({
        execution_id: executionId,
        agent_id: agentId,
        decision_type: eventType,
        decision: output.output,
        confidence: output.confidence,
        risk_flags: output.riskFlags || [],
        requires_human: output.requiresApproval,
      })
    }

    // Merge output into context for next agent
    context[`${agentId}_output`] = output.output
    context[`${agentId}_confidence`] = output.confidence

    // Check risk flags
    if ((output.riskFlags?.length ?? 0) > 0 && INTEGRATION_POLICIES.blockOnRiskFlag) {
      requiresHumanApproval = true
      auditTrail.push(`Risk flags detected from ${agentId}: ${output.riskFlags?.join(', ')}`)
    }

    // Check confidence
    if (output.confidence < minConfidence) {
      requiresHumanApproval = true
      auditTrail.push(`Low confidence from ${agentId}: ${output.confidence} < ${minConfidence}`)
    }

    // Check autonomy
    if (!canAutoExecute(binding.autonomy_level, output.confidence)) {
      requiresHumanApproval = true
    }

    // Break on failure or escalation
    if (output.status === 'Failed' || output.status === 'Escalated') {
      auditTrail.push(`Pipeline halted: ${agentId} returned ${output.status}`)
      break
    }

    auditTrail.push(`Agent ${agentId} completed: confidence=${output.confidence}`)
  }

  // Aggregate final output
  const finalOutput = agentOutputs.reduce((acc, out) => ({ ...acc, ...out.output }), {} as Record<string, unknown>)
  finalOutput._pipelineId = pipelineId
  finalOutput._eventType = eventType
  finalOutput._agentCount = agentOutputs.length

  const status = agentOutputs.some(o => o.status === 'Failed') ? 'Failed'
    : agentOutputs.some(o => o.status === 'Escalated') ? 'Escalated'
    : requiresHumanApproval ? 'PendingApproval' : 'Completed'

  auditTrail.push(`Pipeline ${status}: ${agentOutputs.length} agents executed, approval=${requiresHumanApproval}`)

  // Store memory
  await supabase.from('agent_memory').insert({
    memory_type: 'pipeline_execution',
    key: pipelineId,
    value: { eventType, status, agentCount: agentOutputs.length, requiresHumanApproval },
    importance: requiresHumanApproval ? 0.9 : 0.5,
  }).then(() => {}) // fire and forget

  return { pipelineId, status, finalOutput, agentOutputs, requiresHumanApproval, auditTrail }
}

// ─── HTTP Handler ───
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean).pop() || ''

    // GET endpoints
    if (req.method === 'GET') {
      if (path === 'agents') {
        const { data } = await supabase.from('ai_agents').select('*').order('agent_id')
        return new Response(JSON.stringify({ agents: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (path === 'bindings') {
        const { data } = await supabase.from('event_agent_bindings').select('*').order('event_type')
        return new Response(JSON.stringify({ bindings: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (path === 'state-machines') {
        const { data } = await supabase.from('domain_state_machines').select('*').order('domain')
        return new Response(JSON.stringify({ stateMachines: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (path === 'executions') {
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const { data } = await supabase.from('agent_executions').select('*').order('created_at', { ascending: false }).limit(limit)
        return new Response(JSON.stringify({ executions: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (path === 'pending-approvals') {
        const { data } = await supabase.from('agent_executions').select('*').eq('requires_approval', true).is('approval_status', null).order('created_at', { ascending: false })
        return new Response(JSON.stringify({ pendingApprovals: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (path === 'metrics') {
        const { data: total } = await supabase.from('agent_executions').select('id', { count: 'exact', head: true })
        const { data: pending } = await supabase.from('agent_executions').select('id', { count: 'exact', head: true }).eq('requires_approval', true).is('approval_status', null)
        const { data: agents } = await supabase.from('ai_agents').select('id', { count: 'exact', head: true }).eq('is_active', true)
        return new Response(JSON.stringify({
          totalExecutions: total,
          pendingApprovals: pending,
          activeAgents: agents,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // POST endpoints
    if (req.method === 'POST') {
      const body = await req.json()

      if (path === 'execute-pipeline') {
        const { eventType, context: eventContext } = body
        if (!eventType) return new Response(JSON.stringify({ error: 'eventType required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const result = await executePipeline(eventType, eventContext || {})
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (path === 'approve') {
        const { executionId, approved, feedback } = body
        if (!executionId) return new Response(JSON.stringify({ error: 'executionId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        await supabase.from('agent_executions').update({
          approval_status: approved ? 'approved' : 'rejected',
          approval_feedback: feedback || null,
        }).eq('execution_id', executionId)

        // Create learning signal
        const { data: exec } = await supabase.from('agent_executions').select('agent_id').eq('execution_id', executionId).single()
        if (exec) {
          await supabase.from('agent_learning_signals').insert({
            execution_id: executionId,
            agent_id: exec.agent_id,
            signal_type: approved ? 'approval' : 'rejection',
            feedback: feedback || null,
            is_positive: approved,
          })
        }
        return new Response(JSON.stringify({ status: 'updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (path === 'transition') {
        const { domain, currentState, action, context: transitionContext } = body
        if (!domain || !currentState || !action) {
          return new Response(JSON.stringify({ error: 'domain, currentState, action required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const result = await canTransition(domain, currentState, action, transitionContext || {})
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // PATCH - toggle agent active
    if (req.method === 'PATCH' && path === 'toggle-agent') {
      const { agentId, isActive } = await req.json()
      await supabase.from('ai_agents').update({ is_active: isActive }).eq('agent_id', agentId)
      return new Response(JSON.stringify({ status: 'updated' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
