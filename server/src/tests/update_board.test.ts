
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable } from '../db/schema';
import { type UpdateBoardInput } from '../schema';
import { updateBoard } from '../handlers/update_board';
import { eq } from 'drizzle-orm';

describe('updateBoard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testBoardId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test board
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Original Board',
        user_id: testUserId
      })
      .returning()
      .execute();
    testBoardId = boardResult[0].id;
  });

  it('should update board name', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      name: 'Updated Board Name'
    };

    const result = await updateBoard(input);

    expect(result.id).toEqual(testBoardId);
    expect(result.name).toEqual('Updated Board Name');
    expect(result.user_id).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save updated board to database', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      name: 'Database Updated Board'
    };

    await updateBoard(input);

    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, testBoardId))
      .execute();

    expect(boards).toHaveLength(1);
    expect(boards[0].name).toEqual('Database Updated Board');
    expect(boards[0].user_id).toEqual(testUserId);
  });

  it('should return existing board when no fields to update', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId
      // No name provided
    };

    const result = await updateBoard(input);

    expect(result.id).toEqual(testBoardId);
    expect(result.name).toEqual('Original Board'); // Unchanged
    expect(result.user_id).toEqual(testUserId);
  });

  it('should throw error when board does not exist', async () => {
    const input: UpdateBoardInput = {
      id: 99999, // Non-existent board ID
      name: 'Updated Name'
    };

    expect(updateBoard(input)).rejects.toThrow(/board not found/i);
  });

  it('should preserve other board fields when updating', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      name: 'New Name Only'
    };

    const result = await updateBoard(input);

    // Check that user_id and created_at are preserved
    expect(result.user_id).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.name).toEqual('New Name Only');
    expect(result.id).toEqual(testBoardId);
  });

  it('should handle multiple updates to same board', async () => {
    // First update
    const firstInput: UpdateBoardInput = {
      id: testBoardId,
      name: 'First Update'
    };

    const firstResult = await updateBoard(firstInput);
    expect(firstResult.name).toEqual('First Update');

    // Second update
    const secondInput: UpdateBoardInput = {
      id: testBoardId,
      name: 'Second Update'
    };

    const secondResult = await updateBoard(secondInput);
    expect(secondResult.name).toEqual('Second Update');
    expect(secondResult.id).toEqual(testBoardId);
    expect(secondResult.user_id).toEqual(testUserId);
  });
});
