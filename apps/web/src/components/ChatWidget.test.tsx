import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ChatWidget } from "./ChatWidget";

// next/link вне контекста Next-роутера рендерить нельзя — подменяем его
// обычной ссылкой: в тесте важно проверить href и текст, а не работу роутера.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

/** Ответ провайдера: поток с одним куском текста и заголовком со списком slug. */
function streamingResponse(text: string, allowedSlugs?: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });

  const headers = new Headers();
  if (allowedSlugs !== undefined) {
    headers.set("X-Context-Slugs", allowedSlugs);
  }

  return new Response(stream, { status: 200, headers });
}

/** Ответ с ошибкой: JSON с полем error. */
function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getInput(): HTMLTextAreaElement {
  return screen.getByRole("textbox") as HTMLTextAreaElement;
}

function typeQuestion(text: string): void {
  fireEvent.change(getInput(), { target: { value: text } });
}

describe("ChatWidget", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("показывает текст ответа ассистента", async () => {
    vi.mocked(fetch).mockResolvedValue(streamingResponse("Для джинсы нужна игла для джинсов."));

    render(<ChatWidget />);
    typeQuestion("Какая игла нужна для джинсы?");
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByText(/нужна игла для джинсов/)).toBeInTheDocument();
    });
  });

  it("делает ссылкой только slug из заголовка X-Context-Slugs", async () => {
    vi.mocked(fetch).mockResolvedValue(
      streamingResponse(
        "Возьмите [Джинса](/fabrics/denim) или [Шёлк](/fabrics/silk-ghost).",
        "fabrics/denim"
      )
    );

    render(<ChatWidget />);
    typeQuestion("Что взять?");
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByText("Джинса")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: "Джинса" });
    expect(link).toHaveAttribute("href", "/fabrics/denim");

    // Чужой slug остаётся обычным текстом — ссылка на несуществующую запись
    // пользователю не нужна.
    expect(screen.queryByRole("link", { name: "Шёлк" })).not.toBeInTheDocument();
    expect(screen.getByText(/Шёлк/)).toBeInTheDocument();
  });

  it("при пустом заголовке не делает ссылок вовсе", async () => {
    vi.mocked(fetch).mockResolvedValue(streamingResponse("Смотрите [Джинса](/fabrics/denim).", ""));

    render(<ChatWidget />);
    typeQuestion("Что взять?");
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByText(/Смотрите/)).toBeInTheDocument();
    });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("показывает ошибку 429", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(429, "Слишком много запросов, подождите минуту")
    );

    render(<ChatWidget />);
    typeQuestion("Что взять?");
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Слишком много запросов");
    });
  });

  it("показывает ошибку 500", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(500, "Не удалось получить ответ, попробуйте позже")
    );

    render(<ChatWidget />);
    typeQuestion("Что взять?");
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Не удалось получить ответ");
    });
  });

  it("показывает счётчик символов", () => {
    render(<ChatWidget />);
    expect(screen.getByText("0 / 1000")).toBeInTheDocument();

    typeQuestion("джинса");
    expect(screen.getByText("6 / 1000")).toBeInTheDocument();
  });

  it("отправляет вопрос по Enter", async () => {
    vi.mocked(fetch).mockResolvedValue(streamingResponse("Готово."));

    render(<ChatWidget />);
    typeQuestion("Что взять?");
    fireEvent.keyDown(getInput(), { key: "Enter" });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("не отправляет вопрос по Shift+Enter", () => {
    render(<ChatWidget />);
    typeQuestion("Что взять?");
    fireEvent.keyDown(getInput(), { key: "Enter", shiftKey: true });

    expect(fetch).not.toHaveBeenCalled();
  });
});
