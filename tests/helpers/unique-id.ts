export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniquePhone(): string {
  const digits = String(Date.now()).slice(-7);
  return `555-${digits}`;
}

export function uniquePlate(): string {
  return `TST-${uniqueSuffix().slice(-6).toUpperCase()}`;
}
