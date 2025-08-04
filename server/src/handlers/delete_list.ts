
import { db } from '../db';
import { listsTable, boardsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteList = async (listId: number, userId: number): Promise<{ success: boolean }> => {
  try {
    // First verify that the list exists and belongs to a board owned by the user
    const listWithBoard = await db.select({
      list_id: listsTable.id,
      board_user_id: boardsTable.user_id
    })
    .from(listsTable)
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(listsTable.id, listId))
    .execute();

    if (listWithBoard.length === 0) {
      throw new Error('List not found');
    }

    if (listWithBoard[0].board_user_id !== userId) {
      throw new Error('Unauthorized: List belongs to a board owned by another user');
    }

    // Delete the list (cascade will automatically delete associated cards)
    const result = await db.delete(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('List deletion failed:', error);
    throw error;
  }
};
