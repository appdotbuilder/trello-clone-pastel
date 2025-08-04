
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, cardsTable } from '../db/schema';
import { deleteList } from '../handlers/delete_list';
import { eq } from 'drizzle-orm';

describe('deleteList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a list successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
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
        position: 1
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    // Delete the list
    const result = await deleteList(listId, userId);

    expect(result.success).toBe(true);

    // Verify list is deleted
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();

    expect(lists).toHaveLength(0);
  });

  it('should delete list and cascade delete associated cards', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
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
        position: 1
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    // Create test cards in the list
    await db.insert(cardsTable)
      .values([
        {
          title: 'Card 1',
          description: 'First card',
          list_id: listId,
          position: 1
        },
        {
          title: 'Card 2',
          description: 'Second card',
          list_id: listId,
          position: 2
        }
      ])
      .execute();

    // Verify cards exist before deletion
    const cardsBefore = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, listId))
      .execute();
    expect(cardsBefore).toHaveLength(2);

    // Delete the list
    const result = await deleteList(listId, userId);

    expect(result.success).toBe(true);

    // Verify list is deleted
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();
    expect(lists).toHaveLength(0);

    // Verify cards are cascade deleted
    const cardsAfter = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, listId))
      .execute();
    expect(cardsAfter).toHaveLength(0);
  });

  it('should throw error when list does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const nonExistentListId = 999;

    await expect(deleteList(nonExistentListId, userId)).rejects.toThrow(/list not found/i);
  });

  it('should throw error when user does not own the board', async () => {
    // Create first user (board owner)
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        name: 'Board Owner'
      })
      .returning()
      .execute();
    const ownerId = ownerResult[0].id;

    // Create second user (unauthorized user)
    const unauthorizedResult = await db.insert(usersTable)
      .values({
        email: 'unauthorized@example.com',
        password_hash: 'hashedpassword',
        name: 'Unauthorized User'
      })
      .returning()
      .execute();
    const unauthorizedUserId = unauthorizedResult[0].id;

    // Create board owned by first user
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Owner Board',
        user_id: ownerId
      })
      .returning()
      .execute();
    const boardId = boardResult[0].id;

    // Create list in the board
    const listResult = await db.insert(listsTable)
      .values({
        name: 'Test List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    // Try to delete list as unauthorized user
    await expect(deleteList(listId, unauthorizedUserId)).rejects.toThrow(/unauthorized/i);

    // Verify list still exists
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();
    expect(lists).toHaveLength(1);
  });
});
