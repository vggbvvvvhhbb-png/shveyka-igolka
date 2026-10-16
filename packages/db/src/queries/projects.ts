import { asc, eq, inArray } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { projects, seams, fabrics } from "../schema";
import type { Difficulty, Seam, Fabric } from "@shveyka/core";
import { withRetry } from "../utils/withRetry";

export type Project = typeof projects.$inferSelect;

export type ProjectWithResolvedRefs = Project & {
  resolvedSeams: Seam[];
  resolvedFabrics: Fabric[];
};

/**
 * Get a single project by its slug id.
 */
export async function getProjectById(db: DatabaseClient, id: string): Promise<Project | undefined> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0];
}

/**
 * List projects filtered by difficulty.
 */
export async function listProjectsByDifficulty(
  db: DatabaseClient,
  difficulty: Difficulty
): Promise<Project[]> {
  return db.select().from(projects).where(eq(projects.difficulty, difficulty));
}

/**
 * Get a project with seam and fabric references resolved to full objects.
 */
export async function getProjectWithResolvedRefs(
  db: DatabaseClient,
  id: string
): Promise<ProjectWithResolvedRefs | undefined> {
  const projectRows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

  const project = projectRows[0];
  if (!project) return undefined;

  const seamIds = (project.required_seams as string[]) ?? [];
  const fabricIds = (project.recommended_fabrics as string[]) ?? [];

  const resolvedSeams =
    seamIds.length > 0 ? await db.select().from(seams).where(inArray(seams.id, seamIds)) : [];

  const resolvedFabrics =
    fabricIds.length > 0
      ? await db.select().from(fabrics).where(inArray(fabrics.id, fabricIds))
      : [];

  return {
    ...project,
    resolvedSeams: resolvedSeams as unknown as Seam[],
    resolvedFabrics: resolvedFabrics as unknown as Fabric[],
  };
}

/**
 * List all projects ordered by name.
 */
export async function listProjects(db: DatabaseClient): Promise<Project[]> {
  return withRetry(() => db.select().from(projects).orderBy(asc(projects.name)));
}
