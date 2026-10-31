import { BrandMark } from "./BrandMark";

/** Shown instead of the app when required environment variables are missing (e.g. a fresh Vercel deploy). */
export function SetupScreen({ missing }: { missing: string[] }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <div className="ss-blueprint absolute inset-0 opacity-70 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      <div className="ss-card relative w-full max-w-lg space-y-5 p-8">
        <BrandMark className="h-10 w-10" />
        <div className="space-y-2">
          <p className="ss-eyebrow">Configuration required</p>
          <h1 className="text-2xl font-semibold tracking-tight">Connect SiteSync to Supabase</h1>
          <p className="text-sm text-muted-foreground">
            This deployment is missing environment variables. Add them in your hosting provider (on Vercel:
            Project → Settings → Environment Variables), then redeploy.
          </p>
        </div>
        <ul className="space-y-2">
          {missing.map((k) => (
            <li key={k} className="flex items-center gap-2 rounded-lg border bg-surface-2/60 px-3 py-2 font-mono text-[13px]">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              {k}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
