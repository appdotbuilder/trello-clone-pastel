
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cardsTable, usersTable, boardsTable, listsTable } from '../db/schema';
import { type CreateCardInput } from '../schema';
import { createCard } from '../handlers/create_card';
import { eq } from 'drizzle-orm';

describe('createCard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testBoardId: number;
  let testListId: number;

  const setupTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create board
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: testUserId
      })
      .returning()
      .execute();
    testBoardId = boardResult[0].id;

    // Create list
    const listResult = await db.insert(listsTable)
      .values({
        name: 'Test List',
        board_id: testBoardId,
        position: 0
      })
      .returning()
      .execute();
    testListId = listResult[0].id;
  };

  it('should create a card with minimal required fields', async () => {
    await setupTestData();

    const testInput: CreateCardInput = {
      title: 'Test Card',
      list_id: testListId,
      position: 0
    };

    const result = await createCard(testInput);

    expect(result.title).toEqual('Test Card');
    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.assigned_user_id).toBeNull();
    expect(result.list_id).toEqual(testListId);
    expect(result.position).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.last_list_change_at).toBeInstanceOf(Date);
  });

  it('should create a card with all optional fields', async () => {
    await setupTestData();

    const dueDate = new Date('2024-12-31');
    const testInput: CreateCardInput = {
      title: 'Detailed Card',
      description: 'A card with all fields filled',
      due_date: dueDate,
      assigned_user_id: testUserId,
      list_id: testListId,
      position: 1
    };

    const result = await createCard(testInput);

    expect(result.title).toEqual('Detailed Card');
    expect(result.description).toEqual('A card with all fields filled');
    expect(result.due_date).toEqual(dueDate);
    expect(result.assigned_user_id).toEqual(testUserId);
    expect(result.list_id).toEqual(testListId);
    expect(result.position).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.last_list_change_at).toBeInstanceOf(Date);
  });

  it('should save card to database', async () => {
    await setupTestData();

    const testInput: CreateCardInput = {
      title: 'Database Test Card',
      description: 'Testing database persistence',
      list_id: testListId,
      position: 2
    };

    const result = await createCard(testInput);

    const cards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.id, result.id))
      .execute();

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toEqual('Database Test Card');
    expect(cards[0].description).toEqual('Testing database persistence');
    expect(cards[0].list_id).toEqual(testListId);
    expect(cards[0].position).toEqual(2);
    expect(cards[0].created_at).toBeInstanceOf(Date);
    expect(cards[0].last_list_change_at).toBeInstanceOf(Date);
  });

  it('should throw error when list does not exist', async () => {
    const testInput: CreateCardInput = {
      title: 'Invalid Card',
      list_id: 99999, // Non-existent list ID
      position: 0
    };

    await expect(createCard(testInput)).rejects.toThrow(/List with id 99999 not found/i);
  });

  it('should handle null optional fields correctly', async () => {
    await setupTestData();

    const testInput: CreateCardInput = {
      title: 'Null Fields Card',
      description: null,
      due_date: null,
      assigned_user_id: null,
      list_id: testListId,
      position: 0
    };

    const result = await createCard(testInput);

    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.assigned_user_id).toBeNull();
  });
});
