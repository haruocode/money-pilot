CREATE TABLE account_masters (
  id            TEXT    PRIMARY KEY,
  name          TEXT    NOT NULL,
  category      TEXT    NOT NULL,
  is_debt       INTEGER NOT NULL DEFAULT 0,
  credit_limit  INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_archived   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL
);

CREATE INDEX idx_account_masters_display_order ON account_masters(is_archived, display_order ASC);
