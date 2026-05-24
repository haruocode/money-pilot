-- Drop old snapshot-scoped tables (replaced by new design)
DROP TABLE IF EXISTS monthly_expenses;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS snapshots;

-- Monthly check-in snapshots
CREATE TABLE snapshots (
  id            TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL UNIQUE, -- "YYYY-MM" format
  note          TEXT,
  created_at    TEXT NOT NULL
);

-- Point-in-time balance per account per snapshot
CREATE TABLE snapshot_balances (
  id          TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  account_id  TEXT NOT NULL REFERENCES account_masters(id),
  balance     INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  UNIQUE(snapshot_id, account_id)
);

CREATE INDEX idx_snapshots_snapshot_date ON snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshot_balances_snapshot_id ON snapshot_balances(snapshot_id);
