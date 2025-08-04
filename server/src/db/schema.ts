
import { serial, text, pgTable, timestamp, integer, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const boardsTable = pgTable('boards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const listsTable = pgTable('lists', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  board_id: integer('board_id').notNull().references(() => boardsTable.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const cardsTable = pgTable('cards', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'), // Nullable by default
  due_date: timestamp('due_date'), // Nullable by default
  assigned_user_id: integer('assigned_user_id').references(() => usersTable.id, { onDelete: 'set null' }),
  list_id: integer('list_id').notNull().references(() => listsTable.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  last_list_change_at: timestamp('last_list_change_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  boards: many(boardsTable),
  assignedCards: many(cardsTable),
}));

export const boardsRelations = relations(boardsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [boardsTable.user_id],
    references: [usersTable.id],
  }),
  lists: many(listsTable),
}));

export const listsRelations = relations(listsTable, ({ one, many }) => ({
  board: one(boardsTable, {
    fields: [listsTable.board_id],
    references: [boardsTable.id],
  }),
  cards: many(cardsTable),
}));

export const cardsRelations = relations(cardsTable, ({ one }) => ({
  list: one(listsTable, {
    fields: [cardsTable.list_id],
    references: [listsTable.id],
  }),
  assignedUser: one(usersTable, {
    fields: [cardsTable.assigned_user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Board = typeof boardsTable.$inferSelect;
export type NewBoard = typeof boardsTable.$inferInsert;
export type List = typeof listsTable.$inferSelect;
export type NewList = typeof listsTable.$inferInsert;
export type Card = typeof cardsTable.$inferSelect;
export type NewCard = typeof cardsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  boards: boardsTable, 
  lists: listsTable, 
  cards: cardsTable 
};
