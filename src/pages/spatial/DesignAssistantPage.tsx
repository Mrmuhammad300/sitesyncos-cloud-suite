import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { ArrowUp, GitBranch, History, Lightbulb, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandMark, PageHeader, Panel, StatusPill } from "@/components/os";
import { useProjects } from "@/hooks/useProjectData";
import { useCreateBlenderJob } from "@/hooks/useBlenderData";
import { useAuth } from "@/hooks/useAuth";
import { useScenePalette, type ScenePalette } from "@/components/spatial/sceneTheme";
import { AxisGizmo, Readout, SceneFallback, SceneGrid, SceneLights, Viewport, ViewportSlot } from "@/components/spatial/Viewport";
import { ProceduralBuilding, buildingFraming } from "@/components/spatial/ProceduralBuilding";
import { buildingHeight, grossFloorArea, specFromPrompt, type BuildingSpec } from "@/lib/spatial/buildingSpec";
import { applyDesignInstruction, DESIGN_SUGGESTIONS } from "@/lib/spatial/designEdits";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status?: "pending" | "processing" | "completed" | "failed";
}

interface Version {
  id: string;
  spec: BuildingSpec;
  note: string;
  createdAt: string;
}

const SESSION_KEY = (projectId: string) => `sitesync-design-session:${projectId}`;

function stats(s: BuildingSpec) {
  return `${s.floors + s.podiumFloors} storeys · ${buildingHeight(s).toFixed(0)} m · ${grossFloorArea(s).toLocaleString()} m² · ${s.structure} · ${s.facade === "curtain" ? "curtain wall" : s.facade}`;
}

function loadSession(projectId: string): { versions: Version[]; index: number } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY(projectId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── 3D scene ─────────────────────────────────────────────────────────────────

function DesignScene({ spec, palette }: { spec: BuildingSpec; palette: ScenePalette }) {
  const f = useMemo(() => buildingFraming(spec), [spec]);
  const n = Math.hypot(1, 0.72, 1);
  const pos = [1 / n, 0.72 / n, 1 / n].map((v, i) => v * f.distance + f.target[i]) as [number, number, number];
  return (
    <>
      <PerspectiveCamera makeDefault position={pos} fov={42} near={0.1} far={f.distance * 12} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.05} target={f.target} />
      <SceneLights palette={palette} extent={Math.max(f.radius, f.height)} />
      <SceneGrid palette={palette} size={Math.max(40, f.radius * 5)} />
      <ProceduralBuilding spec={spec} palette={palette} sway />
      <AxisGizmo palette={palette} />
    </>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, initials }: { message: Message; initials: string }) {
  const isUser = message.role === "user";
  const live = message.status === "processing" || message.status === "pending";
  return (
    <div className={cn("flex gap-2.5 animate-fade-in", isUser ? "flex-row-reverse" : "flex-row")}>
      {isUser ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-surface-3 font-mono text-[10px] font-medium">{initials}</span>
      ) : (
        <BrandMark className="h-7 w-7 shrink-0" />
      )}
      <div className={cn("min-w-0 max-w-[85%] space-y-1", isUser && "items-end text-right")}>
        <div
          className={cn(
            "inline-block whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-left text-[13px] leading-relaxed",
            isUser ? "rounded-tr-md border border-primary/20 bg-primary/10" : "rounded-tl-md border bg-surface-2",
          )}
        >
          {message.content}
          {message.status && message.status !== "completed" && (
            <div className="mt-2">
              <StatusPill status={message.status} pulse={live} className="capitalize">
                {live ? "Blender working" : message.status === "failed" ? <><XCircle className="h-3 w-3" /> failed</> : message.status}
              </StatusPill>
            </div>
          )}
        </div>
        <p className="ss-num px-1 text-[10px] text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignAssistantPage() {
  const { data: projects } = useProjects();
  const [projectId, setProjectId] = useState<string>("none");
  const project = projects?.find((p) => p.id === projectId);

  /** Starting design: the linked project (sized from its budget) or a concept tower. */
  const baseSpec = useMemo(() => {
    if (!project) return specFromPrompt("Concept Tower — 10-storey office with a retail podium");
    const storeys = Math.max(2, Math.min(40, Math.round(Number(project.budget) / 3.5e6)));
    return specFromPrompt(`${project.name} — ${storeys}-storey office with podium`);
  }, [project]);

  const [versions, setVersions] = useState<Version[]>(() => [{ id: "v0", spec: baseSpec, note: "Base design", createdAt: new Date().toISOString() }]);
  const [index, setIndex] = useState(0);
  const current = versions[Math.min(index, versions.length - 1)];

  const intro = (s: BuildingSpec): Message => ({
    id: crypto.randomUUID(),
    role: "assistant",
    content: `I've loaded ${s.name}: ${stats(s)}. Tell me what to change — height, structure, facade, massing, balconies, green roof — and I'll rebuild the model. Every change is saved as a version you can undo or branch.`,
    timestamp: new Date(),
  });
  const [messages, setMessages] = useState<Message[]>(() => [intro(baseSpec)]);
  const [input, setInput] = useState("");
  const [rebuilding, setRebuilding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const createJob = useCreateBlenderJob();
  const palette = useScenePalette();
  const { profile, user } = useAuth();
  const initials = (profile?.display_name || user?.email || "You").split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  // Restore (or start) the session whenever the linked project changes.
  useEffect(() => {
    const saved = loadSession(projectId);
    if (saved?.versions?.length) {
      setVersions(saved.versions);
      setIndex(Math.min(saved.index, saved.versions.length - 1));
      setMessages([{ id: crypto.randomUUID(), role: "assistant", content: `Welcome back — restored ${saved.versions.length} version${saved.versions.length === 1 ? "" : "s"} of ${saved.versions[0].spec.name}.`, timestamp: new Date() }]);
    } else {
      setVersions([{ id: "v0", spec: baseSpec, note: "Base design", createdAt: new Date().toISOString() }]);
      setIndex(0);
      setMessages([intro(baseSpec)]);
    }
  }, [projectId, baseSpec]);

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY(projectId), JSON.stringify({ versions, index }));
    } catch {
      /* storage unavailable */
    }
  }, [versions, index, projectId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const say = (content: string, status?: Message["status"]) =>
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content, timestamp: new Date(), status }]);

  const handleSend = (text = input) => {
    const instruction = text.trim();
    if (!instruction || rebuilding) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: instruction, timestamp: new Date() }]);
    setInput("");

    const edit = applyDesignInstruction(current.spec, instruction);
    if (!edit.changes.length) {
      say(`I couldn't map that to a design change yet. Try things like "${DESIGN_SUGGESTIONS.slice(0, 3).join('", "')}", or "make it 20 storeys".`);
      return;
    }

    // Log the iteration as a Blender job (history + optional real geometry service).
    createJob.mutate({ job_type: "design-iterate", prompt: instruction, project_id: projectId !== "none" ? projectId : undefined });
    setRebuilding(true);
    say("Rebuilding the model…", "processing");
    setTimeout(() => {
      const v: Version = { id: crypto.randomUUID(), spec: edit.spec, note: instruction, createdAt: new Date().toISOString() };
      const next = [...versions.slice(0, index + 1), v];
      setVersions(next);
      setIndex(next.length - 1);
      setRebuilding(false);
      setMessages((prev) => [
        ...prev.filter((m) => m.status !== "processing"),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Version ${next.length - 1} is ready:\n${edit.changes.map((c) => `• ${c}`).join("\n")}\n\nNow: ${stats(edit.spec)}.`,
          timestamp: new Date(),
          status: "completed",
        },
      ]);
    }, 900);
  };

  const handleUndo = () => {
    if (index === 0) return;
    setIndex(index - 1);
    say(`Reverted to version ${index - 1}: ${stats(versions[index - 1].spec)}.`);
  };

  const handleBranch = () => {
    const v: Version = { id: crypto.randomUUID(), spec: { ...current.spec }, note: `Branch of v${index}`, createdAt: new Date().toISOString() };
    const next = [...versions, v];
    setVersions(next);
    setIndex(next.length - 1);
    say(`Branched version ${index} into version ${next.length - 1}. Later versions are kept, so you can compare both directions in the history below.`);
  };

  const restore = (i: number) => {
    setIndex(i);
    say(`Restored version ${i} (${versions[i].note}).`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design Assistant"
        description="Shape a building in conversation — every request rebuilds the 3D model and is saved as a version you can undo, branch or restore."
        actions={
          <>
            <StatusPill status="Blender MCP" tone="data" pulse />
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full sm:w-[220px]" aria-label="Project"><SelectValue placeholder="Link project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Concept (no project)</SelectItem>
                {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid gap-4 lg:h-[calc(100svh-250px)] lg:min-h-[560px] lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* Viewport (first on mobile) */}
        <Viewport
          className="order-first h-[340px] sm:h-[420px] lg:order-last lg:h-full"
          overlay={
            <>
              <ViewportSlot at="top-left">
                <Readout className="text-foreground">
                  <span className={cn("h-1.5 w-1.5 rounded-full", rebuilding ? "animate-pulse bg-primary" : "bg-success")} />
                  {rebuilding ? "Rebuilding…" : `${current.spec.name} · v${index}`}
                </Readout>
              </ViewportSlot>
              <ViewportSlot at="top-right" className="hidden sm:flex">
                <Readout className="ss-num">{stats(current.spec)}</Readout>
              </ViewportSlot>
              <ViewportSlot at="bottom-left" className="max-w-[calc(100%-120px)]">
                <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border/80 bg-background/75 px-2 py-1.5 backdrop-blur-md" aria-label="Version timeline">
                  {versions.map((v, i) => (
                    <span key={v.id} className="flex shrink-0 items-center gap-1">
                      {i > 0 && <span className="h-px w-3 bg-border-strong" />}
                      <button
                        onClick={() => restore(i)}
                        title={v.note}
                        className={cn("ss-num flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] transition-colors", i === index ? "bg-mod-spatial text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                      >
                        v{i}
                      </button>
                    </span>
                  ))}
                </div>
              </ViewportSlot>
            </>
          }
        >
          <Canvas shadows dpr={[1, 2]} aria-label="Design model">
            <Suspense fallback={<SceneFallback />}>
              <DesignScene spec={current.spec} palette={palette} />
            </Suspense>
          </Canvas>
        </Viewport>

        {/* Chat */}
        <section className="ss-card flex h-[560px] min-h-0 flex-col lg:h-full">
          <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="ss-eyebrow">Conversation</p>
              <h2 className="text-[14px] font-semibold">Design chat</h2>
            </div>
            <div className="flex items-center gap-1">
              <span className="ss-num mr-1 rounded-md border bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">V{String(index).padStart(2, "0")}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleUndo} disabled={index === 0 || rebuilding} title="Undo to previous version" aria-label="Undo to previous version"><RotateCcw /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleBranch} disabled={rebuilding} title="Branch this version" aria-label="Branch this version"><GitBranch /></Button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((m) => <MessageBubble key={m.id} message={m} initials={initials} />)}
          </div>

          <div className="space-y-2.5 border-t p-3">
            <div className="flex flex-wrap gap-1.5">
              <Lightbulb className="mt-1 h-3.5 w-3.5 text-muted-foreground" />
              {DESIGN_SUGGESTIONS.slice(0, messages.length <= 2 ? 4 : 3).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={rebuilding}
                  className="rounded-full border px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-border-strong hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative rounded-xl border bg-surface-2/50 transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]">
              <Textarea
                placeholder="e.g. Add 4 floors and switch to mass timber…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                className="min-h-[64px] resize-none border-0 bg-transparent pr-12 text-[13px] shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <Button size="icon" onClick={() => handleSend()} disabled={!input.trim() || rebuilding} className="absolute bottom-2 right-2 h-8 w-8" aria-label="Send">
                {rebuilding ? <Loader2 className="animate-spin" /> : <ArrowUp />}
              </Button>
            </div>
            <p className="hidden text-[10.5px] text-muted-foreground sm:block"><kbd className="ss-kbd">↵</kbd> send · <kbd className="ss-kbd">Shift</kbd>+<kbd className="ss-kbd">↵</kbd> new line</p>
          </div>
        </section>
      </div>

      {/* History */}
      <Panel eyebrow="Versions" title={<span className="flex items-center gap-2">Design history <span className="ss-num text-xs font-normal text-muted-foreground">{versions.length}</span></span>}>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {versions.map((v, i) => (
            <button
              key={v.id}
              onClick={() => restore(i)}
              aria-pressed={i === index}
              className={cn("ss-card ss-interactive w-48 shrink-0 space-y-2 p-3 text-left", i === index && "border-mod-spatial/50 shadow-[0_0_0_1px_hsl(var(--mod-spatial)/0.4)]")}
            >
              <span className="flex items-center justify-between">
                <span className="ss-num text-lg">v{i}</span>
                {i === index && <StatusPill status="Current" tone="info" />}
              </span>
              <span className="line-clamp-2 block min-h-[2.5em] text-[12px]">{v.note}</span>
              <span className="ss-num block text-[10.5px] text-muted-foreground">
                {v.spec.floors + v.spec.podiumFloors} st · {buildingHeight(v.spec).toFixed(0)} m · {v.spec.structure}
              </span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
