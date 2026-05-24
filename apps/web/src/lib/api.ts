import {
  createSnapshotInputSchema,
  dashboardResponseSchema,
  snapshotSchema,
  snapshotsResponseSchema,
  type CreateSnapshotInput,
  type DashboardResponse,
  type SnapshotsResponse,
} from "@money-pilot/shared";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

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
      detail ? `Request failed with status ${response.status}: ${detail}` : `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const json = await readJson<unknown>(await fetch(buildApiUrl("/api/dashboard")));
  return dashboardResponseSchema.parse(json);
}

export async function fetchSnapshots(): Promise<SnapshotsResponse> {
  const json = await readJson<unknown>(await fetch(buildApiUrl("/api/snapshots")));
  return snapshotsResponseSchema.parse(json);
}

export async function createSnapshot(input: CreateSnapshotInput) {
  const payload = createSnapshotInputSchema.parse(input);

  const json = await readJson<unknown>(
    await fetch(buildApiUrl("/api/snapshots"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  );

  return snapshotSchema.parse(json);
}
