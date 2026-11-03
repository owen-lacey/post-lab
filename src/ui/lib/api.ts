async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(`${path} failed with ${String(response.status)}`);
  }
  return response;
}

export async function getJson<T>(path: string): Promise<T> {
  return (await (await request(path)).json()) as T;
}

export async function getText(path: string, signal: AbortSignal): Promise<string> {
  return (await request(path, { signal })).text();
}

export async function postJson<T>(path: string): Promise<T> {
  return (await (await request(path, { method: 'POST' })).json()) as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
