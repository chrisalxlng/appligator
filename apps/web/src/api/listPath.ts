export function listPath(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "" && value !== false)
      search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
