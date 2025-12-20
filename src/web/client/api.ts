export type Status = 'planned' | 'in_progress' | 'done' | 'blocked' | 'superseded' | 'on_hold';
export type Kind = 'super' | 'feature' | 'task';
export type GitHostType = 'github' | 'gitlab' | 'bitbucket';

export interface GitHost {
  type: GitHostType;
  url: string;
}

export interface Track {
  id: string;
  title: string;
  parent_id: string | null;
  summary: string;
  next_prompt: string;
  status: Status;
  worktree: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TrackWithDetails extends Track {
  kind: Kind;
  files: string[];
  children: string[];
  blocks: string[];
  blocked_by: string[];
}

export interface StatusResponse {
  tracks: TrackWithDetails[];
  projectPath: string;
  gitHost: GitHost | null;
}

export interface CreateTrackParams {
  title: string;
  parent_id?: string | null;
  summary?: string;
  next_prompt?: string;
  status?: Status;
  worktree?: string | null;
  files?: string[];
}

export interface UpdateTrackParams {
  summary?: string;
  next_prompt?: string;
  status: Status;
  worktree?: string | null;
  files?: string[];
}

const API_BASE = '/api/web';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((errorData as { error?: string }).error || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE}/status`);
  return handleResponse<StatusResponse>(response);
}

export async function fetchTrack(id: string): Promise<Track> {
  const response = await fetch(`${API_BASE}/tracks/${id}`);
  return handleResponse<Track>(response);
}

export async function createTrack(params: CreateTrackParams): Promise<Track> {
  const response = await fetch(`${API_BASE}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<Track>(response);
}

export async function updateTrack(id: string, params: UpdateTrackParams): Promise<Track> {
  const response = await fetch(`${API_BASE}/tracks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<Track>(response);
}

export async function addFiles(id: string, files: string[]): Promise<void> {
  const response = await fetch(`${API_BASE}/tracks/${id}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function addDependency(blockedId: string, blockingId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tracks/${blockedId}/dependencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocking_id: blockingId }),
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function removeDependency(blockedId: string, blockingId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tracks/${blockedId}/dependencies/${blockingId}`, {
    method: 'DELETE',
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function stopServer(): Promise<void> {
  await fetch(`${API_BASE}/stop`, {
    method: 'POST',
  });
  // Server will stop, so we don't need to handle the response
}
