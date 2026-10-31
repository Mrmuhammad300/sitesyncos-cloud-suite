import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { ArrowUp, GitBranch, History, Lightbulb, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandMark, EmptyState, PageHeader, Panel, StatusPill } from "@/components/os";
import { useProjects } from "@/hooks/useProjectData";
import { useBlenderJobs, useCreateBlenderJob, useBlenderJobStatus } from "@/hooks/useBlenderData";
import { useAuth } from "@/hooks/useAuth";
import { mix, useScenePalette, type ScenePalette } from "@/components/spatial/sceneTheme";
import { AxisGizmo, Readout, SceneFallback, SceneGrid, SceneLights, Viewport, ViewportSlot } from "@/components/spatial/Viewport";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  jobId?: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

const DESIGN_SUGGESTIONS = [
  "Make the floor plan more efficient",
  "Add a breakout lounge area near the kitchen",
  "Increase natural light by adding skylights",
  "Reorganize meeting rooms to the perimeter",
  "Add ADA-compliant pathways throughout",
  "Optimize circulation for 50 people",
];

// ─── 3D Scene (evolves with design iterations) ────────────────────────────────

const ITER_TONES = ["spatial", "data", "primary", "vault", "success"] as const;

function DesignScene({ iteration, palette }: { iteration: number; palette: ScenePalette }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.1;
    }
  });

  const color = palette[ITER_TONES[iteration % ITER_TONES.length]];
  const walls: { pos: [number, number, number]; args: [number, number, number] }[] = [
    { pos: [0, 1.5, 3], args: [8, 3, 0.1] },
    { pos: [0, 1.5, -3], args: [8, 3, 0.1] },
    { pos: [4, 1.5, 0], args: [0.1, 3, 6] },
    { pos: [-4, 1.5, 0], args: [0.1, 3, 6] },
  ];

  return (
    <>
      <PerspectiveCamera makeDefault position={[11, 9, 13]} fov={40} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.1} target={[0, 1, 0]} />
      <SceneLights palette={palette} />
      <SceneGrid palette={palette} size={28} />
      <group ref={groupRef}>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color={mix(palette.canvas, palette.foreground, palette.dark ? 0.1 : 0.06)} />
        </mesh>
        {walls.map((w, i) => (
          <mesh key={i} position={w.pos}>
            <boxGeometry args={w.args} />
            <meshStandardMaterial color={color} transparent opacity={0.22} />
            <Edges color={color} />
          </mesh>
        ))}
        {iteration > 0 && (
          <mesh position={[0, 1.5, iteration % 2 === 0 ? 1 : -1]}>
            <boxGeometry args={[4, 3, 0.1]} />
            <meshStandardMaterial color={palette.concrete} transparent opacity={0.6} />
          </mesh>
        )}
        {Array.from({ length: 6 + iteration * 2 }).map((_, i) => (
          <mesh key={`f${i}`} castShadow position={[Math.cos(i * 1.1) * (2 + (i % 2)), 0.4, Math.sin(i * 1.1) * 1.5]}>
            <cylinderGeometry args={[0.2, 0.2, 0.8, 12]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        ))}
      </group>
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
            "inline-block rounded-2xl px-3.5 py-2.5 text-left text-[13px] leading-relaxed",
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hi! I'm your AI Design Assistant powered by Blender MCP. Describe your space or design goal and I'll iteratively refine the 3D model. You can also load a project and ask me to optimize it.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [iteration, setIteration] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: projects } = useProjects();
  const { data: jobs } = useBlenderJobs(projectId !== "none" ? projectId : undefined);
  const createJob = useCreateBlenderJob();
  const { data: activeJob } = useBlenderJobStatus(activeJobId);
  const palette = useScenePalette();
  const { profile, user } = useAuth();
  const initials = (profile?.display_name || user?.email || "You").split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const busy = activeJob?.status === "pending" || activeJob?.status === "processing";

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Update message status when job status changes
  useEffect(() => {
    if (!activeJob || !activeJobId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.jobId === activeJobId
          ? { ...m, status: activeJob.status }
          : m
      )
    );
    if (activeJob.status === "completed") {
      setIteration((i) => i + 1);
      const responseContent = `Model updated! Iteration ${iteration + 1} complete. The 3D canvas has been refreshed with your changes. You can keep refining or export the current state.`;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          status: "completed",
        },
      ]);
    } else if (activeJob.status === "failed") {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Generation failed: ${activeJob.error_message ?? "Unknown error"}. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [activeJob?.status]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Create Blender job
    try {
      const job = await createJob.mutateAsync({
        job_type: "design-iterate",
        prompt: input.trim(),
        project_id: projectId !== "none" ? projectId : undefined,
      });
      setActiveJobId(job.id);

      // Add assistant thinking message
      const thinkingMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Got it — sending to Blender: "${input.trim().slice(0, 60)}${input.length > 60 ? "…" : ""}". This will take a moment…`,
        timestamp: new Date(),
        jobId: job.id,
        status: "processing",
      };
      setMessages((prev) => [...prev, thinkingMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Failed to connect to the Blender service. Make sure the backend is running on port 3999.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleUndo = () => {
    if (iteration > 0) {
      setIteration((i) => i - 1);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: `Reverted to iteration ${iteration - 1}.`, timestamp: new Date() },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design Assistant"
        description="Iterate on a 3D design in conversation — each request becomes a Blender job and a new version of the model."
        actions={
          <>
            <StatusPill status="Blender MCP" tone="data" pulse />
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full sm:w-[220px]" aria-label="Project"><SelectValue placeholder="Link project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
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
                  <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "animate-pulse bg-primary" : "bg-success")} />
                  {busy ? "Rebuilding…" : iteration > 0 ? `Iteration ${iteration}` : "Base design"}
                </Readout>
              </ViewportSlot>
              <ViewportSlot at="bottom-left">
                <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/75 px-2 py-1.5 backdrop-blur-md" aria-label="Version timeline">
                  {Array.from({ length: Math.max(iteration + 1, 1) }).map((_, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="h-px w-3 bg-border-strong" />}
                      <span className={cn("ss-num flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px]", i === iteration ? "bg-mod-spatial text-background" : "text-muted-foreground")}>v{i}</span>
                    </span>
                  ))}
                </div>
              </ViewportSlot>
            </>
          }
        >
          <Canvas shadows dpr={[1, 2]} aria-label="Design model">
            <Suspense fallback={<SceneFallback />}>
              <DesignScene iteration={iteration} palette={palette} />
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
              <span className="ss-num mr-1 rounded-md border bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">ITER {String(iteration).padStart(2, "0")}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleUndo} disabled={iteration === 0} title="Undo iteration" aria-label="Undo iteration"><RotateCcw /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={iteration === 0} title="Branch variant" aria-label="Branch variant"><GitBranch /></Button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((m) => <MessageBubble key={m.id} message={m} initials={initials} />)}
          </div>

          <div className="space-y-2.5 border-t p-3">
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-1.5">
                <Lightbulb className="mt-1 h-3.5 w-3.5 text-muted-foreground" />
                {DESIGN_SUGGESTIONS.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-border-strong hover:bg-accent hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="relative rounded-xl border bg-surface-2/50 transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]">
              <Textarea
                placeholder="Describe a design change…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                className="min-h-[64px] resize-none border-0 bg-transparent pr-12 text-[13px] shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <Button size="icon" onClick={handleSend} disabled={!input.trim() || createJob.isPending} className="absolute bottom-2 right-2 h-8 w-8" aria-label="Send">
                {createJob.isPending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
              </Button>
            </div>
            <p className="hidden text-[10.5px] text-muted-foreground sm:block"><kbd className="ss-kbd">↵</kbd> send · <kbd className="ss-kbd">Shift</kbd>+<kbd className="ss-kbd">↵</kbd> new line</p>
          </div>
        </section>
      </div>

      {/* History */}
      <Panel eyebrow="Versions" title={<span className="flex items-center gap-2">Design history {jobs && jobs.length > 0 && <span className="ss-num text-xs font-normal text-muted-foreground">{jobs.length}</span>}</span>}>
        {jobs && jobs.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {jobs.map((job, i) => (
              <article key={job.id} className="ss-card ss-interactive w-40 shrink-0 cursor-pointer space-y-2 p-2.5">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-surface-2/60">
                  <div className="ss-blueprint absolute inset-0 opacity-70" />
                  <span className="ss-num relative text-2xl text-muted-foreground">v{jobs.length - i}</span>
                </div>
                <p className="truncate text-[11.5px]">{job.prompt ?? "Design iterate"}</p>
                <StatusPill status={job.status} className="capitalize" pulse={job.status === "processing"} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState compact icon={History} title="No saved versions yet" description="Each request you send is stored as a version you can return to." />
        )}
      </Panel>
    </div>
  );
}
