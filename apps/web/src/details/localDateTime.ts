function padded(value: number) {
  return String(value).padStart(2, "0");
}

export function toLocalDateTime(isoDateTime: string) {
  const date = new Date(isoDateTime);
  const day = `${date.getFullYear()}-${padded(date.getMonth() + 1)}-${padded(date.getDate())}`;
  return `${day}T${padded(date.getHours())}:${padded(date.getMinutes())}`;
}

export function toIsoDateTime(localDateTime: string) {
  return new Date(localDateTime).toISOString();
}
