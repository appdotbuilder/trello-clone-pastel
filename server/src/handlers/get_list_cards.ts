
import { db } from '../db';
import { cardsTable, listsTable, boardsTable, usersTable } from '../db/schema';
import { type Card } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export const getListCards = async (listId: number, userId: number): Promise<Card[]> => {
  try {
    // First verify the list exists and belongs to a board owned by the user
    const listValidation = await db.select()
      .from(listsTable)
      .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
      .where(
        and(
          eq(listsTable.id, listId),
          eq(boardsTable.user_id, userId)
        )
      )
      .execute();

    if (listValidation.length === 0) {
      throw new Error('List not found or access denied');
    }

    // Query all cards for the list with assigned user information
    const results = await db.select({
      id: cardsTable.id,
      title: cardsTable.title,
      description: cardsTable.description,
      due_date: cardsTable.due_date,
      assigned_user_id: cardsTable.assigned_user_id,
      list_id: cardsTable.list_id,
      position: cardsTable.position,
      created_at: cardsTable.created_at
    })
      .from(cardsTable)
      .where(eq(cardsTable.list_id, listId))
      .orderBy(asc(cardsTable.position))
      .execute();

    return results;
  } catch (error) {
    console.error('Get list cards failed:', error);
    throw error;
  }
};
