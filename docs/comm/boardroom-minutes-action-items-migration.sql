-- Reference DDL for Boardroom minutes + action items and document collaborator.
-- Implement via Drizzle schema in packages/db + pnpm db:generate, or adapt for manual migration.
-- Idempotent (IF NOT EXISTS / IF NOT EXISTS); reversible (drop in reverse order).
-- RLS and org_id on all tables; created_by_principal_id for audit alignment.

-- ─── 1. comm_board_minutes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comm_board_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES comm_board_meeting(id) ON DELETE CASCADE,
  resolution_id UUID NULL REFERENCES comm_board_resolution(id) ON DELETE SET NULL,
  created_by_principal_id UUID NOT NULL REFERENCES iam_principal(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_board_minutes_meeting_id ON comm_board_minutes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_comm_board_minutes_org_id ON comm_board_minutes(org_id);

ALTER TABLE comm_board_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON comm_board_minutes
  AS PERMISSIVE FOR ALL TO public
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- ─── 2. comm_board_action_item ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comm_board_action_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  minute_id UUID NOT NULL REFERENCES comm_board_minutes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  assignee_id UUID NULL REFERENCES iam_principal(id) ON DELETE SET NULL,
  due_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_by_principal_id UUID NOT NULL REFERENCES iam_principal(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_comm_board_action_item_minute_id ON comm_board_action_item(minute_id);
CREATE INDEX IF NOT EXISTS idx_comm_board_action_item_assignee_id ON comm_board_action_item(assignee_id);
CREATE INDEX IF NOT EXISTS idx_comm_board_action_item_due_date ON comm_board_action_item(due_date);
CREATE INDEX IF NOT EXISTS idx_comm_board_action_item_org_id ON comm_board_action_item(org_id);

ALTER TABLE comm_board_action_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON comm_board_action_item
  AS PERMISSIVE FOR ALL TO public
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- ─── 3. comm_document_collaborator ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comm_document_collaborator (
  document_id UUID NOT NULL REFERENCES comm_document(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  principal_id UUID NOT NULL REFERENCES iam_principal(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  added_by_principal_id UUID NOT NULL REFERENCES iam_principal(id) ON DELETE RESTRICT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, principal_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_document_collaborator_document_id ON comm_document_collaborator(document_id);
CREATE INDEX IF NOT EXISTS idx_comm_document_collaborator_principal_id ON comm_document_collaborator(principal_id);
CREATE INDEX IF NOT EXISTS idx_comm_document_collaborator_org_id ON comm_document_collaborator(org_id);

ALTER TABLE comm_document_collaborator ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON comm_document_collaborator
  AS PERMISSIVE FOR ALL TO public
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);
