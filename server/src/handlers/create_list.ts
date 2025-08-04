
import { db } from '../db';
import { listsTable, boardsTable } from '../db/schema';
import { type CreateListInput, type List } from '../schema';
import { eq } from 'drizzle-orm';

export const createList = async (input: CreateListInput): Promise<List> => {
  try {
    // First, verify that the board exists
    const board = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, input.board_id))
      .execute();

    if (board.length === 0) {
      throw new Error(`Board with id ${input.board_id} not found`);
    }

    // Insert the new list
    const result = await db.insert(listsTable)
      .values({
        name: input.name,
        board_id: input.board_id,
        position: input.position
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('List creation failed:', error);
    throw error;
  }
};
