-- Auto-fixer Database Schema
-- Run this SQL against your Supabase or self-hosted PostgreSQL instance.

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. vehicles
--    Master list of every vehicle configuration.
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vin_prefix  VARCHAR(10) NOT NULL,
  year        INT         NOT NULL,
  make        VARCHAR(100) NOT NULL,
  model       VARCHAR(100) NOT NULL,
  engine      VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_vin_prefix ON vehicles (vin_prefix);
CREATE INDEX IF NOT EXISTS idx_vehicles_model      ON vehicles (model);

-- ============================================================
-- 2. guides
--    Repair guides linked to a specific vehicle.
-- ============================================================
CREATE TABLE IF NOT EXISTS guides (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID        NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(100) NOT NULL,  -- e.g. "Electrical", "Brakes", "Engine"
  difficulty  VARCHAR(50)  NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  is_premium  BOOLEAN      NOT NULL DEFAULT FALSE,
  source      VARCHAR(255) NOT NULL,  -- "Factory API" or "User_ID_xxxx"
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guides_vehicle_id ON guides (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_guides_category   ON guides (category);

-- Full-Text Search index on guides title for symptom search
CREATE INDEX IF NOT EXISTS idx_guides_title_fts
  ON guides USING GIN (to_tsvector('english', title));

-- ============================================================
-- 3. guide_steps
--    Chronologically ordered steps that make up a guide.
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_steps (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id     UUID  NOT NULL REFERENCES guides (id) ON DELETE CASCADE,
  step_number  INT   NOT NULL,
  instruction  TEXT  NOT NULL,
  image_url    VARCHAR(2048),
  video_url    VARCHAR(2048),
  UNIQUE (guide_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_guide_steps_guide_id ON guide_steps (guide_id);

-- ============================================================
-- 4. parts_and_tools
--    Master catalogue of parts and tools with affiliate URLs.
-- ============================================================
CREATE TABLE IF NOT EXISTS parts_and_tools (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name      VARCHAR(255) NOT NULL,
  item_type      VARCHAR(50)  NOT NULL CHECK (item_type IN ('part', 'tool')),
  affiliate_url  VARCHAR(2048) NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. guide_items  (junction table)
--    Many-to-many mapping: guides <-> parts_and_tools
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_items (
  guide_id         UUID NOT NULL REFERENCES guides (id) ON DELETE CASCADE,
  part_or_tool_id  UUID NOT NULL REFERENCES parts_and_tools (id) ON DELETE CASCADE,
  PRIMARY KEY (guide_id, part_or_tool_id)
);

CREATE INDEX IF NOT EXISTS idx_guide_items_guide_id ON guide_items (guide_id);

-- ============================================================
-- 6. subscriptions
--    Tracks active premium subscriptions per user.
--    user_id references Supabase auth.users (managed by Supabase Auth).
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  status      VARCHAR(50) NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
