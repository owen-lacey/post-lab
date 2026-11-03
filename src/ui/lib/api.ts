async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const detail = (await response.text()).trim();
    const status = `${path} failed with ${String(response.status)}`;
    throw new Error(detail === '' ? status : `${status}: ${detail}`);
  }
  return response;
}

export async function getJson<T>(path: string): Promise<T> {
  return (await (await request(path)).json()) as T;
}

export async function getText(path: string, signal: AbortSignal): Promise<string> {
  return (await request(path, { signal })).text();
}

export async function post(path: string): Promise<void> {
  await request(path, { method: 'POST' });
}

export async function postJson<T>(path: string): Promise<T> {
  return (await (await request(path, { method: 'POST' })).json()) as T;
}

/** Posts a file as the raw request body, with its type as the `Content-Type`. */
export async function postFile<T>(path: string, file: Blob): Promise<T> {
  const response = await request(path, {
    method: 'POST',
    headers: { 'content-type': file.type },
    body: file,
  });
  return (await response.json()) as T;
}

export async function putJson(path: string, body: unknown): Promise<void> {
  await request(path, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteRequest(path: string): Promise<void> {
  await request(path, { method: 'DELETE' });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
