import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pre-installed Playwright Chromium — avoids any network download
const CHROME = process.env.CHROME_BIN
  ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

async function render() {
  const compositionId = process.argv[2] ?? "SiteSyncMarketingVideo";
  const outFile = process.argv[3] ?? path.join(__dirname, "..", "public", `${compositionId}.mp4`);

  console.log(`\n🎬 Bundling Remotion composition: ${compositionId}…`);

  const bundled = await bundle({
    entryPoint: path.join(__dirname, "src", "Root.tsx"),
    webpackOverride: (config) => config,
  });

  console.log(`🔍 Selecting composition (using Chrome at: ${CHROME})…`);
  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    browserExecutable: CHROME,
    chromeMode: "chrome-for-testing",
  });

  console.log(`🎥 Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps → ${composition.durationInFrames / composition.fps}s`);
  console.log(`   Output: ${outFile}\n`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outFile,
    browserExecutable: CHROME,
    chromeMode: "chrome-for-testing",
    onProgress: ({ progress, renderedFrames, totalFrames }) => {
      const pct = Math.round(progress * 100);
      process.stdout.write(`\r   Progress: ${pct}% (${renderedFrames}/${totalFrames} frames)`);
    },
  });

  console.log(`\n\n✅ Done! Video saved to:\n   ${outFile}\n`);
}

render().catch((err) => {
  console.error("\n❌ Render failed:", err.message);
  process.exit(1);
});
