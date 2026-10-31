import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny, safe markdown renderer for model output — no HTML injection.
 * Handles headings, bold/italic, inline code, bullet + numbered lists,
 * horizontal rules and paragraphs. Anything else falls through as text.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // **bold**, __bold__, *italic*, _italic_, `code`
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**") || tok.startsWith("__")) out.push(<strong key={k} className="font-semibold text-foreground">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k} className="rounded bg-surface-3 px-1 py-px font-mono text-[0.9em]">{tok.slice(1, -1)}</code>);
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "hr" }
  | { kind: "p"; lines: string[] };

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", lines: para });
    para = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) { flush(); continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(t);
    if (h) { flush(); blocks.push({ kind: "h", level: h[1].length, text: h[2] }); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); blocks.push({ kind: "hr" }); continue; }
    const ul = /^[-*•]\s+(.*)$/.exec(t);
    if (ul) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev?.kind === "ul") prev.items.push(ul[1]);
      else blocks.push({ kind: "ul", items: [ul[1]] });
      continue;
    }
    const ol = /^\d+[.)]\s+(.*)$/.exec(t);
    if (ol) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev?.kind === "ol") prev.items.push(ol[1]);
      else blocks.push({ kind: "ol", items: [ol[1]] });
      continue;
    }
    // Continuation of a list item (indented line)
    const prev = blocks[blocks.length - 1];
    if (!para.length && /^\s{2,}/.test(raw) && (prev?.kind === "ul" || prev?.kind === "ol")) {
      prev.items[prev.items.length - 1] += ` ${t}`;
      continue;
    }
    para.push(t);
  }
  flush();
  return blocks;
}

export function MarkdownLite({ text, className, caret }: { text: string; className?: string; caret?: boolean }) {
  const blocks = parse(text);
  return (
    <div className={cn("space-y-3 text-[14px] leading-[1.65] text-foreground/90", className)}>
      {blocks.map((b, bi) => {
        const isLast = bi === blocks.length - 1;
        const tail = caret && isLast ? <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-glow-pulse bg-mod-ai" aria-hidden /> : null;
        switch (b.kind) {
          case "h":
            return (
              <p key={bi} className={cn("font-semibold tracking-tight text-foreground", b.level <= 2 ? "pt-1 text-[15px]" : "text-[14px]")}>
                {inline(b.text, `h${bi}`)}{tail}
              </p>
            );
          case "hr":
            return <hr key={bi} className="border-border" />;
          case "ul":
            return (
              <ul key={bi} className="space-y-1.5">
                {b.items.map((it, ii) => (
                  <li key={ii} className="relative pl-4">
                    <span className="absolute left-0.5 top-[0.7em] h-1 w-1 rounded-full bg-mod-ai/70" />
                    {inline(it, `u${bi}-${ii}`)}
                    {isLast && ii === b.items.length - 1 && tail}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={bi} className="space-y-1.5">
                {b.items.map((it, ii) => (
                  <li key={ii} className="grid grid-cols-[1.4rem_minmax(0,1fr)]">
                    <span className="font-mono text-[12px] leading-[1.9] text-muted-foreground tabular-nums">{ii + 1}.</span>
                    <span>{inline(it, `o${bi}-${ii}`)}{isLast && ii === b.items.length - 1 && tail}</span>
                  </li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={bi} className="text-pretty">
                {b.lines.map((l, li) => (
                  <Fragment key={li}>
                    {li > 0 && <br />}
                    {inline(l, `p${bi}-${li}`)}
                  </Fragment>
                ))}
                {tail}
              </p>
            );
        }
      })}
    </div>
  );
}
