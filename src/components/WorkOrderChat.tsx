import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkOrderMessages, useSendWorkOrderMessage } from "@/hooks/useFieldOps";

interface WorkOrderChatProps {
  workOrderId: string;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function WorkOrderChat({ workOrderId }: WorkOrderChatProps) {
  const { user, profile } = useAuth();
  const { data: messages = [], isLoading } = useWorkOrderMessages(workOrderId);
  const sendMessage = useSendWorkOrderMessage();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSend = () => {
    if (!body.trim()) return;
    sendMessage.mutate({
      work_order_id: workOrderId,
      author_id: user?.id ?? null,
      author_name: profile?.display_name || user?.email || "Unknown",
      body: body.trim(),
    });
    setBody("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Field Messages</Label>
        <Badge variant="secondary" className="text-[9px] h-4">Live</Badge>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border bg-muted/20 p-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.author_id === user?.id;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div className={`rounded-lg px-3 py-1.5 max-w-[85%] text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                  {m.body}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {m.author_name ?? "Unknown"} · {timeLabel(m.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Message the field crew…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8 shrink-0" onClick={handleSend} disabled={!body.trim() || sendMessage.isPending}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
