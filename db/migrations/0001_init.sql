CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'JPY',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  balance INTEGER NOT NULL,
  credit_limit INTEGER,
  is_debt INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

CREATE TABLE monthly_expenses (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

CREATE INDEX idx_accounts_snapshot_id ON accounts(snapshot_id);
CREATE INDEX idx_monthly_expenses_snapshot_id ON monthly_expenses(snapshot_id);
CREATE INDEX idx_snapshots_snapshot_date ON snapshots(snapshot_date DESC);
