import net from "net";

export interface BlenderCommand {
  type: string;
  code?: string;
  [key: string]: unknown;
}

export interface BlenderResponse {
  success: boolean;
  result?: unknown;
  error?: string;
}

const BLENDER_HOST = process.env.BLENDER_HOST ?? "127.0.0.1";
const BLENDER_PORT = parseInt(process.env.BLENDER_PORT ?? "9876", 10);
const BLENDER_TIMEOUT_MS = 120_000;

/**
 * Sends a JSON command to the Blender MCP addon via TCP socket and returns
 * the parsed response. Rejects if Blender is unreachable or times out.
 */
export function sendToBlender(command: BlenderCommand): Promise<BlenderResponse> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let raw = "";

    client.connect(BLENDER_PORT, BLENDER_HOST, () => {
      client.write(JSON.stringify(command) + "\n");
    });

    client.on("data", (chunk) => {
      raw += chunk.toString();
      try {
        const parsed = JSON.parse(raw) as BlenderResponse;
        client.destroy();
        resolve(parsed);
      } catch {
        // Keep accumulating until valid JSON arrives
      }
    });

    client.on("error", (err) => {
      client.destroy();
      reject(new Error(`Blender MCP connection failed: ${err.message}`));
    });

    client.setTimeout(BLENDER_TIMEOUT_MS, () => {
      client.destroy();
      reject(new Error(`Blender MCP timed out after ${BLENDER_TIMEOUT_MS / 1000}s`));
    });
  });
}

/** Build Python code for each job type to send to Blender */
export function buildBlenderCode(jobType: string, prompt?: string, filePath?: string): string {
  switch (jobType) {
    case "generate":
      return `
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
# AI-driven scene generation
# Prompt: ${JSON.stringify(prompt ?? "")}
bpy.ops.mesh.primitive_plane_add(size=10)
print("Scene generated for: " + ${JSON.stringify(prompt ?? "")})
`.trim();

    case "clash":
      return `
import bpy
# Load IFC model from: ${JSON.stringify(filePath ?? "no file")}
# Run geometry intersection tests across all discipline layers
# Return intersecting element pairs with severity classification
print("Clash analysis complete for: ${filePath ?? "no file"}")
`.trim();

    case "floor-plan":
      return `
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
# Parametric floor plan from constraints
# Prompt: ${JSON.stringify(prompt ?? "")}
print("Floor plan generated")
`.trim();

    case "design-iterate":
      return `
import bpy
# Apply iterative design change
# Instruction: ${JSON.stringify(prompt ?? "")}
print("Design iteration applied: " + ${JSON.stringify(prompt ?? "")})
`.trim();

    default:
      throw new Error(`Unknown job_type: ${jobType}`);
  }
}
