use chrono::Utc;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use worker::*;
use worker::wasm_bindgen::JsValue;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SnapshotRecord {
    id: String,
    snapshot_date: String,
    currency: String,
    note: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AccountRecord {
    id: String,
    snapshot_id: String,
    name: String,
    account_type: String,
    balance: i64,
    credit_limit: Option<i64>,
    is_debt: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct MonthlyExpenseRecord {
    id: String,
    snapshot_id: String,
    category: String,
    amount: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Account {
    id: String,
    snapshot_id: String,
    name: String,
    account_type: String,
    balance: i64,
    credit_limit: Option<i64>,
    is_debt: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonthlyExpense {
    id: String,
    snapshot_id: String,
    category: String,
    amount: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    id: String,
    snapshot_date: String,
    currency: String,
    note: Option<String>,
    created_at: String,
    accounts: Vec<Account>,
    monthly_expenses: Vec<MonthlyExpense>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateAccountInput {
    name: String,
    account_type: String,
    balance: i64,
    credit_limit: Option<i64>,
    is_debt: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateMonthlyExpenseInput {
    category: String,
    amount: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateSnapshotInput {
    snapshot_date: String,
    currency: Option<String>,
    note: Option<String>,
    accounts: Vec<CreateAccountInput>,
    monthly_expenses: Vec<CreateMonthlyExpenseInput>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardMetrics {
    total_assets: i64,
    total_debt: i64,
    net_worth: i64,
    credit_utilization_ratio: f64,
    monthly_fixed_expenses: i64,
    debt_dependency_ratio: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardResponse {
    latest_snapshot: Option<Snapshot>,
    metrics: DashboardMetrics,
}

#[derive(Debug, Serialize)]
struct SnapshotsResponse {
    snapshots: Vec<Snapshot>,
}

#[derive(Debug, Error)]
enum ApiError {
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("database error: {0}")]
    Database(String),
}

impl From<ApiError> for Error {
    fn from(value: ApiError) -> Self {
        Error::RustError(value.to_string())
    }
}

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    Router::new()
        .get_async("/api/dashboard", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let snapshot = load_latest_snapshot(&db).await?;
            let metrics = build_dashboard_metrics(snapshot.as_ref());
            Response::from_json(&DashboardResponse {
                latest_snapshot: snapshot,
                metrics,
            })
        })
        .get_async("/api/snapshots", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let snapshots = load_snapshots(&db).await?;
            Response::from_json(&SnapshotsResponse { snapshots })
        })
        .post_async("/api/snapshots", |mut req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let payload = req
                .json::<CreateSnapshotInput>()
                .await
                .map_err(|err| ApiError::BadRequest(err.to_string()))?;

            validate_snapshot_input(&payload)?;
            let snapshot = insert_snapshot(&db, payload).await?;
            Response::from_json(&snapshot)
        })
        .run(req, env)
        .await
}

fn validate_snapshot_input(input: &CreateSnapshotInput) -> Result<()> {
    if input.snapshot_date.trim().is_empty() {
        return Err(ApiError::BadRequest("snapshotDate is required".into()).into());
    }

    if input.accounts.is_empty() {
        return Err(ApiError::BadRequest("at least one account is required".into()).into());
    }

    Ok(())
}

async fn load_snapshots(db: &D1Database) -> Result<Vec<Snapshot>> {
    let snapshot_records: Vec<SnapshotRecord> = db
        .prepare(
            "SELECT id,
                    snapshot_date AS snapshotDate,
                    currency,
                    note,
                    created_at AS createdAt
             FROM snapshots
             ORDER BY snapshot_date DESC, created_at DESC",
        )
        .all()
        .await
        .map_err(d1_error)?
        .results()
        .map_err(d1_error)?;

    let mut snapshots = Vec::with_capacity(snapshot_records.len());

    for snapshot in snapshot_records {
        snapshots.push(load_snapshot_by_id(db, &snapshot.id).await?);
    }

    Ok(snapshots)
}

async fn load_latest_snapshot(db: &D1Database) -> Result<Option<Snapshot>> {
    let record = db
        .prepare(
            "SELECT id,
                    snapshot_date AS snapshotDate,
                    currency,
                    note,
                    created_at AS createdAt
             FROM snapshots
             ORDER BY snapshot_date DESC, created_at DESC
             LIMIT 1",
        )
        .first::<SnapshotRecord>(None)
        .await
        .map_err(d1_error)?;

    match record {
        Some(record) => Ok(Some(load_snapshot_by_id(db, &record.id).await?)),
        None => Ok(None),
    }
}

async fn load_snapshot_by_id(db: &D1Database, snapshot_id: &str) -> Result<Snapshot> {
    let record = db
        .prepare(
            "SELECT id,
                    snapshot_date AS snapshotDate,
                    currency,
                    note,
                    created_at AS createdAt
             FROM snapshots
             WHERE id = ?1",
        )
        .bind(&[snapshot_id.into()])
        .map_err(d1_error)?
        .first::<SnapshotRecord>(None)
        .await
        .map_err(d1_error)?
        .ok_or_else(|| ApiError::Database(format!("snapshot not found: {snapshot_id}")))?;

    let accounts: Vec<AccountRecord> = db
        .prepare(
            "SELECT id,
                    snapshot_id AS snapshotId,
                    name,
                    account_type AS accountType,
                    balance,
                    credit_limit AS creditLimit,
                    is_debt AS isDebt
             FROM accounts
             WHERE snapshot_id = ?1
             ORDER BY created_at ASC",
        )
        .bind(&[snapshot_id.into()])
        .map_err(d1_error)?
        .all()
        .await
        .map_err(d1_error)?
        .results()
        .map_err(d1_error)?;

    let monthly_expenses: Vec<MonthlyExpenseRecord> = db
        .prepare(
            "SELECT id,
                    snapshot_id AS snapshotId,
                    category,
                    amount
             FROM monthly_expenses
             WHERE snapshot_id = ?1
             ORDER BY created_at ASC",
        )
        .bind(&[snapshot_id.into()])
        .map_err(d1_error)?
        .all()
        .await
        .map_err(d1_error)?
        .results()
        .map_err(d1_error)?;

    Ok(Snapshot {
        id: record.id,
        snapshot_date: record.snapshot_date,
        currency: record.currency,
        note: record.note,
        created_at: record.created_at,
        accounts: accounts
            .into_iter()
            .map(|account| Account {
                id: account.id,
                snapshot_id: account.snapshot_id,
                name: account.name,
                account_type: account.account_type,
                balance: account.balance,
                credit_limit: account.credit_limit,
                is_debt: account.is_debt == 1,
            })
            .collect(),
        monthly_expenses: monthly_expenses
            .into_iter()
            .map(|expense| MonthlyExpense {
                id: expense.id,
                snapshot_id: expense.snapshot_id,
                category: expense.category,
                amount: expense.amount,
            })
            .collect(),
    })
}

async fn insert_snapshot(db: &D1Database, input: CreateSnapshotInput) -> Result<Snapshot> {
    let snapshot_id = create_id("snapshot");
    let created_at = now_iso();
    let currency = input.currency.unwrap_or_else(|| "JPY".to_string());

    db.prepare(
        "INSERT INTO snapshots (id, snapshot_date, currency, note, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(&[
        snapshot_id.clone().into(),
        input.snapshot_date.clone().into(),
        currency.into(),
        input.note.clone().unwrap_or_default().into(),
        created_at.clone().into(),
    ])
    .map_err(d1_error)?
    .run()
    .await
    .map_err(d1_error)?;

    for (index, account) in input.accounts.iter().enumerate() {
        let account_id = format!("{snapshot_id}_account_{index}");
        db.prepare(
            "INSERT INTO accounts
             (id, snapshot_id, name, account_type, balance, credit_limit, is_debt, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        )
        .bind(&[
            account_id.into(),
            snapshot_id.clone().into(),
            account.name.clone().into(),
            account.account_type.clone().into(),
            js_number(account.balance),
            js_optional_number(account.credit_limit),
            js_number(if account.is_debt { 1 } else { 0 }),
            created_at.clone().into(),
        ])
        .map_err(d1_error)?
        .run()
        .await
        .map_err(d1_error)?;
    }

    for (index, expense) in input.monthly_expenses.iter().enumerate() {
        let expense_id = format!("{snapshot_id}_expense_{index}");
        db.prepare(
            "INSERT INTO monthly_expenses
             (id, snapshot_id, category, amount, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )
        .bind(&[
            expense_id.into(),
            snapshot_id.clone().into(),
            expense.category.clone().into(),
            js_number(expense.amount),
            created_at.clone().into(),
        ])
        .map_err(d1_error)?
        .run()
        .await
        .map_err(d1_error)?;
    }

    load_snapshot_by_id(db, &snapshot_id).await
}

fn build_dashboard_metrics(snapshot: Option<&Snapshot>) -> DashboardMetrics {
    let Some(snapshot) = snapshot else {
        return DashboardMetrics {
            total_assets: 0,
            total_debt: 0,
            net_worth: 0,
            credit_utilization_ratio: 0.0,
            monthly_fixed_expenses: 0,
            debt_dependency_ratio: 0.0,
        };
    };

    let total_assets = snapshot
        .accounts
        .iter()
        .filter(|account| !account.is_debt)
        .map(|account| account.balance)
        .sum::<i64>();

    let total_debt = snapshot
        .accounts
        .iter()
        .filter(|account| account.is_debt)
        .map(|account| account.balance)
        .sum::<i64>();

    let total_credit_limit = snapshot
        .accounts
        .iter()
        .filter_map(|account| account.credit_limit)
        .sum::<i64>();

    let monthly_fixed_expenses = snapshot
        .monthly_expenses
        .iter()
        .map(|expense| expense.amount)
        .sum::<i64>();

    DashboardMetrics {
        total_assets,
        total_debt,
        net_worth: total_assets - total_debt,
        credit_utilization_ratio: if total_credit_limit == 0 {
            0.0
        } else {
            total_debt as f64 / total_credit_limit as f64
        },
        monthly_fixed_expenses,
        debt_dependency_ratio: if total_assets == 0 {
            0.0
        } else {
            total_debt as f64 / total_assets as f64
        },
    }
}

fn d1_error(error: impl std::fmt::Display) -> Error {
    ApiError::Database(error.to_string()).into()
}

fn create_id(prefix: &str) -> String {
    format!("{prefix}_{}", Utc::now().timestamp_millis())
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn js_number(value: i64) -> JsValue {
    JsValue::from_f64(value as f64)
}

fn js_optional_number(value: Option<i64>) -> JsValue {
    value.map(js_number).unwrap_or(JsValue::NULL)
}
