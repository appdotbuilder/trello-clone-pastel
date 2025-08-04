
import { db } from '../db';
import { cardsTable, listsTable, boardsTable } from '../db/schema';
import { type MoveCardInput, type Card } from '../schema';
import { eq, and, gte, lt, sql } from 'drizzle-orm';

export const moveCard = async (input: MoveCardInput, userId: number): Promise<Card> => {
  try {
    return await db.transaction(async (tx) => {
      // 1. Validate that the card exists and belongs to the authenticated user
      const cardResult = await tx.select({
        id: cardsTable.id,
        title: cardsTable.title,
        description: cardsTable.description,
        due_date: cardsTable.due_date,
        assigned_user_id: cardsTable.assigned_user_id,
        list_id: cardsTable.list_id,
        position: cardsTable.position,
        created_at: cardsTable.created_at,
        board_user_id: boardsTable.user_id,
      })
        .from(cardsTable)
        .innerJoin(listsTable, eq(cardsTable.list_id, listsTable.id))
        .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
        .where(eq(cardsTable.id, input.card_id))
        .execute();

      if (cardResult.length === 0) {
        throw new Error('Card not found');
      }

      const card = cardResult[0];
      if (card.board_user_id !== userId) {
        throw new Error('Card does not belong to authenticated user');
      }

      // 2. Validate that both lists exist and belong to the authenticated user
      const listsResult = await tx.select({
        id: listsTable.id,
        board_id: boardsTable.id,
        board_user_id: boardsTable.user_id,
      })
        .from(listsTable)
        .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
        .where(and(
          eq(listsTable.id, input.source_list_id),
          eq(boardsTable.user_id, userId)
        ))
        .execute();

      const targetListsResult = await tx.select({
        id: listsTable.id,
        board_id: boardsTable.id,
        board_user_id: boardsTable.user_id,
      })
        .from(listsTable)
        .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
        .where(and(
          eq(listsTable.id, input.target_list_id),
          eq(boardsTable.user_id, userId)
        ))
        .execute();

      if (listsResult.length === 0) {
        throw new Error('Source list not found or does not belong to authenticated user');
      }

      if (targetListsResult.length === 0) {
        throw new Error('Target list not found or does not belong to authenticated user');
      }

      const oldPosition = card.position;
      const oldListId = card.list_id;
      const newPosition = input.new_position;
      const newListId = input.target_list_id;

      // 3. Update positions of affected cards in the source list
      if (oldListId === newListId) {
        // Moving within the same list
        if (oldPosition < newPosition) {
          // Moving down: shift cards between old and new position up
          await tx.update(cardsTable)
            .set({ position: sql`${cardsTable.position} - 1` })
            .where(and(
              eq(cardsTable.list_id, oldListId),
              gte(cardsTable.position, oldPosition + 1),
              lt(cardsTable.position, newPosition + 1)
            ))
            .execute();
        } else if (oldPosition > newPosition) {
          // Moving up: shift cards between new and old position down
          await tx.update(cardsTable)
            .set({ position: sql`${cardsTable.position} + 1` })
            .where(and(
              eq(cardsTable.list_id, oldListId),
              gte(cardsTable.position, newPosition),
              lt(cardsTable.position, oldPosition)
            ))
            .execute();
        }
      } else {
        // Moving between different lists
        // Shift cards in source list after the old position up
        await tx.update(cardsTable)
          .set({ position: sql`${cardsTable.position} - 1` })
          .where(and(
            eq(cardsTable.list_id, oldListId),
            gte(cardsTable.position, oldPosition + 1)
          ))
          .execute();

        // Shift cards in target list at or after the new position down
        await tx.update(cardsTable)
          .set({ position: sql`${cardsTable.position} + 1` })
          .where(and(
            eq(cardsTable.list_id, newListId),
            gte(cardsTable.position, newPosition)
          ))
          .execute();
      }

      // 4. Update the card's position and list_id
      const updatedCardResult = await tx.update(cardsTable)
        .set({
          list_id: newListId,
          position: newPosition,
        })
        .where(eq(cardsTable.id, input.card_id))
        .returning()
        .execute();

      return updatedCardResult[0];
    });
  } catch (error) {
    console.error('Move card failed:', error);
    throw error;
  }
};
