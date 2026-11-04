import { NextResponse } from "next/server";
import {
  AssistantRequestSchema,
  buildContextSlugsHeader,
  buildFallbackBlock,
  collectContextSlugs,
  collectRelatedCards,
  createRequestId,
  groupContext,
  isUuid,
  isWebWorkMode,
  prepareChat,
  suggestNearest,
  webModeCanAnswer,
  webServicesStatus,
  type AnswerMode,
} from "@shveyka/core";
import { buildCatalogText } from "@shveyka/core/ai/catalogText";
import { LlmError, type ChatTurn } from "@shveyka/core/ai/llm";
import { runPipeline } from "@shveyka/core/ai/pipeline";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { clientIp, limitRequest } from "@/lib/guard";
import { requestIsOwner } from "@/lib/owner";
import { loadCatalog, poolOf } from "@/lib/catalog";
import { saveAssistantTurn, saveUserTurn } from "@/lib/chatHistory";
import { resolveUsageUser, recordUsageSafe } from "@/lib/usage";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось получить ответ, попробуйте позже";

/**
 * Лимит режимов с интернетом: они стоят дороже обычного ответа по каталогу,
 * поэтому запросов с одного адреса разрешено меньше.
 */
const WEB_RATE_LIMIT = Number(process.env.AI_RATE_LIMIT_PER_MIN ?? 8);

/** Сколько последних реплик диалога уходит в конвейер. */
const HISTORY_LIMIT = 6;

/**
 * Убирает ссылки вида [1] из прошлых ответов.
 *
 * Нумерация источников у каждого ответа своя, поэтому старая ссылка в истории
 * сбила бы с толку и модель, и человека.
 */
function stripCitations(text: string): string {
  return text
    .replace(/\[\d{1,2}\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * История диалога для конвейера.
 *
 * В неё попадают только последние реплики: длинная история съедает бюджет
 * токенов, а вопрос обычно про то, чем закончился прошлый разговор.
 */
function buildHistory(messages: readonly { role: string; content: string }[]): ChatTurn[] {
  return messages
    .slice(-HISTORY_LIMIT)
    .map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: stripCitations(message.content),
    }))
    .filter((turn) => turn.content.length > 0);
}

export async function POST(req: Request): Promise<Response> {
  // Идентификатор запроса попадает и в лог, и в ответ с ошибкой.
  const requestId = createRequestId();

  const limited = await limitRequest(req, {
    key: `assistant:${clientIp(req)}`,
    limit: WEB_RATE_LIMIT,
    requestId,
    message: "Слишком много запросов к интернету, подождите минуту",
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Некорректный запрос", 400, requestId);
  }

  const parsed = AssistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Некорректный запрос";
    return errorResponse(message, 400, requestId);
  }

  const { message, mode, style, ctx } = parsed.data;

  // Кто спрашивает: у сайта это анонимная cookie, у бота — идентификатор
  // Telegram. Нужен для отчёта о расходе токенов.
  const usageUser = resolveUsageUser(req);

  // Режим «Каталог» живёт в /api/chat: там ответ идёт потоком и кэшируется.
  if (!isWebWorkMode(mode)) {
    return errorResponse("Этот режим работает в разделе «Каталог»", 400, requestId);
  }

  // Ключи у режимов с интернетом разные: один — для поиска, другой — для
  // моделей. Без ключа моделей ответ невозможен вовсе, и режим выключается.
  // Без ключа поиска ответ возможен — по каталогу: об этом честно говорит
  // сам конвейер, помечая ответ словом «Интернет недоступен».
  const services = webServicesStatus();
  if (!webModeCanAnswer()) {
    console.error("[assistant] режимы с интернетом не настроены", {
      requestId,
      missing: services.missing,
    });
    return errorResponse(
      "Режимы с интернетом пока недоступны, попробуйте режим «Каталог»",
      503,
      requestId
    );
  }
  if (services.search === "missing") {
    console.warn("[assistant] ключ поиска не задан: ответ будет только по каталогу", {
      requestId,
    });
  }

  try {
    const db = getDbSingleton();
    const catalog = await loadCatalog();
    const pool = poolOf(catalog);

    // Мерки — личные данные владельца, постороннему посетителю они не достаются.
    const owner = requestIsOwner(req);

    // Контекст каталога собирается тем же способом, что и в обычном чате:
    // страница, поиск по вопросу, записи каталога по теме.
    const prep = await prepareChat(
      {
        search: (question) => queries.searchContext(db, question, { withMeasurements: owner }),
        entry: (ref) =>
          queries.findContextEntry(db, ref.kind, ref.slug, { withMeasurements: owner }),
        pool,
      },
      { question: message, ctx, mode: style }
    );

    // Текст каталога для промта: записи по теме вопроса и мерки владельца.
    // Если по теме ничего нет, подсказываем ближайшие записи — так модель
    // предложит что-то конкретное, а не откажется молча.
    const context = groupContext(prep.context, prep.measurements);
    const catalogText = [
      buildCatalogText(context),
      prep.context.length === 0 ? buildFallbackBlock(suggestNearest(message, pool)) : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // История диалога читается до сохранения вопроса: иначе в неё попал бы
    // текущий вопрос и модель получила бы его дважды.
    const headerId = req.headers.get("x-conversation-id");
    let conversationId: string | null = null;
    let history: ChatTurn[] = [];
    if (isUuid(headerId)) {
      const found = await queries.getConversation(db, headerId);
      if (found) {
        conversationId = found.id;
        history = buildHistory(await queries.listMessages(db, found.id));
      }
    }

    const savedId = await saveUserTurn(db, requestId, conversationId, message);
    const assistantMessageId = crypto.randomUUID();

    const result = await runPipeline({
      mode,
      question: message,
      style: (style ?? null) as AnswerMode | null,
      catalog: catalogText,
      history,
    });

    if (savedId) {
      await saveAssistantTurn(
        db,
        requestId,
        savedId,
        assistantMessageId,
        result.answer,
        collectContextSlugs(prep.context),
        {
          mode,
          sources: result.sources,
          // Вопросы и карточки каталога сохраняются вместе с ответом: в
          // открытом заново диалоге кнопки и карточки остаются на месте.
          followUps: result.followUps,
          related: collectRelatedCards(prep.context),
        }
      );
    }

    // Расход токенов режима: планировщик поиска плюс ответ модели.
    // Счётчика может не быть: провайдер его не прислал.
    const spent = result.usage;
    await recordUsageSafe(db, {
      userKey: usageUser.userKey,
      userLabel: usageUser.userLabel,
      source: usageUser.source,
      feature: mode,
      mode: style ?? null,
      model: result.model,
      promptTokens: spent?.promptTokens ?? 0,
      completionTokens: spent?.completionTokens ?? 0,
      totalTokens: spent?.totalTokens ?? 0,
      estimated: !spent || spent.totalTokens === 0,
      conversationId: savedId,
    });

    return NextResponse.json(
      {
        answer: result.answer,
        mode,
        sources: result.sources,
        steps: result.steps,
        model: result.model,
        degraded: result.degraded,
        // Заметка о том, как получен ответ: например, что свободные модели
        // сегодня не проверены и ответила платная. Это не часть ответа,
        // а честное объяснение, почему он шёл долго.
        notice: result.notice ?? null,
        followUps: result.followUps,
        // Записи каталога, попавшие в ответ: интерфейс показывает их
        // карточками, чтобы можно было сразу перейти к записи. Вместе со
        // ссылкой идут настройки машины: они взяты из самих записей каталога.
        related: collectRelatedCards(prep.context),
        conversationId: savedId,
        messageId: assistantMessageId,
      },
      {
        headers: {
          // Список записей каталога, попавших в ответ: по нему UI делает
          // ссылки на каталог кликабельными.
          "X-Context-Slugs": buildContextSlugsHeader(prep.context),
          "X-Request-Id": requestId,
          // Анонимный идентификатор посетителя: без него в отчёте не собрать
          // расход по людям.
          ...(usageUser.setCookie ? { "Set-Cookie": usageUser.setCookie } : {}),
          ...(savedId ? { "X-Conversation-Id": savedId, "X-Message-Id": assistantMessageId } : {}),
        },
      }
    );
  } catch (err) {
    // Лимит запросов провайдера — это не поломка: сообщаем об этом прямо.
    if (err instanceof LlmError && err.status === 429) {
      console.warn("[assistant] provider rate limit", { requestId });
      return errorResponse(
        "Провайдер не успевает отвечать, попробуйте через минуту",
        429,
        requestId
      );
    }
    // Ошибка провайдера: по модели и статусу в логе видно, это неверный
    // идентификатор модели или отказ самого провайдера.
    if (err instanceof LlmError) {
      console.error("[assistant] provider did not answer", {
        requestId,
        model: err.model,
        status: err.status,
      });
      return errorResponse(GENERIC_ERROR, 502, requestId);
    }
    logFailure("assistant", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}
