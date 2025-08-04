
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, cardsTable } from '../db/schema';
import { getListCards } from '../handlers/get_list_cards';

describe('getListCards', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return cards for a list ordered by position', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
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

    // Create test cards with different positions
    await db.insert(cardsTable)
      .values([
        {
          title: 'Card 2',
          description: 'Second card',
          list_id: listId,
          position: 1
        },
        {
          title: 'Card 1',
          description: 'First card',
          list_id: listId,
          position: 0
        },
        {
          title: 'Card 3',
          description: null,
          due_date: new Date('2024-12-31'),
          assigned_user_id: userId,
          list_id: listId,
          position: 2
        }
      ])
      .execute();

    const result = await getListCards(listId, userId);

    expect(result).toHaveLength(3);
    
    // Verify cards are ordered by position
    expect(result[0].title).toEqual('Card 1');
    expect(result[0].position).toEqual(0);
    expect(result[1].title).toEqual('Card 2');
    expect(result[1].position).toEqual(1);
    expect(result[2].title).toEqual('Card 3');
    expect(result[2].position).toEqual(2);

    // Verify card properties
    expect(result[0].description).toEqual('First card');
    expect(result[0].due_date).toBeNull();
    expect(result[0].assigned_user_id).toBeNull();
    expect(result[0].list_id).toEqual(listId);
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify card with assigned user and due date
    expect(result[2].description).toBeNull();
    expect(result[2].due_date).toBeInstanceOf(Date);
    expect(result[2].assigned_user_id).toEqual(userId);
  });

  it('should return empty array for list with no cards', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
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

    // Create test list with no cards
    const listResult = await db.insert(listsTable)
      .values({
        name: 'Empty List',
        board_id: boardId,
        position: 0
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    const result = await getListCards(listId, userId);

    expect(result).toHaveLength(0);
  });

  it('should throw error for non-existent list', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const nonExistentListId = 999;

    await expect(getListCards(nonExistentListId, userId)).rejects.toThrow(/list not found or access denied/i);
  });

  it('should throw error when user does not own the board', async () => {
    // Create first user (board owner)
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hash123',
        name: 'Board Owner'
      })
      .returning()
      .execute();
    const ownerId = ownerResult[0].id;

    // Create second user (unauthorized)
    const unauthorizedResult = await db.insert(usersTable)
      .values({
        email: 'unauthorized@example.com',
        password_hash: 'hash123',
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

    // Create list in owner's board
    const listResult = await db.insert(listsTable)
      .values({
        name: 'Owner List',
        board_id: boardId,
        position: 0
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    // Try to access list as unauthorized user
    await expect(getListCards(listId, unauthorizedUserId)).rejects.toThrow(/list not found or access denied/i);
  });
});
