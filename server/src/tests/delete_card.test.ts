
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, cardsTable } from '../db/schema';
import { deleteCard } from '../handlers/delete_card';
import { eq, and } from 'drizzle-orm';

describe('deleteCard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;
  let testBoardId: number;
  let otherBoardId: number;
  let testListId: number;
  let testCardId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashed_password',
          name: 'Test User'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password',
          name: 'Other User'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test boards
    const boards = await db.insert(boardsTable)
      .values([
        {
          name: 'Test Board',
          user_id: testUserId
        },
        {
          name: 'Other Board',
          user_id: otherUserId
        }
      ])
      .returning()
      .execute();

    testBoardId = boards[0].id;
    otherBoardId = boards[1].id;

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

    // Create test cards with different positions
    const cards = await db.insert(cardsTable)
      .values([
        {
          title: 'Card 1',
          description: 'First card',
          due_date: null,
          assigned_user_id: null,
          list_id: testListId,
          position: 0
        },
        {
          title: 'Card 2',
          description: 'Second card',
          due_date: null,
          assigned_user_id: null,
          list_id: testListId,
          position: 1
        },
        {
          title: 'Card 3',
          description: 'Third card',
          due_date: null,
          assigned_user_id: null,
          list_id: testListId,
          position: 2
        }
      ])
      .returning()
      .execute();

    testCardId = cards[1].id; // Use the middle card for deletion
  });

  it('should delete a card successfully', async () => {
    const result = await deleteCard(testCardId, testUserId);

    expect(result.success).toBe(true);

    // Verify card was deleted
    const deletedCard = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.id, testCardId))
      .execute();

    expect(deletedCard).toHaveLength(0);
  });

  it('should update positions of remaining cards', async () => {
    await deleteCard(testCardId, testUserId);

    // Get remaining cards ordered by position
    const remainingCards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, testListId))
      .orderBy(cardsTable.position)
      .execute();

    expect(remainingCards).toHaveLength(2);
    expect(remainingCards[0].title).toBe('Card 1');
    expect(remainingCards[0].position).toBe(0);
    expect(remainingCards[1].title).toBe('Card 3');
    expect(remainingCards[1].position).toBe(1); // Should be decreased from 2 to 1
  });

  it('should throw error for non-existent card', async () => {
    const nonExistentCardId = 999999;

    await expect(deleteCard(nonExistentCardId, testUserId))
      .rejects.toThrow(/card not found/i);
  });

  it('should throw error when user does not own the board', async () => {
    await expect(deleteCard(testCardId, otherUserId))
      .rejects.toThrow(/unauthorized.*does not belong to user/i);
  });

  it('should handle deletion of first card', async () => {
    // Get the first card
    const firstCard = await db.select()
      .from(cardsTable)
      .where(
        and(
          eq(cardsTable.list_id, testListId),
          eq(cardsTable.position, 0)
        )
      )
      .execute();

    const result = await deleteCard(firstCard[0].id, testUserId);

    expect(result.success).toBe(true);

    // Verify positions were updated correctly
    const remainingCards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, testListId))
      .orderBy(cardsTable.position)
      .execute();

    expect(remainingCards).toHaveLength(2);
    expect(remainingCards[0].title).toBe('Card 2');
    expect(remainingCards[0].position).toBe(0); // Was 1, now 0
    expect(remainingCards[1].title).toBe('Card 3');
    expect(remainingCards[1].position).toBe(1); // Was 2, now 1
  });

  it('should handle deletion of last card', async () => {
    // Get the last card
    const lastCard = await db.select()
      .from(cardsTable)
      .where(
        and(
          eq(cardsTable.list_id, testListId),
          eq(cardsTable.position, 2)
        )
      )
      .execute();

    const result = await deleteCard(lastCard[0].id, testUserId);

    expect(result.success).toBe(true);

    // Verify positions remain unchanged for cards before it
    const remainingCards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, testListId))
      .orderBy(cardsTable.position)
      .execute();

    expect(remainingCards).toHaveLength(2);
    expect(remainingCards[0].title).toBe('Card 1');
    expect(remainingCards[0].position).toBe(0);
    expect(remainingCards[1].title).toBe('Card 2');
    expect(remainingCards[1].position).toBe(1);
  });
});
