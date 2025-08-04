
import { db } from '../db';
import { boardsTable } from '../db/schema';
import { type UpdateBoardInput, type Board } from '../schema';
import { eq } from 'drizzle-orm';

export const updateBoard = async (input: UpdateBoardInput): Promise<Board> => {
  try {
    // Check if board exists first
    const existingBoards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, input.id))
      .execute();

    if (existingBoards.length === 0) {
      throw new Error('Board not found');
    }

    // Build update object with only provided fields
    const updateData: Partial<{ name: string }> = {};
    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    // If no fields to update, return existing board
    if (Object.keys(updateData).length === 0) {
      return existingBoards[0];
    }

    // Update the board
    const result = await db.update(boardsTable)
      .set(updateData)
      .where(eq(boardsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Board update failed:', error);
    throw error;
  }
};
