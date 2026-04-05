-- Floor plans table: one row per building level/floor
CREATE TABLE IF NOT EXISTS floor_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  level_name  TEXT NOT NULL,
  level_number INTEGER NOT NULL DEFAULT 0,
  area_sqft   NUMERIC(10, 2),
  room_count  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Review', 'Final')),
  layout_json JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "floor_plans_select" ON floor_plans FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "floor_plans_insert" ON floor_plans FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "floor_plans_update" ON floor_plans FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "floor_plans_delete" ON floor_plans FOR DELETE USING (auth.role() = 'authenticated');

-- Rooms table: rooms within a floor plan
CREATE TABLE IF NOT EXISTS floor_plan_rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id  UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  room_type      TEXT NOT NULL DEFAULT 'Residential',
  area_sqft      NUMERIC(10, 2),
  dimensions     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE floor_plan_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "floor_plan_rooms_select" ON floor_plan_rooms FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "floor_plan_rooms_insert" ON floor_plan_rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "floor_plan_rooms_update" ON floor_plan_rooms FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "floor_plan_rooms_delete" ON floor_plan_rooms FOR DELETE USING (auth.role() = 'authenticated');

-- FK indexes
CREATE INDEX IF NOT EXISTS idx_floor_plans_project_id ON floor_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_floor_plan_rooms_floor_plan_id ON floor_plan_rooms(floor_plan_id);
