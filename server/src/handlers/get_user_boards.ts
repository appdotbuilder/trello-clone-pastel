
import { db } from '../db';
import { boardsTable } from '../db/schema';
import { type Board } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserBoards = async (userId: number): Promise<Board[]> => {
  try {
    const results = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.user_id, userId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user boards:', error);
    throw error;
  }
};
