function normalizeUsernamePart(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function previewUsername(firstName: string, lastName: string): string {
  const first = normalizeUsernamePart(firstName);
  const last = normalizeUsernamePart(lastName);
  if (!first && !last) return '';
  return `${first}.${last}`.slice(0, 160);
}