
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  AuthResponse, 
  LoginUserInput, 
  RegisterUserInput, 
  Board,
  List,
  Card as CardType,
  CreateCardInput,
  UpdateCardInput
} from '../../server/src/schema';

// Extract the user type from AuthResponse to avoid password_hash issues
type AuthUser = AuthResponse['user'];

function App() {
  // Authentication state - using the user type from AuthResponse
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auth forms
  const [loginForm, setLoginForm] = useState<LoginUserInput>({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState<RegisterUserInput>({
    email: '',
    password: '',
    name: ''
  });

  // Main app state
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Record<number, CardType[]>>({});

  // Dialog states
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState<number | null>(null);
  const [showEditCard, setShowEditCard] = useState<CardType | null>(null);

  // Form states
  const [newBoardName, setNewBoardName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [cardForm, setCardForm] = useState<CreateCardInput>({
    title: '',
    description: null,
    due_date: null,
    assigned_user_id: null,
    list_id: 0,
    position: 0
  });

  // Drag and drop state
  const [draggedCard, setDraggedCard] = useState<CardType | null>(null);
  const [dragOverList, setDragOverList] = useState<number | null>(null);

  // Auth functions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.loginUser.mutate(loginForm);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.registerUser.mutate(registerForm);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);
      setRegisterForm({ email: '', password: '', name: '' });
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setBoards([]);
    setSelectedBoard(null);
    setLists([]);
    setCards({});
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Load boards when user is authenticated
  const loadBoards = useCallback(async () => {
    if (!user) return;
    try {
      const userBoards = await trpc.getUserBoards.query({ userId: user.id });
      setBoards(userBoards);
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  }, [user]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  // Load lists when board is selected
  const loadLists = useCallback(async () => {
    if (!selectedBoard || !user) return;
    try {
      const boardLists = await trpc.getBoardLists.query({ 
        boardId: selectedBoard.id, 
        userId: user.id 
      });
      setLists(boardLists);
      
      // Load cards for each list
      const allCards: Record<number, CardType[]> = {};
      for (const list of boardLists) {
        const listCards = await trpc.getListCards.query({
          listId: list.id,
          userId: user.id
        });
        allCards[list.id] = listCards;
      }
      setCards(allCards);
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  }, [selectedBoard, user]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  // Board operations
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBoardName.trim()) return;

    setIsLoading(true);
    try {
      const newBoard = await trpc.createBoard.mutate({
        name: newBoardName,
        user_id: user.id
      });
      setBoards((prev: Board[]) => [...prev, newBoard]);
      setNewBoardName('');
      setShowCreateBoard(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    if (!user) return;
    try {
      await trpc.deleteBoard.mutate({ boardId, userId: user.id });
      setBoards((prev: Board[]) => prev.filter(b => b.id !== boardId));
      if (selectedBoard?.id === boardId) {
        setSelectedBoard(null);
        setLists([]);
        setCards({});
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  // List operations
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoard || !newListName.trim()) return;

    setIsLoading(true);
    try {
      const newList = await trpc.createList.mutate({
        name: newListName,
        board_id: selectedBoard.id,
        position: lists.length
      });
      setLists((prev: List[]) => [...prev, newList]);
      setCards((prev: Record<number, CardType[]>) => ({ ...prev, [newList.id]: [] }));
      setNewListName('');
      setShowCreateList(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteList = async (listId: number) => {
    if (!user) return;
    try {
      await trpc.deleteList.mutate({ listId, userId: user.id });
      setLists((prev: List[]) => prev.filter(l => l.id !== listId));
      setCards((prev: Record<number, CardType[]>) => {
        const newCards = { ...prev };
        delete newCards[listId];
        return newCards;
      });
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  // Card operations
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCreateCard || !cardForm.title.trim()) return;

    setIsLoading(true);
    try {
      const newCard = await trpc.createCard.mutate({
        ...cardForm,
        list_id: showCreateCard,
        position: cards[showCreateCard]?.length || 0
      });
      setCards((prev: Record<number, CardType[]>) => ({
        ...prev,
        [showCreateCard]: [...(prev[showCreateCard] || []), newCard]
      }));
      setCardForm({
        title: '',
        description: null,
        due_date: null,
        assigned_user_id: null,
        list_id: 0,
        position: 0
      });
      setShowCreateCard(null);
    } catch (error) {
      console.error('Failed to create card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditCard || !user) return;

    setIsLoading(true);
    try {
      const updateData: UpdateCardInput & { userId: number } = {
        id: showEditCard.id,
        title: cardForm.title || undefined,
        description: cardForm.description,
        due_date: cardForm.due_date,
        assigned_user_id: cardForm.assigned_user_id,
        userId: user.id
      };
      
      const updatedCard = await trpc.updateCard.mutate(updateData);
      
      // Update the card in the local state
      setCards((prev: Record<number, CardType[]>) => {
        const newCards = { ...prev };
        Object.keys(newCards).forEach(listId => {
          const listIdNum = parseInt(listId);
          newCards[listIdNum] = newCards[listIdNum].map((card: CardType) =>
            card.id === updatedCard.id ? updatedCard : card
          );
        });
        return newCards;
      });
      
      setShowEditCard(null);
      setCardForm({
        title: '',
        description: null,
        due_date: null,
        assigned_user_id: null,
        list_id: 0,
        position: 0
      });
    } catch (error) {
      console.error('Failed to update card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: number, listId: number) => {
    if (!user) return;
    try {
      await trpc.deleteCard.mutate({ cardId, userId: user.id });
      setCards((prev: Record<number, CardType[]>) => ({
        ...prev,
        [listId]: prev[listId].filter((card: CardType) => card.id !== cardId)
      }));
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, card: CardType) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, listId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverList(listId);
  };

  const handleDragLeave = () => {
    setDragOverList(null);
  };

  const handleDrop = async (e: React.DragEvent, targetListId: number) => {
    e.preventDefault();
    setDragOverList(null);
    
    if (!draggedCard || !user) return;

    const sourceListId = draggedCard.list_id;
    if (sourceListId === targetListId) return;

    try {
      await trpc.moveCard.mutate({
        card_id: draggedCard.id,
        source_list_id: sourceListId,
        target_list_id: targetListId,
        new_position: cards[targetListId]?.length || 0,
        userId: user.id
      });

      // Update local state
      setCards((prev: Record<number, CardType[]>) => {
        const newCards = { ...prev };
        newCards[sourceListId] = newCards[sourceListId].filter((card: CardType) => card.id !== draggedCard.id);
        newCards[targetListId] = [...newCards[targetListId], { ...draggedCard, list_id: targetListId }];
        return newCards;
      });
    } catch (error) {
      console.error('Failed to move card:', error);
    }

    setDraggedCard(null);
  };

  // Open edit card dialog
  const openEditCard = (card: CardType) => {
    setCardForm({
      title: card.title,
      description: card.description,
      due_date: card.due_date,
      assigned_user_id: card.assigned_user_id,
      list_id: card.list_id,
      position: card.position
    });
    setShowEditCard(card);
  };

  // Authentication UI
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              ✨ TaskFlow
            </CardTitle>
            <p className="text-gray-600 mt-2">Tu espacio de productividad personal</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
                <TabsTrigger value="login" className="data-[state=active]:bg-white">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-white">
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">📧 Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginForm((prev: LoginUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      className="border-2 border-purple-200 focus:border-purple-400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">🔒 Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginForm((prev: LoginUserInput) => ({ ...prev, password: e.target.value }))
                      }
                      className="border-2 border-purple-200 focus:border-purple-400"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2.5"
                  >
                    {isLoading ? '⏳ Iniciando...' : '🚀 Iniciar Sesión'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">👤 Nombre</Label>
                    <Input
                      id="register-name"
                      value={registerForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm((prev: RegisterUserInput) => ({ ...prev, name: e.target.value }))
                      }
                      className="border-2 border-purple-200 focus:border-purple-400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">📧 Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm((prev: RegisterUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      className="border-2 border-purple-200 focus:border-purple-400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">🔒 Contraseña</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm((prev: RegisterUserInput) => ({ ...prev, password: e.target.value }))
                      }
                      className="border-2 border-purple-200 focus:border-purple-400"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2.5"
                  >
                    {isLoading ? '⏳ Creando cuenta...' : '✨ Crear Cuenta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main application UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-25 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              ✨ TaskFlow
            </h1>
            {selectedBoard && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 px-3 py-1">
                📋 {selectedBoard.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">👋 Hola, {user.name}</span>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50"
            >
              🚪 Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {!selectedBoard ? (
          // Board selection view
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-800">🎯 Mis Tableros</h2>
              <Dialog open={showCreateBoard} onOpenChange={setShowCreateBoard}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                    ➕ Nuevo Tablero
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm border-purple-200">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-800">
                      ✨ Crear Nuevo Tablero
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateBoard} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="board-name">📝 Nombre del tablero</Label>
                      <Input
                        id="board-name"
                        value={newBoardName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBoardName(e.target.value)}
                        placeholder="ej. 🏠 Proyecto Casa Nueva"
                        className="border-2 border-purple-200 focus:border-purple-400"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCreateBoard(false)}
                        className="border-gray-300"
                      >
                        ❌ Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      >
                        {isLoading ? '⏳ Creando...' : '🚀 Crear Tablero'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {boards.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  ¡Aún no tienes tableros!
                </h3>
                <p className="text-gray-500">
                  Crea tu primer tablero para empezar a organizar tus tareas
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((board: Board) => (
                  <Card 
                    key={board.id} 
                    className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90"
                    onClick={() => setSelectedBoard(board)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
                          {board.name}
                        </CardTitle>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            >
                              🗑️
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
                            <AlertDialogHeader>
                              <AlertDialogTitle>⚠️ ¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente el tablero "{board.name}" y todas sus listas y tarjetas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-300">❌ Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteBoard(board.id)}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                🗑️ Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500">
                        📅 Creado el {board.created_at.toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Board view with lists and cards
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button
                onClick={() => setSelectedBoard(null)}
                variant="outline"
                className="border-purple-200 hover:bg-purple-50"
              >
                ← Volver a tableros
              </Button>
              <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white">
                    ➕ Nueva Lista
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm border-purple-200">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-800">
                      📋 Crear Nueva Lista
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateList} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="list-name">📝 Nombre de la lista</Label>
                      <Input
                        id="list-name"
                        value={newListName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewListName(e.target.value)}
                        placeholder="ej. 📋 Por hacer"
                        className="border-2 border-green-200 focus:border-green-400"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCreateList(false)}
                        className="border-gray-300"
                      >
                        ❌ Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                      >
                        {isLoading ? '⏳ Creando...' : '🚀 Crear Lista'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {lists.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  ¡Tu tablero está esperando!
                </h3>
                <p className="text-gray-500">
                  Crea tu primera lista para empezar a organizar las tarjetas
                </p>
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-4">
                {lists.map((list: List) => (
                  <div 
                    key={list.id} 
                    className={`flex-shrink-0 w-80 bg-white/70 backdrop-blur-sm rounded-lg border-2 transition-all ${
                      dragOverList === list.id ? 'border-purple-400 bg-purple-50/70' : 'border-gray-200'
                    }`}
                    onDragOver={(e: React.DragEvent) => handleDragOver(e, list.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e: React.DragEvent) => handleDrop(e, list.id)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-800 text-lg">{list.name}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            {cards[list.id]?.length || 0}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                🗑️
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white/95 backdrop-blur-sm">
                              <AlertDialogHeader>
                                <AlertDialogTitle>⚠️ ¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente la lista "{list.name}" y todas sus tarjetas.
                                </AlertDialogDescription>
                
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-300">❌ Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteList(list.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  🗑️ Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="space-y-3 min-h-[200px]">
                        {cards[list.id]?.map((card: CardType) => (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e: React.DragEvent) => handleDragStart(e, card)}
                            className="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow group"
                            onClick={() => openEditCard(card)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-800 text-sm leading-tight">{card.title}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-6 w-6"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleDeleteCard(card.id, list.id);
                                }}
                              >
                                🗑️
                              </Button>
                            </div>
                            {card.description && (
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{card.description}</p>
                            )}
                            <div className="flex justify-between items-center">
                              {card.due_date && (
                                <Badge variant="outline" className="text-xs border-orange-200 text-orange-600">
                                  📅 {card.due_date.toLocaleDateString()}
                                </Badge>
                              )}
                              {card.assigned_user_id && (
                                <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">
                                  👤 Asignado
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}

                        <Button
                          onClick={() => setShowCreateCard(list.id)}
                          variant="ghost"
                          className="w-full border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50/50 text-gray-500 hover:text-purple-600 py-8"
                        >
                          ➕ Añadir tarjeta
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Card Dialog */}
      <Dialog open={showCreateCard !== null} onOpenChange={(open) => !open && setShowCreateCard(null)}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-purple-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">
              ✨ Crear Nueva Tarjeta
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCard} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-title">📝 Título</Label>
              <Input
                id="card-title"
                value={cardForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCardForm((prev: CreateCardInput) => ({ ...prev, title: e.target.value }))
                }
                placeholder="ej. 🎨 Diseñar nueva landing page"
                className="border-2 border-purple-200 focus:border-purple-400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-description">📄 Descripción (opcional)</Label>
              <Textarea
                id="card-description"
                value={cardForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCardForm((prev: CreateCardInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                placeholder="Describe los detalles de esta tarea..."
                className="border-2 border-purple-200 focus:border-purple-400 min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-due-date">📅 Fecha límite (opcional)</Label>
              <Input
                id="card-due-date"
                type="date"
                value={cardForm.due_date ? cardForm.due_date.toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCardForm((prev: CreateCardInput) => ({ 
                    ...prev, 
                    due_date: e.target.value ? new Date(e.target.value) : null 
                  }))
                }
                className="border-2 border-purple-200 focus:border-purple-400"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateCard(null)}
                className="border-gray-300"
              >
                ❌ Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {isLoading ? '⏳ Creando...' : '🚀 Crear Tarjeta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={showEditCard !== null} onOpenChange={(open) => !open && setShowEditCard(null)}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-purple-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800">
              ✏️ Editar Tarjeta
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCard} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-card-title">📝 Título</Label>
              <Input
                id="edit-card-title"
                value={cardForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCardForm((prev: CreateCardInput) => ({ ...prev, title: e.target.value }))
                }
                className="border-2 border-purple-200 focus:border-purple-400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-card-description">📄 Descripción</Label>
              <Textarea
                id="edit-card-description"
                value={cardForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCardForm((prev: CreateCardInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                className="border-2 border-purple-200 focus:border-purple-400 min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-card-due-date">📅 Fecha límite</Label>
              <Input
                id="edit-card-due-date"
                type="date"
                value={cardForm.due_date ? cardForm.due_date.toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCardForm((prev: CreateCardInput) => ({ 
                    ...prev, 
                    due_date: e.target.value ? new Date(e.target.value) : null 
                  }))
                }
                className="border-2 border-purple-200 focus:border-purple-400"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditCard(null)}
                className="border-gray-300"
              >
                ❌ Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {isLoading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
