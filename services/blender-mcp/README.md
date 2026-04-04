# Blender MCP — SiteSync Integration

## Setup

1. **Clone the blender-mcp addon**
   ```bash
   git clone https://github.com/jrmoyler/blender-mcp.git services/blender-mcp/
   ```

2. **Install the Blender addon**
   - Open Blender → Edit → Preferences → Add-ons → Install
   - Select `services/blender-mcp/blender_mcp/blender_addon.py`
   - Enable the addon

3. **Start the MCP server in Blender**
   - In Blender's sidebar (N panel) → BlenderMCP tab → Start Server
   - Server listens on TCP port **9876**

4. **Start the SiteSync Blender API**
   ```bash
   cd services/blender-api
   npm install   # installs express, multer, @supabase/supabase-js
   SUPABASE_URL=https://xxx.supabase.co \
   SUPABASE_SERVICE_KEY=eyJ... \
   node server.mjs
   ```
   API listens on port **3999**.

5. **Configure the React frontend**
   Add to `.env.local`:
   ```
   VITE_BLENDER_API_URL=http://localhost:3999
   ```

## Architecture

```
React (SiteSync OS)
  ↓ POST /api/blender/process
Blender API (port 3999)
  ↓ TCP JSON
Blender MCP Addon (port 9876)
  ↓ bpy Python
Blender 3D Engine
  ↓ .glb export
Supabase Storage
  ↑ file_url
React 3D Viewer
```

## Job Types

| job_type | Description |
|----------|-------------|
| `generate` | Text-to-3D scene generation |
| `clash` | IFC/RVT clash detection analysis |
| `floor-plan` | Parametric floor plan generation |
| `design-iterate` | Iterative design modification |
