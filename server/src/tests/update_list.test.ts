
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable } from '../db/schema';
import { type UpdateListInput } from '../schema';
import { updateList } from '../handlers/update_list';
import { eq } from 'drizzle-orm';

describe('updateList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;
  let testBoardId: number;
  let testListId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hash123',
          name: 'Test User'
        },
        {
          email: 'other@example.com',
          password_hash: 'hash456',
          name: 'Other User'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: testUserId
      })
      .returning()
      .execute();

    testBoardId = boards[0].id;

    // Create test list
    const lists = await db.insert(listsTable)
      .values({
        name: 'Test List',
        board_id: testBoardId,
        position: 0
      })
      .returning()
      .execute();

    testListId = lists[0].id;
  });

  it('should update list name', async () => {
    const input: UpdateListInput = {
      id: testListId,
      name: 'Updated List Name'
    };

    const result = await updateList(input, testUserId);

    expect(result.id).toEqual(testListId);
    expect(result.name).toEqual('Updated List Name');
    expect(result.board_id).toEqual(testBoardId);
    expect(result.position).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update list position', async () => {
    const input: UpdateListInput = {
      id: testListId,
      position: 5
    };

    const result = await updateList(input, testUserId);

    expect(result.id).toEqual(testListId);
    expect(result.name).toEqual('Test List');
    expect(result.board_id).toEqual(testBoardId);
    expect(result.position).toEqual(5);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update both name and position', async () => {
    const input: UpdateListInput = {
      id: testListId,
      name: 'New Name',
      position: 3
    };

    const result = await updateList(input, testUserId);

    expect(result.id).toEqual(testListId);
    expect(result.name).toEqual('New Name');
    expect(result.board_id).toEqual(testBoardId);
    expect(result.position).toEqual(3);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateListInput = {
      id: testListId,
      name: 'Database Updated List',
      position: 7
    };

    await updateList(input, testUserId);

    const updatedList = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, testListId))
      .execute();

    expect(updatedList).toHaveLength(1);
    expect(updatedList[0].name).toEqual('Database Updated List');
    expect(updatedList[0].position).toEqual(7);
  });

  it('should return unchanged list when no fields provided', async () => {
    const input: UpdateListInput = {
      id: testListId
    };

    const result = await updateList(input, testUserId);

    expect(result.id).toEqual(testListId);
    expect(result.name).toEqual('Test List');
    expect(result.board_id).toEqual(testBoardId);
    expect(result.position).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should throw error when list does not exist', async () => {
    const input: UpdateListInput = {
      id: 999999,
      name: 'Non-existent List'
    };

    expect(updateList(input, testUserId)).rejects.toThrow(/list not found/i);
  });

  it('should throw error when user does not own the board', async () => {
    const input: UpdateListInput = {
      id: testListId,
      name: 'Unauthorized Update'
    };

    expect(updateList(input, otherUserId)).rejects.toThrow(/access denied/i);
  });

  it('should handle position zero correctly', async () => {
    const input: UpdateListInput = {
      id: testListId,
      position: 0
    };

    const result = await updateList(input, testUserId);

    expect(result.position).toEqual(0);
  });
});
