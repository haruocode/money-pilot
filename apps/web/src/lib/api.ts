import {
  accountMasterSchema,
  accountMastersResponseSchema,
  createAccountMasterInputSchema,
  createSnapshotInputSchema,
  dashboardResponseSchema,
  snapshotResponseSchema,
  snapshotSchema,
  updateAccountMasterInputSchema,
  type AccountMaster,
  type AccountMastersResponse,
  type CreateAccountMasterInput,
  type CreateSnapshotInput,
  type DashboardResponse,
  type Snapshot,
  type SnapshotResponse,
  type UpdateAccountMasterInput,
} from "@money-pilot/shared";

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

function buildApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? JSON.stringify(await response.json())
      : await response.text();
    const detail = body.trim();
    throw new Error(
      detail
        ? `Request failed with status ${response.status}: ${detail}`
        : `Request failed with status ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

// --- Dashboard ---

export async function fetchDashboard(): Promise<DashboardResponse> {
  const json = await readJson<unknown>(await fetch(buildApiUrl("/api/dashboard")));
  return dashboardResponseSchema.parse(json);
}

// --- Accounts ---

export async function fetchAccounts(): Promise<AccountMastersResponse> {
  const json = await readJson<unknown>(await fetch(buildApiUrl("/api/accounts")));
  return accountMastersResponseSchema.parse(json);
}

export async function createAccount(input: CreateAccountMasterInput): Promise<AccountMaster> {
  const payload = createAccountMasterInputSchema.parse(input);
  const json = await readJson<unknown>(
    await fetch(buildApiUrl("/api/accounts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return accountMasterSchema.parse(json);
}

export async function updateAccount(
  id: string,
  input: UpdateAccountMasterInput,
): Promise<AccountMaster> {
  const payload = updateAccountMasterInputSchema.parse(input);
  const json = await readJson<unknown>(
    await fetch(buildApiUrl(`/api/accounts/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return accountMasterSchema.parse(json);
}

export async function archiveAccount(id: string): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/accounts/${id}`), { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

// --- Snapshots ---

export async function fetchSnapshot(yearMonth: string): Promise<SnapshotResponse> {
  const json = await readJson<unknown>(
    await fetch(buildApiUrl(`/api/snapshots/${yearMonth}`)),
  );
  return snapshotResponseSchema.parse(json);
}

export async function saveSnapshot(input: CreateSnapshotInput): Promise<Snapshot> {
  const payload = createSnapshotInputSchema.parse(input);
  const json = await readJson<unknown>(
    await fetch(buildApiUrl("/api/snapshots"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return snapshotSchema.parse(json);
}
