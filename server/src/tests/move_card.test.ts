
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, cardsTable } from '../db/schema';
import { type MoveCardInput } from '../schema';
import { moveCard } from '../handlers/move_card';
import { eq, asc } from 'drizzle-orm';

describe('moveCard', () => {
  let userId: number;
  let boardId: number;
  let sourceListId: number;
  let targetListId: number;
  let cardIds: number[];

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test board
    const boardResult = await db.insert(boardsTable)
      .values({
        name: 'Test Board',
        user_id: userId
      })
      .returning()
      .execute();
    boardId = boardResult[0].id;

    // Create test lists
    const sourceListResult = await db.insert(listsTable)
      .values({
        name: 'Source List',
        board_id: boardId,
        position: 0
      })
      .returning()
      .execute();
    sourceListId = sourceListResult[0].id;

    const targetListResult = await db.insert(listsTable)
      .values({
        name: 'Target List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    targetListId = targetListResult[0].id;

    // Create test cards in source list
    const cardResults = await db.insert(cardsTable)
      .values([
        {
          title: 'Card 1',
          description: null,
          due_date: null,
          assigned_user_id: null,
          list_id: sourceListId,
          position: 0
        },
        {
          title: 'Card 2',
          description: null,
          due_date: null,
          assigned_user_id: null,
          list_id: sourceListId,
          position: 1
        },
        {
          title: 'Card 3',
          description: null,
          due_date: null,
          assigned_user_id: null,
          list_id: sourceListId,
          position: 2
        }
      ])
      .returning()
      .execute();
    cardIds = cardResults.map(card => card.id);

    // Create cards in target list
    await db.insert(cardsTable)
      .values([
        {
          title: 'Target Card 1',
          description: null,
          due_date: null,
          assigned_user_id: null,
          list_id: targetListId,
          position: 0
        },
        {
          title: 'Target Card 2',
          description: null,
          due_date: null,
          assigned_user_id: null,
          list_id: targetListId,
          position: 1
        }
      ])
      .execute();
  });

  afterEach(resetDB);

  it('should move card between different lists', async () => {
    const input: MoveCardInput = {
      card_id: cardIds[0],
      source_list_id: sourceListId,
      target_list_id: targetListId,
      new_position: 1
    };

    const result = await moveCard(input, userId);

    // Verify card was updated
    expect(result.id).toEqual(cardIds[0]);
    expect(result.list_id).toEqual(targetListId);
    expect(result.position).toEqual(1);
    expect(result.title).toEqual('Card 1');

    // Verify card exists in database with correct values
    const updatedCard = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.id, cardIds[0]))
      .execute();

    expect(updatedCard[0].list_id).toEqual(targetListId);
    expect(updatedCard[0].position).toEqual(1);

    // Verify positions in source list were adjusted (shifted up)
    const sourceCards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, sourceListId))
      .orderBy(asc(cardsTable.position))
      .execute();

    expect(sourceCards).toHaveLength(2);
    expect(sourceCards[0].title).toEqual('Card 2');
    expect(sourceCards[0].position).toEqual(0);
    expect(sourceCards[1].title).toEqual('Card 3');
    expect(sourceCards[1].position).toEqual(1);

    // Verify positions in target list were adjusted (shifted down after position 1)
    const targetCards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, targetListId))
      .orderBy(asc(cardsTable.position))
      .execute();

    expect(targetCards).toHaveLength(3);
    expect(targetCards[0].title).toEqual('Target Card 1');
    expect(targetCards[0].position).toEqual(0);
    expect(targetCards[1].title).toEqual('Card 1');
    expect(targetCards[1].position).toEqual(1);
    expect(targetCards[2].title).toEqual('Target Card 2');
    expect(targetCards[2].position).toEqual(2);
  });

  it('should move card within same list (moving down)', async () => {
    const input: MoveCardInput = {
      card_id: cardIds[0], // Card 1 at position 0
      source_list_id: sourceListId,
      target_list_id: sourceListId,
      new_position: 2
    };

    const result = await moveCard(input, userId);

    expect(result.position).toEqual(2);
    expect(result.list_id).toEqual(sourceListId);

    // Verify positions were adjusted correctly
    const cards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, sourceListId))
      .orderBy(asc(cardsTable.position))
      .execute();

    expect(cards).toHaveLength(3);
    expect(cards[0].title).toEqual('Card 2');
    expect(cards[0].position).toEqual(0);
    expect(cards[1].title).toEqual('Card 3');
    expect(cards[1].position).toEqual(1);
    expect(cards[2].title).toEqual('Card 1');
    expect(cards[2].position).toEqual(2);
  });

  it('should move card within same list (moving up)', async () => {
    const input: MoveCardInput = {
      card_id: cardIds[2], // Card 3 at position 2
      source_list_id: sourceListId,
      target_list_id: sourceListId,
      new_position: 0
    };

    const result = await moveCard(input, userId);

    expect(result.position).toEqual(0);
    expect(result.list_id).toEqual(sourceListId);

    // Verify positions were adjusted correctly
    const cards = await db.select()
      .from(cardsTable)
      .where(eq(cardsTable.list_id, sourceListId))
      .orderBy(asc(cardsTable.position))
      .execute();

    expect(cards).toHaveLength(3);
    expect(cards[0].title).toEqual('Card 3');
    expect(cards[0].position).toEqual(0);
    expect(cards[1].title).toEqual('Card 1');
    expect(cards[1].position).toEqual(1);
    expect(cards[2].title).toEqual('Card 2');
    expect(cards[2].position).toEqual(2);
  });

  it('should throw error when card does not exist', async () => {
    const input: MoveCardInput = {
      card_id: 999,
      source_list_id: sourceListId,
      target_list_id: targetListId,
      new_position: 0
    };

    expect(moveCard(input, userId)).rejects.toThrow(/card not found/i);
  });

  it('should throw error when card does not belong to authenticated user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        name: 'Other User'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    const input: MoveCardInput = {
      card_id: cardIds[0],
      source_list_id: sourceListId,
      target_list_id: targetListId,
      new_position: 0
    };

    expect(moveCard(input, otherUserId)).rejects.toThrow(/does not belong to authenticated user/i);
  });

  it('should throw error when source list does not belong to authenticated user', async () => {
    // Create another user and their board/list
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        name: 'Other User'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    const otherBoardResult = await db.insert(boardsTable)
      .values({
        name: 'Other Board',
        user_id: otherUserId
      })
      .returning()
      .execute();

    const otherListResult = await db.insert(listsTable)
      .values({
        name: 'Other List',
        board_id: otherBoardResult[0].id,
        position: 0
      })
      .returning()
      .execute();

    const input: MoveCardInput = {
      card_id: cardIds[0],
      source_list_id: otherListResult[0].id,
      target_list_id: targetListId,
      new_position: 0
    };

    expect(moveCard(input, userId)).rejects.toThrow(/source list not found/i);
  });

  it('should throw error when target list does not belong to authenticated user', async () => {
    // Create another user and their board/list
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        name: 'Other User'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    const otherBoardResult = await db.insert(boardsTable)
      .values({
        name: 'Other Board',
        user_id: otherUserId
      })
      .returning()
      .execute();

    const otherListResult = await db.insert(listsTable)
      .values({
        name: 'Other List',
        board_id: otherBoardResult[0].id,
        position: 0
      })
      .returning()
      .execute();

    const input: MoveCardInput = {
      card_id: cardIds[0],
      source_list_id: sourceListId,
      target_list_id: otherListResult[0].id,
      new_position: 0
    };

    expect(moveCard(input, userId)).rejects.toThrow(/target list not found/i);
  });
});
