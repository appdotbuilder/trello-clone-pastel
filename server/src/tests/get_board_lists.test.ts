
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable } from '../db/schema';
import { getBoardLists } from '../handlers/get_board_lists';

describe('getBoardLists', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return lists for a board ordered by position', async () => {
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

    // Create test lists with different positions
    await db.insert(listsTable)
      .values([
        {
          name: 'Third List',
          board_id: boardId,
          position: 3
        },
        {
          name: 'First List',
          board_id: boardId,
          position: 1
        },
        {
          name: 'Second List',
          board_id: boardId,
          position: 2
        }
      ])
      .execute();

    const result = await getBoardLists(boardId, userId);

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('First List');
    expect(result[0].position).toEqual(1);
    expect(result[1].name).toEqual('Second List');
    expect(result[1].position).toEqual(2);
    expect(result[2].name).toEqual('Third List');
    expect(result[2].position).toEqual(3);

    // Verify all fields are present
    result.forEach(list => {
      expect(list.id).toBeDefined();
      expect(list.name).toBeDefined();
      expect(list.board_id).toEqual(boardId);
      expect(list.position).toBeDefined();
      expect(list.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when board has no lists', async () => {
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

    // Create test board without lists
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Empty Board',
        user_id: userId
      })
      .returning()
      .execute();

    const boardId = boardResult[0].id;

    const result = await getBoardLists(boardId, userId);

    expect(result).toHaveLength(0);
  });

  it('should throw error when board does not exist', async () => {
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
    const nonExistentBoardId = 999;

    await expect(getBoardLists(nonExistentBoardId, userId))
      .rejects.toThrow(/board not found or access denied/i);
  });

  it('should throw error when board belongs to different user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User 1'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User 2'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create board owned by user1
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'User 1 Board',
        user_id: user1Id
      })
      .returning()
      .execute();

    const boardId = boardResult[0].id;

    // Try to access board as user2
    await expect(getBoardLists(boardId, user2Id))
      .rejects.toThrow(/board not found or access denied/i);
  });

  it('should only return lists for the specified board', async () => {
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

    // Create two test boards
    const board1Result = await db.insert(boardsTable)
      .values({
        name: 'Board 1',
        user_id: userId
      })
      .returning()
      .execute();

    const board2Result = await db.insert(boardsTable)
      .values({
        name: 'Board 2',
        user_id: userId
      })
      .returning()
      .execute();

    const board1Id = board1Result[0].id;
    const board2Id = board2Result[0].id;

    // Create lists for both boards
    await db.insert(listsTable)
      .values([
        {
          name: 'Board 1 List 1',
          board_id: board1Id,
          position: 1
        },
        {
          name: 'Board 1 List 2',
          board_id: board1Id,
          position: 2
        },
        {
          name: 'Board 2 List 1',
          board_id: board2Id,
          position: 1
        }
      ])
      .execute();

    const result = await getBoardLists(board1Id, userId);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Board 1 List 1');
    expect(result[1].name).toEqual('Board 1 List 2');
    expect(result.every(list => list.board_id === board1Id)).toBe(true);
  });
});
