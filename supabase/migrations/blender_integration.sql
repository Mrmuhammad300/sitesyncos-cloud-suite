-- Blender MCP Integration Tables
-- Supports AI-powered 3D generation, clash detection, and floor plan variants

CREATE TABLE IF NOT EXISTS blender_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('generate', 'clash', 'floor-plan', 'design-iterate')),
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_url TEXT,
  result_metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blender_jobs_project_id_idx ON blender_jobs(project_id);
CREATE INDEX IF NOT EXISTS blender_jobs_user_id_idx ON blender_jobs(user_id);
CREATE INDEX IF NOT EXISTS blender_jobs_status_idx ON blender_jobs(status);

ALTER TABLE blender_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own blender jobs" ON blender_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own blender jobs" ON blender_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own blender jobs" ON blender_jobs FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generated_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blender_job_id UUID REFERENCES blender_jobs(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('glb', 'gltf', 'png', 'svg')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  layers JSONB,   -- [{ name: string, visible: boolean, color: string }]
  bounds JSONB,   -- { width: number, height: number, depth: number }
  element_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_models_job_idx ON generated_models(blender_job_id);

ALTER TABLE generated_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view generated models" ON generated_models
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM blender_jobs WHERE id = blender_job_id AND user_id = auth.uid())
  );
CREATE POLICY "Authenticated users can insert generated models" ON generated_models
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM blender_jobs WHERE id = blender_job_id AND user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS floor_plan_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  blender_job_id UUID REFERENCES blender_jobs(id) ON DELETE SET NULL,
  variant_number INT NOT NULL DEFAULT 1,
  variant_name TEXT,
  layout_json JSONB NOT NULL,  -- { rooms: [...], walls: [...], doors: [...], dimensions: {} }
  metrics JSONB,               -- { total_area: number, efficiency_ratio: number, room_count: number }
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS floor_plan_variants_project_idx ON floor_plan_variants(project_id);

ALTER TABLE floor_plan_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can select floor plan variants" ON floor_plan_variants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert floor plan variants" ON floor_plan_variants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update floor plan variants" ON floor_plan_variants FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete floor plan variants" ON floor_plan_variants FOR DELETE USING (auth.role() = 'authenticated');
