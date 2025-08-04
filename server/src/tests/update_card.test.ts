
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, cardsTable } from '../db/schema';
import { type UpdateCardInput } from '../schema';
import { updateCard } from '../handlers/update_card';
import { eq } from 'drizzle-orm';

describe('updateCard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testBoardId: number;
  let testListId: number;
  let testListId2: number;
  let testCardId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create another user for authorization tests
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        name: 'Other User'
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create test board
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: testUserId
      })
      .returning()
      .execute();
    testBoardId = boardResult[0].id;

    // Create test lists
    const listResult = await db.insert(listsTable)
      .values([
        {
          name: 'Test List',
          board_id: testBoardId,
          position: 0
        },
        {
          name: 'Second List',
          board_id: testBoardId,
          position: 1
        }
      ])
      .returning()
      .execute();
    testListId = listResult[0].id;
    testListId2 = listResult[1].id;

    // Create test card
    const cardResult = await db.insert(cardsTable)
      .values({
        title: 'Original Title',
        description: 'Original description',
        due_date: new Date('2024-01-01'),
        assigned_user_id: testUserId,
        list_id: testListId,
        position: 0
      })
      .returning()
      .execute();
    testCardId = cardResult[0].id;
  });

  it('should update card title', async () => {
    const input: UpdateCardInput = {
      id: testCardId,
      title: 'Updated Title'
    };

    const result = await updateCard(input, testUserId);

    expect(result.id).toEqual(testCardId);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.list_id).toEqual(testListId);
    expect(result.position).toEqual(0);
    expect(result.last_list_change_at).toBeInstanceOf(Date);
  });

  it('should update multiple card fields', async () => {
    const newDueDate = new Date('2024-12-31');
    const input: UpdateCardInput = {
      id: testCardId,
      title: 'New Title',
      description: 'New description',
      due_date: newDueDate,
      assigned_user_id: otherUserId,
      position: 5
    };

    const result = await updateCard(input, testUserId);

    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.due_date).toEqual(newDueDate);
    expect(result.assigned_user_id).toEqual(otherUserId);
    expect(result.position).toEqual(5);
    expect(result.list_id).toEqual(testListId); // Should remain unchanged
  });

  it('should update card with nullable fields set to null', async () => {
    const input: UpdateCardInput = {
      id: testCardId,
      description: null,
      due_date: null,
      assigned_user_id: null
    };

    const result = await updateCard(input, testUserId);

    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.assigned_user_id).toBeNull();
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
  });

  it('should persist changes to database', async () => {
    const input: UpdateCardInput = {
      id: testCardId,
      title: 'Database Test Title',
      position: 10
    };

    await updateCard(input, testUserId);

    // Verify in database
    const cards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.id, testCardId))
      .execute();

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toEqual('Database Test Title');
    expect(cards[0].position).toEqual(10);
    expect(cards[0].description).toEqual('Original description'); // Unchanged
  });

  it('should throw error when card does not exist', async () => {
    const input: UpdateCardInput = {
      id: 99999,
      title: 'Non-existent Card'
    };

    await expect(updateCard(input, testUserId)).rejects.toThrow(/card not found/i);
  });

  it('should throw error when user does not own the board', async () => {
    const input: UpdateCardInput = {
      id: testCardId,
      title: 'Unauthorized Update'
    };

    await expect(updateCard(input, otherUserId)).rejects.toThrow(/unauthorized/i);
  });

  it('should update last_list_change_at when list_id is changed', async () => {
    // Get the original timestamp
    const originalCard = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.id, testCardId))
      .execute();
    const originalTimestamp = originalCard[0].last_list_change_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCardInput = {
      id: testCardId,
      list_id: testListId2 // Move to different list
    };

    const result = await updateCard(input, testUserId);

    expect(result.list_id).toEqual(testListId2);
    expect(result.last_list_change_at).toBeInstanceOf(Date);
    expect(result.last_list_change_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());

    // Verify in database as well
    const updatedCard = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.id, testCardId))
      .execute();

    expect(updatedCard[0].last_list_change_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should NOT update last_list_change_at when other fields are changed', async () => {
    // Get the original timestamp
    const originalCard = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.id, testCardId))
      .execute();
    const originalTimestamp = originalCard[0].last_list_change_at;

    // Wait a small amount to ensure any timestamp difference would be detectable
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCardInput = {
      id: testCardId,
      title: 'Updated Title',
      description: 'Updated description',
      position: 5
    };

    const result = await updateCard(input, testUserId);

    expect(result.title).toEqual('Updated Title');
    expect(result.last_list_change_at.getTime()).toEqual(originalTimestamp.getTime());

    // Verify in database as well
    const updatedCard = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.id, testCardId))
      .execute();

    expect(updatedCard[0].last_list_change_at.getTime()).toEqual(originalTimestamp.getTime());
  });

  it('should handle partial updates correctly', async () => {
    // Update only position
    const positionInput: UpdateCardInput = {
      id: testCardId,
      position: 3
    };

    const result1 = await updateCard(positionInput, testUserId);
    expect(result1.position).toEqual(3);
    expect(result1.title).toEqual('Original Title');

    // Update only description
    const descriptionInput: UpdateCardInput = {
      id: testCardId,
      description: 'Partially updated description'
    };

    const result2 = await updateCard(descriptionInput, testUserId);
    expect(result2.description).toEqual('Partially updated description');
    expect(result2.position).toEqual(3); // Should maintain previous update
    expect(result2.title).toEqual('Original Title');
  });
});
