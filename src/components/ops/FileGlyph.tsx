import type { LucideIcon } from "lucide-react";
import {
  Award, Box, ClipboardList, FileBadge, FileSignature, FileSpreadsheet, FileText, FolderOpen, PenTool, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TypeStyle { icon: LucideIcon; tone: string; code: string }

/** Document type → glyph + token tone + 3-letter code printed on the sheet. */
const TYPES: Record<string, TypeStyle> = {
  Drawing: { icon: PenTool, tone: "text-data", code: "DWG" },
  Specification: { icon: ScrollText, tone: "text-mod-ai", code: "SPC" },
  Report: { icon: FileSpreadsheet, tone: "text-success", code: "RPT" },
  Contract: { icon: FileSignature, tone: "text-warning", code: "CTR" },
  Permit: { icon: FileBadge, tone: "text-info", code: "PMT" },
  Model: { icon: Box, tone: "text-mod-spatial", code: "BIM" },
  Plan: { icon: ClipboardList, tone: "text-primary", code: "PLN" },
  Certificate: { icon: Award, tone: "text-mod-vault", code: "CRT" },
  General: { icon: FolderOpen, tone: "text-muted-foreground", code: "DOC" },
};

function docTypeStyle(type: string | null | undefined): TypeStyle {
  return TYPES[type ?? ""] ?? { icon: FileText, tone: "text-muted-foreground", code: (type ?? "DOC").slice(0, 3).toUpperCase() };
}

/**
 * A folded-corner "sheet" tinted by document type, with the type glyph and a
 * mono type code. Sizes: sm (table rows) and lg (grid cards).
 */
export function FileGlyph({ type, size = "sm", className }: { type: string | null | undefined; size?: "sm" | "lg"; className?: string }) {
  const s = docTypeStyle(type);
  const Icon = s.icon;
  const lg = size === "lg";
  return (
    <span className={cn("relative inline-flex shrink-0", s.tone, lg ? "h-14 w-11" : "h-9 w-7", className)} aria-hidden>
      <svg viewBox="0 0 28 36" className="absolute inset-0 h-full w-full" fill="none">
        <path d="M2 4a3 3 0 0 1 3-3h13l8 8v22a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V4Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.45" />
        <path d="M18 1v5a3 3 0 0 0 3 3h5" stroke="currentColor" strokeOpacity="0.45" />
      </svg>
      <span className={cn("relative flex w-full flex-col items-center", lg ? "gap-1 pt-[15px]" : "pt-[11px]")}>
        <Icon className={lg ? "h-4 w-4" : "h-3 w-3"} strokeWidth={1.75} />
        {lg && <span className="font-mono text-[8px] font-semibold tracking-wider">{s.code}</span>}
      </span>
    </span>
  );
}
