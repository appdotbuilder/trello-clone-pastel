
import { db } from '../db';
import { cardsTable, boardsTable, listsTable } from '../db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';

export const deleteCard = async (cardId: number, userId: number): Promise<{ success: boolean }> => {
  try {
    // First, verify the card exists and belongs to a board owned by the user
    const cardWithBoard = await db.select({
      card_id: cardsTable.id,
      list_id: cardsTable.list_id,
      position: cardsTable.position,
      board_user_id: boardsTable.user_id
    })
    .from(cardsTable)
    .innerJoin(listsTable, eq(cardsTable.list_id, listsTable.id))
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(cardsTable.id, cardId))
    .execute();

    if (cardWithBoard.length === 0) {
      throw new Error('Card not found');
    }

    const cardData = cardWithBoard[0];
    
    if (cardData.board_user_id !== userId) {
      throw new Error('Unauthorized: Card does not belong to user');
    }

    // Delete the card
    await db.delete(cardsTable)
      .where(eq(cardsTable.id, cardId))
      .execute();

    // Update positions of remaining cards in the same list
    // Decrease position by 1 for all cards that had position > deleted card's position
    await db.update(cardsTable)
      .set({ 
        position: sql`${cardsTable.position} - 1`
      })
      .where(
        and(
          eq(cardsTable.list_id, cardData.list_id),
          gt(cardsTable.position, cardData.position)
        )
      )
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Card deletion failed:', error);
    throw error;
  }
};
