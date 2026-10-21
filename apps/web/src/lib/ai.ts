/**
 * Ссылка на страницу помощника с готовым вопросом.
 * Страница /assistant читает параметр ?q= и отправляет вопрос сама.
 */
export function aiUrl(prompt: string): string {
  return `/assistant?q=${encodeURIComponent(prompt)}`;
}
