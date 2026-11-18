export async function readJson<T = any>(response: Response): Promise<T> {
  const body = await response.text();

  if (!body.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`Server returned invalid JSON (HTTP ${response.status})`);
  }
}
