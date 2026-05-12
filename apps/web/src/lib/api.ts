import {
  createSnapshotInputSchema,
  dashboardResponseSchema,
  snapshotSchema,
  snapshotsResponseSchema,
  type CreateSnapshotInput,
  type DashboardResponse,
  type SnapshotsResponse,
} from "@money-pilot/shared";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const json = await readJson<unknown>(await fetch("/api/dashboard"));
  return dashboardResponseSchema.parse(json);
}

export async function fetchSnapshots(): Promise<SnapshotsResponse> {
  const json = await readJson<unknown>(await fetch("/api/snapshots"));
  return snapshotsResponseSchema.parse(json);
}

export async function createSnapshot(input: CreateSnapshotInput) {
  const payload = createSnapshotInputSchema.parse(input);

  const json = await readJson<unknown>(
    await fetch("/api/snapshots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  );

  return snapshotSchema.parse(json);
}
