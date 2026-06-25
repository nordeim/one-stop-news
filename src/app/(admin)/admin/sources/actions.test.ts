/**
 * actions.test.ts — Tests for admin source management Server Actions.
 *
 * Q3 fix: deleteSource must perform a HARD DELETE (db.delete), not a soft
 * delete (db.update set isActive: false). The previous implementation was
 * identical to pauseSource — both set isActive: false. This was misleading:
 * "delete" implied permanent removal but actually just paused the source.
 *
 * The schema has onDelete: "cascade" on articles.sourceId, so deleting a
 * source will cascade-delete its articles. This is the correct behavior for
 * a real delete operation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

// Mock the DB module with a chainable query builder pattern.
// Drizzle's query builder chains: db.update().set().where().returning()
// and db.delete().where().returning(). We build self-referential mock objects
// so any chain depth works.
const mockReturning = vi
  .fn()
  .mockResolvedValue([{ id: "source-1", name: "Test Source" }]);

function createChainableMock() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  // Each method returns the chain itself so calls can be chained indefinitely.
  chain.set = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = mockReturning;
  return chain;
}

const mockInsertChain = createChainableMock();
const mockUpdateChain = createChainableMock();
const mockDeleteChain = createChainableMock();

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => mockInsertChain),
    update: vi.fn(() => mockUpdateChain),
    delete: vi.fn(() => mockDeleteChain),
  },
  sources: {
    id: "id",
    isActive: "is_active",
  },
}));

vi.mock("@/lib/auth/dal", () => ({
  verifyAdminSession: vi.fn().mockResolvedValue({
    id: "admin-1",
    role: "admin",
    name: "Admin",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks are registered.
const { pauseSource, resumeSource, deleteSource } = await import("./actions");
const { db } = await import("@/lib/db");

beforeEach(() => {
  vi.clearAllMocks();
  mockReturning.mockResolvedValue([{ id: "source-1", name: "Test Source" }]);
  // Re-wire the chain methods after clearAllMocks
  mockInsertChain.set = vi.fn().mockReturnValue(mockInsertChain);
  mockInsertChain.where = vi.fn().mockReturnValue(mockInsertChain);
  mockInsertChain.values = vi.fn().mockReturnValue(mockInsertChain);
  mockInsertChain.returning = mockReturning;

  mockUpdateChain.set = vi.fn().mockReturnValue(mockUpdateChain);
  mockUpdateChain.where = vi.fn().mockReturnValue(mockUpdateChain);
  mockUpdateChain.values = vi.fn().mockReturnValue(mockUpdateChain);
  mockUpdateChain.returning = mockReturning;

  mockDeleteChain.set = vi.fn().mockReturnValue(mockDeleteChain);
  mockDeleteChain.where = vi.fn().mockReturnValue(mockDeleteChain);
  mockDeleteChain.values = vi.fn().mockReturnValue(mockDeleteChain);
  mockDeleteChain.returning = mockReturning;
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("pauseSource — soft deactivation", () => {
  it("sets isActive to false via db.update (NOT db.delete)", async () => {
    await pauseSource("source-1");

    expect(db.update).toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    // Verify the .set() method was called with { isActive: false }
    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });
});

describe("deleteSource — HARD delete (Q3 fix)", () => {
  it("calls db.delete (NOT db.update) — performs a real delete", async () => {
    // Q3 fix: deleteSource must use db.delete, not db.update.
    // The previous implementation was identical to pauseSource (both set
    // isActive: false). This was misleading — "delete" should permanently
    // remove the source. The schema has onDelete: "cascade" on
    // articles.sourceId, so this cascade-deletes associated articles too.
    await deleteSource("source-1");

    expect(db.delete).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("calls revalidatePath after delete", async () => {
    const { revalidatePath } = await import("next/cache");
    await deleteSource("source-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/sources");
  });
});

describe("resumeSource — reactivation", () => {
  it("sets isActive to true via db.update (NOT db.delete)", async () => {
    await resumeSource("source-1");

    expect(db.update).toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });
});

describe("resumeSourceAction — FormData wrapper", () => {
  it("throws when id is missing from FormData", async () => {
    const { resumeSourceAction } = await import("./actions");
    const emptyFormData = new FormData();
    await expect(resumeSourceAction(emptyFormData)).rejects.toThrow(
      "id field is required and must be a non-empty string",
    );
  });

  it("delegates to resumeSource with the extracted id", async () => {
    const { resumeSourceAction } = await import("./actions");
    const formData = new FormData();
    formData.set("id", "source-42");
    await resumeSourceAction(formData);
    // The wrapper calls resumeSource which invokes db.update.
    expect(db.update).toHaveBeenCalled();
  });
});
