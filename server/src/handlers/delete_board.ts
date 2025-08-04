
import { db } from '../db';
import { boardsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteBoard = async (boardId: number, userId: number): Promise<{ success: boolean }> => {
  try {
    // Delete the board only if it exists and belongs to the authenticated user
    const result = await db.delete(boardsTable)
      .where(and(
        eq(boardsTable.id, boardId),
        eq(boardsTable.user_id, userId)
      ))
      .execute();

    // Check if any rows were affected (board was found and deleted)
    return { success: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    console.error('Board deletion failed:', error);
    throw error;
  }
};
