
import { db } from '../db';
import { boardsTable, usersTable } from '../db/schema';
import { type CreateBoardInput, type Board } from '../schema';
import { eq } from 'drizzle-orm';

export const createBoard = async (input: CreateBoardInput): Promise<Board> => {
  try {
    // Verify user exists before creating board
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert board record
    const result = await db.insert(boardsTable)
      .values({
        name: input.name,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Board creation failed:', error);
    throw error;
  }
};
