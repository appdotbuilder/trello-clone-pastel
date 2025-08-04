
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, cardsTable } from '../db/schema';
import { deleteBoard } from '../handlers/delete_board';
import { eq } from 'drizzle-orm';

describe('deleteBoard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a board that belongs to the user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test board
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boardResult[0].id;

    // Delete the board
    const result = await deleteBoard(boardId, userId);

    expect(result.success).toBe(true);

    // Verify board was deleted
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, boardId))
      .execute();

    expect(boards).toHaveLength(0);
  });

  it('should return false when trying to delete a non-existent board', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to delete non-existent board
    const result = await deleteBoard(999, userId);

    expect(result.success).toBe(false);
  });

  it('should return false when trying to delete a board that belongs to another user', async () => {
    // Create first user and their board
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User 1'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'User 1 Board',
        user_id: user1Id
      })
      .returning()
      .execute();
    const boardId = boardResult[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User 2'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Try to delete user1's board as user2
    const result = await deleteBoard(boardId, user2Id);

    expect(result.success).toBe(false);

    // Verify board still exists
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, boardId))
      .execute();

    expect(boards).toHaveLength(1);
  });

  it('should cascade delete lists and cards when board is deleted', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test board
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boardResult[0].id;

    // Create test list
    const listResult = await db.insert(listsTable)
      .values({
        name: 'Test List',
        board_id: boardId,
        position: 0
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    // Create test card
    await db.insert(cardsTable)
      .values({
        title: 'Test Card',
        list_id: listId,
        position: 0
      })
      .execute();

    // Delete the board
    const result = await deleteBoard(boardId, userId);

    expect(result.success).toBe(true);

    // Verify board was deleted
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, boardId))
      .execute();
    expect(boards).toHaveLength(0);

    // Verify list was cascade deleted
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();
    expect(lists).toHaveLength(0);

    // Verify card was cascade deleted
    const cards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, listId))
      .execute();
    expect(cards).toHaveLength(0);
  });
});
