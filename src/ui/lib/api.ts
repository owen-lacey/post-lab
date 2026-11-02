export class UnauthorizedError extends Error {
  constructor() {
    super('Not signed in');
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (response.status === 401) {
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    throw new Error(`${path} failed with ${String(response.status)}`);
  }
  return (await response.json()) as T;
}
