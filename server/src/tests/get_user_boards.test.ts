
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable } from '../db/schema';
import { getUserBoards } from '../handlers/get_user_boards';

describe('getUserBoards', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return boards for a user', async () => {
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

    // Create test boards
    await db.insert(boardsTable)
      .values([
        {
          name: 'Board 1',
          user_id: userId
        },
        {
          name: 'Board 2',
          user_id: userId
        }
      ])
      .execute();

    const result = await getUserBoards(userId);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Board 1');
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[1].name).toEqual('Board 2');
    expect(result[1].user_id).toEqual(userId);
  });

  it('should return empty array when user has no boards', async () => {
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

    const result = await getUserBoards(userId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return boards belonging to the specified user', async () => {
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

    // Create boards for both users
    await db.insert(boardsTable)
      .values([
        {
          name: 'User 1 Board',
          user_id: user1Id
        },
        {
          name: 'User 2 Board',
          user_id: user2Id
        }
      ])
      .execute();

    const result = await getUserBoards(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('User 1 Board');
    expect(result[0].user_id).toEqual(user1Id);
  });
});
