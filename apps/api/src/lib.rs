use chrono::Utc;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use worker::*;
use worker::wasm_bindgen::JsValue;

const ALLOWED_ORIGINS_VAR: &str = "ALLOWED_ORIGINS";

const VALID_CATEGORIES: &[&str] = &[
    "Bank", "CreditCard", "CardLoan", "ConsumerLoan",
    "Investment", "Crypto", "Cash", "Other",
];

fn is_debt_from_category(category: &str) -> bool {
    matches!(category, "CreditCard" | "CardLoan" | "ConsumerLoan")
}

// --- CORS ---

enum CorsOrigin {
    NotBrowser,
    Allowed(String),
    Denied,
}

// --- Account master types ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AccountMasterRecord {
    id: String,
    name: String,
    category: String,
    is_debt: i64,
    credit_limit: Option<i64>,
    display_order: i64,
    is_archived: i64,
    created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AccountMaster {
    id: String,
    name: String,
    category: String,
    is_debt: bool,
    credit_limit: Option<i64>,
    display_order: i64,
    is_archived: bool,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountMastersResponse {
    accounts: Vec<AccountMaster>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateAccountMasterInput {
    name: String,
    category: String,
    credit_limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateAccountMasterInput {
    name: String,
    credit_limit: Option<i64>,
}

// --- Dashboard types ---

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DashboardAccountRecord {
    account_id: String,
    account_name: String,
    category: String,
    is_debt: i64,
    balance: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardAccount {
    account_id: String,
    account_name: String,
    category: String,
    is_debt: bool,
    balance: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardResponse {
    snapshot_date: Option<String>,
    net_worth: i64,
    total_assets: i64,
    total_debt: i64,
    accounts: Vec<DashboardAccount>,
}

// --- Snapshot types ---

#[derive(Debug, Deserialize)]
struct IdRecord {
    id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotDateRecord {
    snapshot_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotRecord {
    id: String,
    snapshot_date: String,
    note: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotBalanceRecord {
    account_id: String,
    balance: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotBalance {
    account_id: String,
    balance: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    id: String,
    snapshot_date: String,
    note: Option<String>,
    created_at: String,
    balances: Vec<SnapshotBalance>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotResponse {
    snapshot: Option<Snapshot>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BalanceInput {
    account_id: String,
    balance: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateSnapshotInput {
    snapshot_date: String,
    note: Option<String>,
    balances: Vec<BalanceInput>,
}

// --- Error ---

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

// --- Main handler ---

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let cors_origin = cors_origin(&req, &env)?;

    if req.method() == Method::Options {
        return match cors_origin {
            CorsOrigin::Allowed(origin) => add_cors_headers(Response::empty()?, &origin),
            CorsOrigin::NotBrowser => Response::empty(),
            CorsOrigin::Denied => Response::error("CORS origin is not allowed", 403),
        };
    }

    if matches!(cors_origin, CorsOrigin::Denied) {
        return Response::error("CORS origin is not allowed", 403);
    }

    let response = Router::new()
        // Dashboard
        .get_async("/api/dashboard", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let dashboard = load_dashboard(&db).await?;
            Response::from_json(&dashboard)
        })
        // Account masters
        .get_async("/api/accounts", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let accounts = list_account_masters(&db).await?;
            Response::from_json(&AccountMastersResponse { accounts })
        })
        .post_async("/api/accounts", |mut req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let payload = req
                .json::<CreateAccountMasterInput>()
                .await
                .map_err(|err| ApiError::BadRequest(err.to_string()))?;
            validate_create_account_master(&payload)?;
            let account = insert_account_master(&db, payload).await?;
            Response::from_json(&account)
        })
        .patch_async("/api/accounts/:id", |mut req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let id = ctx.param("id").map(|s| s.to_string())
                .ok_or_else(|| ApiError::BadRequest("missing id".into()))?;
            let payload = req
                .json::<UpdateAccountMasterInput>()
                .await
                .map_err(|err| ApiError::BadRequest(err.to_string()))?;
            validate_update_account_master(&payload)?;
            let account = update_account_master(&db, &id, payload).await?;
            Response::from_json(&account)
        })
        .delete_async("/api/accounts/:id", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let id = ctx.param("id").map(|s| s.to_string())
                .ok_or_else(|| ApiError::BadRequest("missing id".into()))?;
            archive_account_master(&db, &id).await?;
            Response::empty()
        })
        // Snapshots
        .get_async("/api/snapshots/:yearMonth", |_req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let year_month = ctx.param("yearMonth").map(|s| s.to_string())
                .ok_or_else(|| ApiError::BadRequest("missing yearMonth".into()))?;
            let snapshot = load_snapshot(&db, &year_month).await?;
            Response::from_json(&SnapshotResponse { snapshot })
        })
        .post_async("/api/snapshots", |mut req, ctx| async move {
            let db = ctx.env.d1("DB")?;
            let payload = req
                .json::<CreateSnapshotInput>()
                .await
                .map_err(|err| ApiError::BadRequest(err.to_string()))?;
            validate_snapshot_input(&payload)?;
            let snapshot = upsert_snapshot(&db, payload).await?;
            Response::from_json(&snapshot)
        })
        .run(req, env)
        .await?;

    match cors_origin {
        CorsOrigin::Allowed(origin) => add_cors_headers(response, &origin),
        CorsOrigin::NotBrowser | CorsOrigin::Denied => Ok(response),
    }
}

// --- CORS helpers ---

fn cors_origin(req: &Request, env: &Env) -> Result<CorsOrigin> {
    let Some(origin) = req.headers().get("Origin")? else {
        return Ok(CorsOrigin::NotBrowser);
    };

    let Ok(allowed_origins) = env.var(ALLOWED_ORIGINS_VAR) else {
        return Ok(CorsOrigin::Denied);
    };

    let is_allowed = allowed_origins
        .to_string()
        .split(',')
        .map(str::trim)
        .any(|allowed| allowed == origin);

    if is_allowed {
        Ok(CorsOrigin::Allowed(origin))
    } else {
        Ok(CorsOrigin::Denied)
    }
}

fn add_cors_headers(response: Response, origin: &str) -> Result<Response> {
    let headers = response.headers().clone();
    headers.set("Access-Control-Allow-Origin", origin)?;
    headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")?;
    headers.set("Access-Control-Allow-Headers", "Content-Type")?;
    headers.set("Vary", "Origin")?;
    Ok(response.with_headers(headers))
}

// --- Account master validation ---

fn validate_create_account_master(input: &CreateAccountMasterInput) -> Result<()> {
    if input.name.trim().is_empty() {
        return Err(ApiError::BadRequest("name is required".into()).into());
    }
    if !VALID_CATEGORIES.contains(&input.category.as_str()) {
        return Err(ApiError::BadRequest(format!("invalid category: {}", input.category)).into());
    }
    Ok(())
}

fn validate_update_account_master(input: &UpdateAccountMasterInput) -> Result<()> {
    if input.name.trim().is_empty() {
        return Err(ApiError::BadRequest("name is required".into()).into());
    }
    Ok(())
}

// --- Account master DB ---

fn account_master_from_record(r: AccountMasterRecord) -> AccountMaster {
    AccountMaster {
        id: r.id,
        name: r.name,
        category: r.category,
        is_debt: r.is_debt == 1,
        credit_limit: r.credit_limit,
        display_order: r.display_order,
        is_archived: r.is_archived == 1,
        created_at: r.created_at,
    }
}

async fn list_account_masters(db: &D1Database) -> Result<Vec<AccountMaster>> {
    let records: Vec<AccountMasterRecord> = db
        .prepare(
            "SELECT id,
                    name,
                    category,
                    is_debt       AS isDebt,
                    credit_limit  AS creditLimit,
                    display_order AS displayOrder,
                    is_archived   AS isArchived,
                    created_at    AS createdAt
             FROM account_masters
             WHERE is_archived = 0
             ORDER BY display_order ASC, created_at ASC",
        )
        .all()
        .await
        .map_err(d1_error)?
        .results()
        .map_err(d1_error)?;

    Ok(records.into_iter().map(account_master_from_record).collect())
}

async fn load_account_master_by_id(db: &D1Database, id: &str) -> Result<AccountMaster> {
    let record = db
        .prepare(
            "SELECT id,
                    name,
                    category,
                    is_debt       AS isDebt,
                    credit_limit  AS creditLimit,
                    display_order AS displayOrder,
                    is_archived   AS isArchived,
                    created_at    AS createdAt
             FROM account_masters
             WHERE id = ?1",
        )
        .bind(&[id.into()])
        .map_err(d1_error)?
        .first::<AccountMasterRecord>(None)
        .await
        .map_err(d1_error)?
        .ok_or_else(|| ApiError::Database(format!("account not found: {id}")))?;

    Ok(account_master_from_record(record))
}

async fn insert_account_master(
    db: &D1Database,
    input: CreateAccountMasterInput,
) -> Result<AccountMaster> {
    let id = create_id("acct");
    let created_at = now_iso();
    let is_debt = if is_debt_from_category(&input.category) { 1i64 } else { 0i64 };

    db.prepare(
        "INSERT INTO account_masters
         (id, name, category, is_debt, credit_limit, display_order, is_archived, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, ?6)",
    )
    .bind(&[
        id.clone().into(),
        input.name.trim().to_string().into(),
        input.category.clone().into(),
        js_number(is_debt),
        js_optional_number(input.credit_limit),
        created_at.into(),
    ])
    .map_err(d1_error)?
    .run()
    .await
    .map_err(d1_error)?;

    load_account_master_by_id(db, &id).await
}

async fn update_account_master(
    db: &D1Database,
    id: &str,
    input: UpdateAccountMasterInput,
) -> Result<AccountMaster> {
    db.prepare(
        "UPDATE account_masters
         SET name = ?1, credit_limit = ?2
         WHERE id = ?3 AND is_archived = 0",
    )
    .bind(&[
        input.name.trim().to_string().into(),
        js_optional_number(input.credit_limit),
        id.into(),
    ])
    .map_err(d1_error)?
    .run()
    .await
    .map_err(d1_error)?;

    load_account_master_by_id(db, id).await
}

async fn archive_account_master(db: &D1Database, id: &str) -> Result<()> {
    db.prepare("UPDATE account_masters SET is_archived = 1 WHERE id = ?1")
        .bind(&[id.into()])
        .map_err(d1_error)?
        .run()
        .await
        .map_err(d1_error)?;
    Ok(())
}

// --- Dashboard DB ---

async fn load_dashboard(db: &D1Database) -> Result<DashboardResponse> {
    let latest = db
        .prepare("SELECT snapshot_date AS snapshotDate FROM snapshots ORDER BY snapshot_date DESC LIMIT 1")
        .first::<SnapshotDateRecord>(None)
        .await
        .map_err(d1_error)?;

    let Some(latest) = latest else {
        return Ok(DashboardResponse {
            snapshot_date: None,
            net_worth: 0,
            total_assets: 0,
            total_debt: 0,
            accounts: vec![],
        });
    };

    let records: Vec<DashboardAccountRecord> = db
        .prepare(
            "SELECT sb.account_id AS accountId,
                    am.name        AS accountName,
                    am.category,
                    am.is_debt     AS isDebt,
                    sb.balance
             FROM snapshots s
             JOIN snapshot_balances sb ON sb.snapshot_id = s.id
             JOIN account_masters am  ON am.id = sb.account_id
             WHERE s.snapshot_date = ?1
             ORDER BY am.is_debt ASC, am.display_order ASC, am.created_at ASC",
        )
        .bind(&[latest.snapshot_date.clone().into()])
        .map_err(d1_error)?
        .all()
        .await
        .map_err(d1_error)?
        .results()
        .map_err(d1_error)?;

    let total_assets: i64 = records.iter().filter(|a| a.is_debt == 0).map(|a| a.balance).sum();
    let total_debt: i64 = records.iter().filter(|a| a.is_debt == 1).map(|a| a.balance).sum();

    Ok(DashboardResponse {
        snapshot_date: Some(latest.snapshot_date),
        net_worth: total_assets - total_debt,
        total_assets,
        total_debt,
        accounts: records
            .into_iter()
            .map(|r| DashboardAccount {
                account_id: r.account_id,
                account_name: r.account_name,
                category: r.category,
                is_debt: r.is_debt == 1,
                balance: r.balance,
            })
            .collect(),
    })
}

// --- Snapshot validation ---

fn validate_snapshot_input(input: &CreateSnapshotInput) -> Result<()> {
    if !is_valid_year_month(&input.snapshot_date) {
        return Err(ApiError::BadRequest("snapshotDate must be YYYY-MM format".into()).into());
    }
    Ok(())
}

fn is_valid_year_month(s: &str) -> bool {
    let parts: Vec<&str> = s.splitn(2, '-').collect();
    if parts.len() != 2 {
        return false;
    }
    let year_ok = parts[0].len() == 4 && parts[0].chars().all(|c| c.is_ascii_digit());
    let month_ok = parts[1].len() == 2
        && parts[1].chars().all(|c| c.is_ascii_digit())
        && matches!(parts[1], "01"|"02"|"03"|"04"|"05"|"06"|"07"|"08"|"09"|"10"|"11"|"12");
    year_ok && month_ok
}

// --- Snapshot DB ---

async fn load_snapshot(db: &D1Database, year_month: &str) -> Result<Option<Snapshot>> {
    let record = db
        .prepare(
            "SELECT id,
                    snapshot_date AS snapshotDate,
                    note,
                    created_at    AS createdAt
             FROM snapshots
             WHERE snapshot_date = ?1",
        )
        .bind(&[year_month.into()])
        .map_err(d1_error)?
        .first::<SnapshotRecord>(None)
        .await
        .map_err(d1_error)?;

    match record {
        None => Ok(None),
        Some(r) => {
            let balances = load_snapshot_balances(db, &r.id).await?;
            Ok(Some(Snapshot {
                id: r.id,
                snapshot_date: r.snapshot_date,
                note: r.note,
                created_at: r.created_at,
                balances,
            }))
        }
    }
}

async fn load_snapshot_balances(db: &D1Database, snapshot_id: &str) -> Result<Vec<SnapshotBalance>> {
    let records: Vec<SnapshotBalanceRecord> = db
        .prepare(
            "SELECT account_id AS accountId, balance
             FROM snapshot_balances
             WHERE snapshot_id = ?1",
        )
        .bind(&[snapshot_id.into()])
        .map_err(d1_error)?
        .all()
        .await
        .map_err(d1_error)?
        .results()
        .map_err(d1_error)?;

    Ok(records
        .into_iter()
        .map(|r| SnapshotBalance { account_id: r.account_id, balance: r.balance })
        .collect())
}

async fn upsert_snapshot(db: &D1Database, input: CreateSnapshotInput) -> Result<Snapshot> {
    let created_at = now_iso();

    let existing_id = db
        .prepare("SELECT id FROM snapshots WHERE snapshot_date = ?1")
        .bind(&[input.snapshot_date.clone().into()])
        .map_err(d1_error)?
        .first::<IdRecord>(None)
        .await
        .map_err(d1_error)?
        .map(|r| r.id);

    let snapshot_id = match existing_id {
        Some(id) => {
            db.prepare(
                "UPDATE snapshots SET note = ?1, created_at = ?2 WHERE id = ?3",
            )
            .bind(&[
                js_optional_str(input.note.as_deref()),
                created_at.clone().into(),
                id.clone().into(),
            ])
            .map_err(d1_error)?
            .run()
            .await
            .map_err(d1_error)?;

            db.prepare("DELETE FROM snapshot_balances WHERE snapshot_id = ?1")
                .bind(&[id.clone().into()])
                .map_err(d1_error)?
                .run()
                .await
                .map_err(d1_error)?;

            id
        }
        None => {
            let id = create_id("snap");
            db.prepare(
                "INSERT INTO snapshots (id, snapshot_date, note, created_at)
                 VALUES (?1, ?2, ?3, ?4)",
            )
            .bind(&[
                id.clone().into(),
                input.snapshot_date.clone().into(),
                js_optional_str(input.note.as_deref()),
                created_at.clone().into(),
            ])
            .map_err(d1_error)?
            .run()
            .await
            .map_err(d1_error)?;
            id
        }
    };

    for (i, bal) in input.balances.iter().enumerate() {
        let bal_id = format!("{snapshot_id}_b{i}");
        db.prepare(
            "INSERT INTO snapshot_balances (id, snapshot_id, account_id, balance, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )
        .bind(&[
            bal_id.into(),
            snapshot_id.clone().into(),
            bal.account_id.clone().into(),
            js_number(bal.balance),
            created_at.clone().into(),
        ])
        .map_err(d1_error)?
        .run()
        .await
        .map_err(d1_error)?;
    }

    load_snapshot(db, &input.snapshot_date)
        .await?
        .ok_or_else(|| ApiError::Database("snapshot not found after upsert".into()).into())
}

// --- Utilities ---

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

fn js_optional_str(value: Option<&str>) -> JsValue {
    match value {
        Some(s) if !s.trim().is_empty() => s.to_string().into(),
        _ => JsValue::NULL,
    }
}
