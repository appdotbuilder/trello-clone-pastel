
import { db } from '../db';
import { listsTable, boardsTable } from '../db/schema';
import { type UpdateListInput, type List } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateList = async (input: UpdateListInput, userId: number): Promise<List> => {
  try {
    // First verify the list exists and its board belongs to the authenticated user
    const existingList = await db.select({
      id: listsTable.id,
      name: listsTable.name,
      board_id: listsTable.board_id,
      position: listsTable.position,
      created_at: listsTable.created_at,
      board_user_id: boardsTable.user_id
    })
    .from(listsTable)
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(listsTable.id, input.id))
    .execute();

    if (existingList.length === 0) {
      throw new Error('List not found');
    }

    if (existingList[0].board_user_id !== userId) {
      throw new Error('Access denied: List does not belong to user');
    }

    // Build update object with only provided fields
    const updateData: Partial<{ name: string; position: number }> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.position !== undefined) {
      updateData.position = input.position;
    }

    // If no fields to update, return existing list
    if (Object.keys(updateData).length === 0) {
      return {
        id: existingList[0].id,
        name: existingList[0].name,
        board_id: existingList[0].board_id,
        position: existingList[0].position,
        created_at: existingList[0].created_at
      };
    }

    // Update the list
    const result = await db.update(listsTable)
      .set(updateData)
      .where(eq(listsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('List update failed:', error);
    throw error;
  }
};
