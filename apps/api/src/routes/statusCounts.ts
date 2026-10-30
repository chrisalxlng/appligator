export function sortByStatus<Status extends string>(
  counts: { status: Status; count: number }[],
  statuses: readonly Status[],
) {
  return counts.toSorted((a, b) => statuses.indexOf(a.status) - statuses.indexOf(b.status));
}
