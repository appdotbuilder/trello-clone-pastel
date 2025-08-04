
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User input schemas
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1)
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Board schema
export const boardSchema = z.object({
  id: z.number(),
  name: z.string(),
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type Board = z.infer<typeof boardSchema>;

export const createBoardInputSchema = z.object({
  name: z.string().min(1),
  user_id: z.number()
});

export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;

export const updateBoardInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional()
});

export type UpdateBoardInput = z.infer<typeof updateBoardInputSchema>;

// List schema
export const listSchema = z.object({
  id: z.number(),
  name: z.string(),
  board_id: z.number(),
  position: z.number().int(),
  created_at: z.coerce.date()
});

export type List = z.infer<typeof listSchema>;

export const createListInputSchema = z.object({
  name: z.string().min(1),
  board_id: z.number(),
  position: z.number().int()
});

export type CreateListInput = z.infer<typeof createListInputSchema>;

export const updateListInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  position: z.number().int().optional()
});

export type UpdateListInput = z.infer<typeof updateListInputSchema>;

// Card schema
export const cardSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  due_date: z.coerce.date().nullable(),
  assigned_user_id: z.number().nullable(),
  list_id: z.number(),
  position: z.number().int(),
  created_at: z.coerce.date()
});

export type Card = z.infer<typeof cardSchema>;

export const createCardInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  assigned_user_id: z.number().nullable().optional(),
  list_id: z.number(),
  position: z.number().int()
});

export type CreateCardInput = z.infer<typeof createCardInputSchema>;

export const updateCardInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  assigned_user_id: z.number().nullable().optional(),
  list_id: z.number().optional(),
  position: z.number().int().optional()
});

export type UpdateCardInput = z.infer<typeof updateCardInputSchema>;

// Move card input schema for drag and drop functionality
export const moveCardInputSchema = z.object({
  card_id: z.number(),
  source_list_id: z.number(),
  target_list_id: z.number(),
  new_position: z.number().int()
});

export type MoveCardInput = z.infer<typeof moveCardInputSchema>;

// Auth response schema
export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
