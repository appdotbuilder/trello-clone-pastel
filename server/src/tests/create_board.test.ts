
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { boardsTable, usersTable } from '../db/schema';
import { type CreateBoardInput } from '../schema';
import { createBoard } from '../handlers/create_board';
import { eq } from 'drizzle-orm';

describe('createBoard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a board', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    const testInput: CreateBoardInput = {
      name: 'Test Board',
      user_id: testUser.id
    };

    const result = await createBoard(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Board');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save board to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    const testInput: CreateBoardInput = {
      name: 'Test Board',
      user_id: testUser.id
    };

    const result = await createBoard(testInput);

    // Query using proper drizzle syntax
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, result.id))
      .execute();

    expect(boards).toHaveLength(1);
    expect(boards[0].name).toEqual('Test Board');
    expect(boards[0].user_id).toEqual(testUser.id);
    expect(boards[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateBoardInput = {
      name: 'Test Board',
      user_id: 999 // Non-existent user ID
    };

    await expect(createBoard(testInput)).rejects.toThrow(/user with id 999 not found/i);
  });

  it('should create multiple boards for same user', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();

    const testUser = userResult[0];

    // Create first board
    const firstInput: CreateBoardInput = {
      name: 'First Board',
      user_id: testUser.id
    };
    const firstBoard = await createBoard(firstInput);

    // Create second board
    const secondInput: CreateBoardInput = {
      name: 'Second Board',
      user_id: testUser.id
    };
    const secondBoard = await createBoard(secondInput);

    // Verify both boards exist and are different
    expect(firstBoard.id).not.toEqual(secondBoard.id);
    expect(firstBoard.name).toEqual('First Board');
    expect(secondBoard.name).toEqual('Second Board');
    expect(firstBoard.user_id).toEqual(testUser.id);
    expect(secondBoard.user_id).toEqual(testUser.id);

    // Query all boards for user
    const userBoards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.user_id, testUser.id))
      .execute();

    expect(userBoards).toHaveLength(2);
  });
});
