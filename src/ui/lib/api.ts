export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} failed with ${String(response.status)}`);
  }
  return (await response.json()) as T;
}
