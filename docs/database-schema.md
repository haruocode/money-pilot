# データベーススキーマ

## 現在のスキーマ（v1）

### `snapshots`

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | |
| `snapshot_date` | TEXT | NOT NULL | 日付（フォーマット自由） |
| `currency` | TEXT | NOT NULL DEFAULT 'JPY' | |
| `note` | TEXT | | |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

### `accounts`

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | |
| `snapshot_id` | TEXT | NOT NULL, FK → `snapshots.id` CASCADE | |
| `name` | TEXT | NOT NULL | |
| `account_type` | TEXT | NOT NULL | |
| `balance` | INTEGER | NOT NULL | 円（最小単位） |
| `credit_limit` | INTEGER | | nullable |
| `is_debt` | INTEGER | NOT NULL DEFAULT 0 | 0=資産, 1=負債 |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

### `monthly_expenses`

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | |
| `snapshot_id` | TEXT | NOT NULL, FK → `snapshots.id` CASCADE | |
| `category` | TEXT | NOT NULL | |
| `amount` | INTEGER | NOT NULL | 円（最小単位） |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

### インデックス

```sql
CREATE INDEX idx_accounts_snapshot_id ON accounts(snapshot_id);
CREATE INDEX idx_monthly_expenses_snapshot_id ON monthly_expenses(snapshot_id);
CREATE INDEX idx_snapshots_snapshot_date ON snapshots(snapshot_date DESC);
```

---

## 課題

- `accounts.snapshot_id` により、口座はスナップショットにフルコピーされる設計になっている
- 毎回全口座を入力し直す必要があり、「変わったところだけ更新」ができない
- `snapshot_date` のフォーマットが自由なため、年月単位の比較が難しい

---

## 新しいスキーマ案（v2）

### `accounts`（口座マスター）

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | |
| `name` | TEXT | NOT NULL | 例: "三菱UFJ普通", "楽天カード" |
| `category` | TEXT | NOT NULL | Bank \| CreditCard \| CardLoan \| Investment \| Crypto \| Cash \| Other |
| `is_debt` | INTEGER | NOT NULL | 0=資産, 1=負債 |
| `credit_limit` | INTEGER | | クレカ・ローンの限度額 |
| `display_order` | INTEGER | NOT NULL DEFAULT 0 | 表示順 |
| `is_archived` | INTEGER | NOT NULL DEFAULT 0 | 0=有効, 1=アーカイブ済 |
| `created_at` | TEXT | NOT NULL | |

### `snapshots`（月次チェックイン）

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | |
| `snapshot_date` | TEXT | NOT NULL | `"YYYY-MM"` 形式（年月） |
| `note` | TEXT | | |
| `created_at` | TEXT | NOT NULL | |

### `snapshot_balances`（その月の残高記録）

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | |
| `snapshot_id` | TEXT | NOT NULL, FK → `snapshots.id` | |
| `account_id` | TEXT | NOT NULL, FK → `accounts(id)` | |
| `balance` | INTEGER | NOT NULL | 円（最小単位） |
| `created_at` | TEXT | NOT NULL | |

ユニーク制約: `(snapshot_id, account_id)`

### v1 からの変更点

| v1 | v2 |
|---|---|
| `accounts` がスナップショットに紐付く（フルコピー） | `accounts` が永続マスター、残高のみ `snapshot_balances` に記録 |
| `snapshot_date` が自由形式の日付文字列 | `"YYYY-MM"` 形式の年月文字列に統一 |
| `monthly_expenses` がスナップショットに含まれる | 一旦スコープ外（シンプルに） |
| `currency` カラムあり | 常にJPY（省略） |
