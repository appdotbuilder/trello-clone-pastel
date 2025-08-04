
import { db } from '../db';
import { cardsTable, listsTable } from '../db/schema';
import { type CreateCardInput, type Card } from '../schema';
import { eq } from 'drizzle-orm';

export const createCard = async (input: CreateCardInput): Promise<Card> => {
  try {
    // Verify that the list exists
    const list = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, input.list_id))
      .execute();

    if (list.length === 0) {
      throw new Error(`List with id ${input.list_id} not found`);
    }

    // Insert card record
    const currentTime = new Date();
    const result = await db.insert(cardsTable)
      .values({
        title: input.title,
        description: input.description || null,
        due_date: input.due_date || null,
        assigned_user_id: input.assigned_user_id || null,
        list_id: input.list_id,
        position: input.position,
        last_list_change_at: currentTime
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Card creation failed:', error);
    throw error;
  }
};
