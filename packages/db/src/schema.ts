import {
  pgTable,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

// ============================================================================
// FABRICS
// ============================================================================

export const fabrics = pgTable(
  "fabrics",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull(),
    composition: text("composition").notNull(),
    category: text("category").notNull(),
    weight_class: text("weight_class").notNull(),
    density_min_gsm: integer("density_min_gsm").notNull(),
    density_max_gsm: integer("density_max_gsm").notNull(),
    stretch: text("stretch").notNull(),
    shrinkage_percent: integer("shrinkage_percent").notNull(),
    requires_decatizing: boolean("requires_decatizing").notNull(),
    suitable_for: jsonb("suitable_for").$type<string[]>().notNull(),
    default_machine_settings: jsonb("default_machine_settings").notNull(),
    recommended_edge_finish: jsonb("recommended_edge_finish").$type<string[]>().notNull(),
    difficulty_to_work_with: text("difficulty_to_work_with").notNull(),
    care_instructions: text("care_instructions").notNull(),
    common_issues: jsonb("common_issues").$type<string[]>().notNull(),
    photo_url: text("photo_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("fabrics_weight_class_idx").on(table.weight_class),
    index("fabrics_category_idx").on(table.category),
    index("fabrics_stretch_idx").on(table.stretch),
    index("fabrics_suitable_for_idx").on(table.suitable_for),
  ]
);

// ============================================================================
// SEAMS
// ============================================================================

export const seams = pgTable(
  "seams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull(),
    type: text("type").notNull(),
    difficulty: text("difficulty").notNull(),
    suitable_weight_classes: jsonb("suitable_weight_classes").$type<string[]>().notNull(),
    preferred_fabrics: jsonb("preferred_fabrics").$type<string[]>(),
    when_to_use: text("when_to_use").notNull(),
    default_machine_settings: jsonb("default_machine_settings").notNull(),
    steps: jsonb("steps").notNull(),
    common_mistakes: jsonb("common_mistakes").$type<string[]>().notNull(),
    variants: jsonb("variants"),
    diagram_url: text("diagram_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("seams_type_idx").on(table.type),
    index("seams_difficulty_idx").on(table.difficulty),
    index("seams_suitable_weight_classes_idx").on(table.suitable_weight_classes),
  ]
);

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    garment_type: text("garment_type").notNull(),
    difficulty: text("difficulty").notNull(),
    estimated_time_hours: jsonb("estimated_time_hours").notNull(),
    required_seams: jsonb("required_seams").$type<string[]>().notNull(),
    recommended_fabrics: jsonb("recommended_fabrics").$type<string[]>().notNull(),
    recommended_weight_classes: jsonb("recommended_weight_classes").$type<string[]>().notNull(),
    fabric_amount_formula: text("fabric_amount_formula").notNull(),
    seam_allowances: jsonb("seam_allowances").notNull(),
    materials: jsonb("materials").notNull(),
    steps: jsonb("steps").notNull(),
    final_checklist: jsonb("final_checklist").$type<string[]>().notNull(),
    pattern_source: jsonb("pattern_source"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("projects_garment_type_idx").on(table.garment_type),
    index("projects_difficulty_idx").on(table.difficulty),
    index("projects_required_seams_idx").on(table.required_seams),
  ]
);

// ============================================================================
// CONVERSATIONS
// ============================================================================

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  // Заголовок берётся из первого сообщения диалога, поэтому пустой диалог
  // остаётся без названия.
  title: text("title"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ============================================================================
// MESSAGES
// ============================================================================

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversation_id: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    // Записи каталога («тип/slug»), попавшие в контекст ответа ассистента.
    // По ним в открытом заново диалоге ссылки на каталог снова становятся
    // кликабельными — как в том ответе, который был только что получен.
    context_slugs: jsonb("context_slugs").$type<string[]>().notNull().default([]),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversation_id),
    index("messages_created_at_idx").on(table.created_at),
  ]
);

// ============================================================================
// MEASUREMENTS
// ============================================================================

/**
 * Мерки хранятся плоской таблицей, а не в виде пар «название — значение».
 *
 * В приложении мерки заполняет один человек для себя, набор значений
 * фиксирован (обхват груди, талии, бёдер, рост), и разбирать их по названиям
 * приходилось бы только в одном месте — в форме и в подсказках ассистента.
 * Плоская таблица даёт одну строку, у которой все поля опциональны, и не
 * требует справочника названий.
 */
export const measurements = pgTable("measurements", {
  id: text("id").primaryKey(),
  bust: integer("bust"),
  waist: integer("waist"),
  hip: integer("hip"),
  height: integer("height"),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ============================================================================
// MESSAGE FEEDBACK
// ============================================================================

/**
 * Оценка ответа помощника: одна на сообщение (повторная оценка заменяет
 * прежнюю). В context_slugs лежат записи каталога, попавшие в контекст ответа, —
 * по ним видно, где поиск контекста недобирает.
 */
export const messageFeedback = pgTable(
  "message_feedback",
  {
    id: text("id").primaryKey(),
    message_id: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    rating: text("rating").notNull(),
    comment: text("comment"),
    context_slugs: jsonb("context_slugs").$type<string[]>().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("message_feedback_message_id_uq").on(table.message_id),
    index("message_feedback_rating_idx").on(table.rating),
  ]
);

// ============================================================================
// SEWN ITEMS
// ============================================================================

/** Журнал сшитых вещей: из него считаются итоги года и экономия. */
export const sewnItems = pgTable(
  "sewn_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    fabric_slug: text("fabric_slug"),
    // Рубли целым числом: копейки в домашнем учёте не нужны.
    cost: integer("cost").notNull(),
    market_price: integer("market_price"),
    // Подарок не считается в экономии: его себестоимость — не выгода.
    gift: boolean("gift").notNull().default(false),
    sewn_at: timestamp("sewn_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("sewn_items_sewn_at_idx").on(table.sewn_at)]
);
