"use client";

/**
 * DeleteSourceButton — Client Component for the irreversible delete action.
 *
 * Must be a Client Component because it uses `window.confirm()` (browser API).
 * The confirmation dialog guards against accidental deletion — the server action
 * performs a HARD DELETE with cascade (all articles from this source are lost).
 *
 * Phase 25 (F8 fix): Wired the existing `deleteSource` action to the UI.
 */

import { deleteSourceAction } from "@/app/(admin)/admin/sources/actions";

interface DeleteSourceButtonProps {
  sourceId: string;
  sourceName: string;
}

export function DeleteSourceButton({
  sourceId,
  sourceName,
}: DeleteSourceButtonProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      `Permanently delete "${sourceName}" and ALL its articles? This cannot be undone.`,
    );
    if (!confirmed) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteSourceAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={sourceId} />
      <button
        type="submit"
        className="font-mono text-[10px] uppercase tracking-widest text-dispatch-ember hover:text-paper-200 transition-colors"
      >
        Delete
      </button>
    </form>
  );
}
