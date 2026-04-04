import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, PerspectiveCamera, Html } from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2, Bot, User, CheckCircle2, XCircle, RotateCcw, GitBranch, Lightbulb } from "lucide-react";
import { useProjects } from "@/hooks/useProjectData";
import { useBlenderJobs, useCreateBlenderJob, useBlenderJobStatus } from "@/hooks/useBlenderData";
import { toast } from "sonner";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRef as useThreeRef } from "react";

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

function DesignScene({ iteration }: { iteration: number }) {
  const groupRef = useThreeRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.1;
    }
  });

  const hue = (iteration * 40) % 360;
  const color = `hsl(${hue}, 70%, 55%)`;

  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 8, 10]} fov={45} />
      <OrbitControls enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.1} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1} />
      <Grid args={[24, 24]} cellColor="#334155" sectionColor="#475569" />
      <group ref={groupRef}>
        {/* Floor */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Walls */}
        {[
          { pos: [0, 1.5, 3] as [number, number, number], args: [8, 3, 0.1] as [number, number, number] },
          { pos: [0, 1.5, -3] as [number, number, number], args: [8, 3, 0.1] as [number, number, number] },
          { pos: [4, 1.5, 0] as [number, number, number], args: [0.1, 3, 6] as [number, number, number] },
          { pos: [-4, 1.5, 0] as [number, number, number], args: [0.1, 3, 6] as [number, number, number] },
        ].map((w, i) => (
          <mesh key={i} position={w.pos}>
            <boxGeometry args={w.args} />
            <meshStandardMaterial color={color} transparent opacity={0.3} />
          </mesh>
        ))}
        {/* Interior partitions — shift per iteration */}
        {iteration > 0 && (
          <mesh position={[0, 1.5, iteration % 2 === 0 ? 1 : -1]}>
            <boxGeometry args={[4, 3, 0.1]} />
            <meshStandardMaterial color="#64748b" transparent opacity={0.6} />
          </mesh>
        )}
        {/* Furniture dots */}
        {Array.from({ length: 6 + iteration * 2 }).map((_, i) => (
          <mesh key={`f${i}`} position={[
            Math.cos(i * 1.1) * (2 + (i % 2)),
            0.4,
            Math.sin(i * 1.1) * 1.5,
          ]}>
            <cylinderGeometry args={[0.2, 0.2, 0.8, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
      {iteration > 0 && (
        <Html position={[0, 5, 0]}>
          <div className="text-[9px] bg-background/90 border border-border px-2 py-1 rounded whitespace-nowrap text-center">
            Iteration {iteration}
          </div>
        </Html>
      )}
      <Environment preset="city" />
    </>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-primary" : "bg-muted"}`}>
        {isUser ? <User className="h-3.5 w-3.5 text-primary-foreground" /> : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        <p>{message.content}</p>
        {message.status && message.status !== "completed" && (
          <div className="flex items-center gap-1 mt-1 opacity-70">
            {message.status === "processing" || message.status === "pending"
              ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
              : message.status === "failed"
              ? <XCircle className="h-2.5 w-2.5" />
              : null}
            <span className="text-[9px]">{message.status}</span>
          </div>
        )}
        <p className={`text-[9px] mt-1 opacity-50 ${isUser ? "text-right" : ""}`}>
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Design Assistant</h1>
            <Badge variant="outline" className="text-[10px]">Spatial Workbench</Badge>
            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 border">Blender MCP</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Iteratively refine 3D designs through natural language conversation.
          </p>
        </div>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Link project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No project</SelectItem>
            {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ height: "calc(100vh - 220px)" }}>
        {/* Chat panel */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Design Chat
                {iteration > 0 && (
                  <Badge variant="outline" className="text-[10px] ml-auto">Iteration {iteration}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
              </div>

              {/* Suggestions */}
              {messages.length <= 2 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Try asking
                  </p>
                  {DESIGN_SUGGESTIONS.slice(0, 3).map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="w-full text-left text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Describe a design change…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                />
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || createJob.isPending} className="shrink-0 self-end">
                  {createJob.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Iteration controls */}
          <Card>
            <CardContent className="p-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleUndo} disabled={iteration === 0}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Undo
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={iteration === 0}>
                <GitBranch className="h-3.5 w-3.5 mr-1.5" /> Branch Variant
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 3D canvas */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              <div className="h-full min-h-[400px] rounded-lg overflow-hidden bg-muted/20 relative">
                <Canvas shadows>
                  <Suspense fallback={<Html center><div className="text-xs text-muted-foreground">Loading…</div></Html>}>
                    <DesignScene iteration={iteration} />
                  </Suspense>
                </Canvas>
                {iteration > 0 && (
                  <div className="absolute top-3 left-3 bg-background/80 backdrop-blur rounded-full px-3 py-1 text-xs font-medium border">
                    Iteration {iteration}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History */}
      {jobs && jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Design History ({jobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {jobs.map((job, i) => (
                <div key={job.id} className="shrink-0 w-32 border rounded-lg p-2 text-center space-y-1 hover:border-primary/50 cursor-pointer transition-colors">
                  <div className="aspect-square bg-muted/30 rounded flex items-center justify-center">
                    <span className="text-lg font-bold text-muted-foreground">{jobs.length - i}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate">{job.prompt ?? "Design iterate"}</p>
                  <Badge variant="outline" className={`text-[9px] w-full justify-center ${
                    job.status === "completed" ? "border-emerald-500/30 text-emerald-600" :
                    job.status === "failed" ? "border-destructive/30 text-destructive" :
                    "border-amber-500/30 text-amber-600"
                  }`}>{job.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
