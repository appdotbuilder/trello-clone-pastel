
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { listsTable, boardsTable, usersTable } from '../db/schema';
import { type CreateListInput } from '../schema';
import { createList } from '../handlers/create_list';
import { eq } from 'drizzle-orm';

describe('createList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a list successfully', async () => {
    // Create prerequisite user and board
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        name: 'Test User'
      })
      .returning()
      .execute();

    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const testInput: CreateListInput = {
      name: 'To Do',
      board_id: boardResult[0].id,
      position: 0
    };

    const result = await createList(testInput);

    // Basic field validation
    expect(result.name).toEqual('To Do');
    expect(result.board_id).toEqual(boardResult[0].id);
    expect(result.position).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save list to database', async () => {
    // Create prerequisite user and board
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        name: 'Test User'
      })
      .returning()
      .execute();

    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const testInput: CreateListInput = {
      name: 'In Progress',
      board_id: boardResult[0].id,
      position: 1
    };

    const result = await createList(testInput);

    // Query the database to verify the list was saved
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, result.id))
      .execute();

    expect(lists).toHaveLength(1);
    expect(lists[0].name).toEqual('In Progress');
    expect(lists[0].board_id).toEqual(boardResult[0].id);
    expect(lists[0].position).toEqual(1);
    expect(lists[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when board does not exist', async () => {
    const testInput: CreateListInput = {
      name: 'Test List',
      board_id: 999, // Non-existent board ID
      position: 0
    };

    await expect(createList(testInput)).rejects.toThrow(/Board with id 999 not found/i);
  });

  it('should create multiple lists with different positions', async () => {
    // Create prerequisite user and board
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        name: 'Test User'
      })
      .returning()
      .execute();

    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create first list
    const firstList = await createList({
      name: 'First List',
      board_id: boardResult[0].id,
      position: 0
    });

    // Create second list
    const secondList = await createList({
      name: 'Second List',
      board_id: boardResult[0].id,
      position: 1
    });

    // Verify both lists exist in database
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.board_id, boardResult[0].id))
      .execute();

    expect(lists).toHaveLength(2);
    
    const sortedLists = lists.sort((a, b) => a.position - b.position);
    expect(sortedLists[0].name).toEqual('First List');
    expect(sortedLists[0].position).toEqual(0);
    expect(sortedLists[1].name).toEqual('Second List');
    expect(sortedLists[1].position).toEqual(1);
  });
});
