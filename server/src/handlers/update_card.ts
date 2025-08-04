
import { db } from '../db';
import { cardsTable, boardsTable, listsTable } from '../db/schema';
import { type UpdateCardInput, type Card } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCard = async (input: UpdateCardInput, userId: number): Promise<Card> => {
  try {
    // First, verify the card exists and the user owns the board
    const cardWithBoard = await db.select({
      card: cardsTable,
      board_user_id: boardsTable.user_id
    })
    .from(cardsTable)
    .innerJoin(listsTable, eq(cardsTable.list_id, listsTable.id))
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(cardsTable.id, input.id))
    .execute();

    if (cardWithBoard.length === 0) {
      throw new Error('Card not found');
    }

    if (cardWithBoard[0].board_user_id !== userId) {
      throw new Error('Unauthorized: Card does not belong to user');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof cardsTable.$inferInsert> = {};
    
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }
    if (input.assigned_user_id !== undefined) {
      updateData.assigned_user_id = input.assigned_user_id;
    }
    if (input.list_id !== undefined) {
      updateData.list_id = input.list_id;
      // Update last_list_change_at when list_id changes
      updateData.last_list_change_at = new Date();
    }
    if (input.position !== undefined) {
      updateData.position = input.position;
    }

    // Update the card
    const result = await db.update(cardsTable)
      .set(updateData)
      .where(eq(cardsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Card update failed:', error);
    throw error;
  }
};
