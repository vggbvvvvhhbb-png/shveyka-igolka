/**
 * Чтение строк каталога независимо от регистра ключей: сиды (JSON) хранят
 * snake_case, Drizzle-строки могут отдавать camelCase.
 */
export type Row = Readonly<Record<string, unknown>>;

const camel = (s: string): string => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Значение поля по имени в snake_case — с запасным вариантом в camelCase. */
export function field(row: Row, snake: string): unknown {
  return snake in row ? row[snake] : row[camel(snake)];
}

/** Строковое поле; если значения нет — пустая строка. */
export function str(row: Row, snake: string): string {
  const v = field(row, snake);
  return typeof v === "string" ? v : "";
}

/** Список строк; не-массивы и не-строки отбрасываются. */
export function strList(row: Row, snake: string): string[] {
  const v = field(row, snake);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
