
import { db } from '../db';
import { boardsTable, listsTable } from '../db/schema';
import { type List } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export const getBoardLists = async (boardId: number, userId: number): Promise<List[]> => {
  try {
    // First verify that the board exists and belongs to the user
    const board = await db.select()
      .from(boardsTable)
      .where(and(eq(boardsTable.id, boardId), eq(boardsTable.user_id, userId)))
      .execute();

    if (board.length === 0) {
      throw new Error('Board not found or access denied');
    }

    // Query all lists for the board ordered by position
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.board_id, boardId))
      .orderBy(asc(listsTable.position))
      .execute();

    return lists;
  } catch (error) {
    console.error('Failed to get board lists:', error);
    throw error;
  }
};
