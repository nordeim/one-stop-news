"use server";

/**
 * actions.ts — Admin-only Server Actions for source management.
 *
 * PRD §6: Source CRUD with verifyAdminSession() guard.
 */

import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const sourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  feedUrl: z.string().url(),
  feedFormat: z.enum(["rss", "atom", "json_api"]),
  categoryId: z.string().uuid().optional(),
  priority: z.number().min(1).max(5).default(2),
  pollIntervalMinutes: z.number().min(5).default(15),
});

export async function addSource(data: unknown) {
  await verifyAdminSession();

  const parsed = sourceSchema.parse(data);
  const [newSource] = await db.insert(sources).values(parsed).returning();

  revalidatePath("/admin/sources");
  return newSource;
}

export async function updateSource(id: string, data: unknown) {
  await verifyAdminSession();

  const parsed = sourceSchema.partial().parse(data);
  const [updated] = await db
    .update(sources)
    .set(parsed)
    .where(eq(sources.id, id))
    .returning();

  revalidatePath("/admin/sources");
  return updated;
}

export async function pauseSource(id: string) {
  await verifyAdminSession();

  const [updated] = await db
    .update(sources)
    .set({ isActive: false })
    .where(eq(sources.id, id))
    .returning();

  revalidatePath("/admin/sources");
  return updated;
}

/**
 * pauseSourceAction — FormData-bound wrapper for `pauseSource`.
 *
 * Phase 22 (N5 fix, audit Report 16): The admin sources table needed a UI
 * button to call `pauseSource`. Server Actions invoked from `<form action>`
 * receive a `FormData` argument, but `pauseSource(id: string)` takes a
 * plain string. This wrapper extracts the `id` field from FormData and
 * delegates to `pauseSource`.
 *
 * Used by: `src/features/sources/components/SourcesData.tsx`
 *
 * Symmetric `resumeSourceAction` is intentionally NOT provided here —
 * `pauseSource` always sets `isActive: false`. A future Resume button
 * should add a `resumeSource(id)` action that sets `isActive: true`.
 * For now the UI button only renders "Pause" when the source is active
 * (see SourcesData.tsx). The "Resume" label is rendered for paused
 * sources as a no-op placeholder; a future Phase can wire it.
 */
export async function pauseSourceAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("id field is required and must be a non-empty string");
  }
  await pauseSource(id);
}

/**
 * Resumes a paused source (sets isActive back to true).
 *
 * Symmetric to pauseSource — use this to re-enable ingestion
 * without losing historical data.
 */
export async function resumeSource(id: string) {
  await verifyAdminSession();

  const [updated] = await db
    .update(sources)
    .set({ isActive: true })
    .where(eq(sources.id, id))
    .returning();

  revalidatePath("/admin/sources");
  return updated;
}

/**
 * FormData-bound wrapper for resumeSource.
 *
 * Server Actions invoked from <form action> receive FormData.
 * This wrapper extracts the `id` field and delegates.
 */
export async function resumeSourceAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("id field is required and must be a non-empty string");
  }
  await resumeSource(id);
}

/**
 * FormData-bound wrapper for deleteSource.
 *
 * Server Actions invoked from <form action> receive FormData.
 * This wrapper extracts the `id` field and delegates.
 *
 * Phase 25 (F8 fix): Wired to a confirmation-guarded Delete button in
 * SourcesData.tsx. The button calls window.confirm() before submitting.
 */
export async function deleteSourceAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("id field is required and must be a non-empty string");
  }
  await deleteSource(id);
}

export async function deleteSource(id: string) {
  await verifyAdminSession();

  // Phase 25 (F8 fix): Wired to a confirmation-guarded Delete button in
  // SourcesData.tsx via the deleteSourceAction FormData wrapper.
  // Q3 fix: HARD DELETE — permanently removes the source from the database.
  // The schema has onDelete: "cascade" on articles.sourceId, so this
  // cascade-deletes all associated articles too. Use pauseSource() instead
  // if you only want to temporarily disable ingestion without losing data.
  //
  // WARNING: This operation is irreversible. All articles from this source
  // will be permanently deleted. Use with caution.
  const [deleted] = await db
    .delete(sources)
    .where(eq(sources.id, id))
    .returning();

  revalidatePath("/admin/sources");
  return deleted;
}
