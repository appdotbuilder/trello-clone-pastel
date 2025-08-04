
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  registerUserInputSchema, 
  loginUserInputSchema,
  createBoardInputSchema,
  updateBoardInputSchema,
  createListInputSchema,
  updateListInputSchema,
  createCardInputSchema,
  updateCardInputSchema,
  moveCardInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createBoard } from './handlers/create_board';
import { getUserBoards } from './handlers/get_user_boards';
import { updateBoard } from './handlers/update_board';
import { deleteBoard } from './handlers/delete_board';
import { createList } from './handlers/create_list';
import { getBoardLists } from './handlers/get_board_lists';
import { updateList } from './handlers/update_list';
import { deleteList } from './handlers/delete_list';
import { createCard } from './handlers/create_card';
import { getListCards } from './handlers/get_list_cards';
import { updateCard } from './handlers/update_card';
import { moveCard } from './handlers/move_card';
import { deleteCard } from './handlers/delete_card';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),
  
  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Board routes
  createBoard: publicProcedure
    .input(createBoardInputSchema)
    .mutation(({ input }) => createBoard(input)),
  
  getUserBoards: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserBoards(input.userId)),
  
  updateBoard: publicProcedure
    .input(updateBoardInputSchema)
    .mutation(({ input }) => updateBoard(input)),
  
  deleteBoard: publicProcedure
    .input(z.object({ boardId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteBoard(input.boardId, input.userId)),

  // List routes
  createList: publicProcedure
    .input(createListInputSchema)
    .mutation(({ input }) => createList(input)),
  
  getBoardLists: publicProcedure
    .input(z.object({ boardId: z.number(), userId: z.number() }))
    .query(({ input }) => getBoardLists(input.boardId, input.userId)),
  
  updateList: publicProcedure
    .input(updateListInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => updateList(input, input.userId)),
  
  deleteList: publicProcedure
    .input(z.object({ listId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteList(input.listId, input.userId)),

  // Card routes
  createCard: publicProcedure
    .input(createCardInputSchema)
    .mutation(({ input }) => createCard(input)),
  
  getListCards: publicProcedure
    .input(z.object({ listId: z.number(), userId: z.number() }))
    .query(({ input }) => getListCards(input.listId, input.userId)),
  
  updateCard: publicProcedure
    .input(updateCardInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => updateCard(input, input.userId)),
  
  moveCard: publicProcedure
    .input(moveCardInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => moveCard(input, input.userId)),
  
  deleteCard: publicProcedure
    .input(z.object({ cardId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteCard(input.cardId, input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
