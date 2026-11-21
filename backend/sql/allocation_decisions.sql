-- Log keputusan HR untuk antrean Requires Reassignment (Approve = Reassigned, Keep Current = Kept).
-- Jalankan sekali di database (misalnya lewat SQL Editor Supabase). Aman dijalankan ulang.
-- decided_by sengaja berupa TEXT (berisi id user) supaya tidak bergantung pada tipe kolom users.id.
CREATE TABLE IF NOT EXISTS allocation_decisions (
  id                SERIAL PRIMARY KEY,
  allocation_id     INTEGER NOT NULL,
  decision          TEXT NOT NULL CHECK (decision IN ('Reassigned', 'Kept')),
  from_employee_id  INTEGER,
  to_employee_id    INTEGER,
  from_score        NUMERIC(5, 1),
  to_score          NUMERIC(5, 1),
  decided_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Satu alokasi hanya boleh punya satu keputusan.
CREATE UNIQUE INDEX IF NOT EXISTS allocation_decisions_allocation_uq ON allocation_decisions (allocation_id);