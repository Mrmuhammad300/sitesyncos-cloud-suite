import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

/** A floor plan with one room that isn't where it should be. */
function MissingRoomPlan() {
  return (
    <svg viewBox="0 0 520 360" className="h-full w-full" aria-hidden>
      <defs>
        <pattern id="nf-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="hsl(var(--foreground) / 0.3)" strokeWidth="1.2" />
        </pattern>
      </defs>
      <g stroke="hsl(var(--foreground) / 0.45)" strokeWidth="1.5" fill="none">
        <path d="M30 30H490V330H30Z M38 38V322H482V38Z" fill="url(#nf-hatch)" fillRule="evenodd" className="animate-draw" style={{ ["--len" as string]: 1600 }} />
        <path d="M200 38V200 M38 200H200 M200 140H330 M330 38V140 M330 200V322" className="animate-draw" style={{ ["--len" as string]: 800, animationDelay: "0.3s" }} />
      </g>
      {/* the room that should be here */}
      <rect x="330" y="140" width="152" height="182" fill="hsl(var(--primary) / 0.07)" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="6 5" className="animate-draw" style={{ ["--len" as string]: 700, animationDelay: "0.6s" }} />
      <g fontFamily="Geist Mono, monospace" textAnchor="middle">
        <text x="406" y="226" fontSize="40" fill="hsl(var(--primary))" fontWeight="500">404</text>
        <text x="406" y="250" fontSize="10" letterSpacing="2" fill="hsl(var(--muted-foreground))">ROOM NOT FOUND</text>
        <text x="119" y="124" fontSize="10" letterSpacing="1.5" fill="hsl(var(--muted-foreground))">LOBBY</text>
        <text x="265" y="94" fontSize="10" letterSpacing="1.5" fill="hsl(var(--muted-foreground))">CORE</text>
        <text x="406" y="94" fontSize="10" letterSpacing="1.5" fill="hsl(var(--muted-foreground))">OFFICE</text>
        <text x="119" y="266" fontSize="10" letterSpacing="1.5" fill="hsl(var(--muted-foreground))">STAIR</text>
        <text x="265" y="236" fontSize="10" letterSpacing="1.5" fill="hsl(var(--muted-foreground))">CORRIDOR</text>
      </g>
      {/* survey markers */}
      {[[30, 30, "A1"], [490, 30, "D1"], [30, 330, "A4"]].map(([x, y, l]) => (
        <g key={l as string}>
          <circle cx={x as number} cy={y as number} r="3" fill="hsl(var(--data))" />
          <circle cx={x as number} cy={y as number} r="8" fill="none" stroke="hsl(var(--data) / 0.4)" />
          <text x={(x as number) + 12} y={(y as number) - 8} fontSize="9" fontFamily="Geist Mono, monospace" fill="hsl(var(--muted-foreground))">{l as string}</text>
        </g>
      ))}
      {/* dimension */}
      <g stroke="hsl(var(--muted-foreground) / 0.6)" strokeWidth="1">
        <line x1="330" y1="345" x2="482" y2="345" />
        <line x1="330" y1="340" x2="330" y2="350" />
        <line x1="482" y1="340" x2="482" y2="350" />
      </g>
      <text x="406" y="358" textAnchor="middle" fontSize="9" fontFamily="Geist Mono, monospace" fill="hsl(var(--muted-foreground))">?? '-?? "</text>
    </svg>
  );
}

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn("404: Route not found —", location.pathname);
  }, [location.pathname]);

  const shortcuts = MODULES.filter((m) => m.key !== "overview" && m.key !== "system").map((m) => ({ module: m, item: m.items[0] }));

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2 sm:py-6">
      <section className="ss-card relative overflow-hidden">
        <div className="ss-blueprint absolute inset-0 opacity-80 [mask-image:radial-gradient(ellipse_at_70%_50%,black,transparent_75%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_40%,hsl(var(--primary)/0.10),transparent_55%)]" />
        <div className="relative grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-5 animate-slide-up">
            <p className="ss-eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-[2px] bg-primary" />
              Error 404 · Off the plans
            </p>
            <h1 className="ss-display text-balance text-[40px] leading-[0.98] sm:text-[52px]">
              This room isn't on <span className="italic text-primary">the drawings</span>.
            </h1>
            <p className="max-w-md text-pretty text-sm text-muted-foreground">
              Nothing is built at{" "}
              <code className="ss-num break-all rounded border bg-surface-2 px-1.5 py-0.5 text-[12px] text-foreground">{location.pathname}</code>
              . It may have moved, or the link was mistyped.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/")}>
                <LayoutDashboard /> Back to dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft /> Go back
              </Button>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Tip: press <kbd className="ss-kbd">Ctrl</kbd> <kbd className="ss-kbd">K</kbd> to jump anywhere.
            </p>
          </div>
          <div className="mx-auto aspect-[13/9] w-full max-w-[520px]">
            <MissingRoomPlan />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="ss-eyebrow">Or head to a module</p>
        <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map(({ module: m, item }) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.key}
                to={item.url}
                className="ss-card ss-interactive group flex items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", `text-${m.tone} border-${m.tone}/25 bg-${m.tone}/10`)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{m.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.tagline} · {item.title}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default NotFound;
