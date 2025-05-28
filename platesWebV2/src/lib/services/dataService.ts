import { browser } from '$app/environment';
import type { 
  User, 
  Recipe, 
  ChatMessage, 
  InventoryItem, 
  GroceryList, 
  GroceryItem, 
  Timer, 
  UserPreferences,
  Note,
  AIModelConfig
} from './types';
import { dbService } from './dbService';
import * as storageService from './storageService';

// Flag to track if IndexedDB is available and initialized
let isIndexedDBAvailable = false;

/**
 * Initialize the data service
 * This should be called at app startup
 */
export async function initDataService(): Promise<void> {
  if (!browser) return;
  
  try {
    // Check if IndexedDB is available
    if ('indexedDB' in window) {
      await dbService.init();
      isIndexedDBAvailable = true;
      console.log('IndexedDB initialized successfully');
      
      // Migrate data from localStorage to IndexedDB
      await dbService.migrateFromLocalStorage();
    } else {
      console.warn('IndexedDB is not available, falling back to localStorage');
      isIndexedDBAvailable = false;
    }
  } catch (error) {
    console.error('Error initializing IndexedDB:', error);
    console.warn('Falling back to localStorage');
    isIndexedDBAvailable = false;
  }
}

/**
 * Clears all application data from both IndexedDB and localStorage
 */
export async function clearAllData(): Promise<void> {
  if (!browser) return;
  
  try {
    console.log('Clearing all application data...');
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.clearAllData();
      } catch (error) {
        console.error('Error clearing IndexedDB data:', error);
      }
    }
    
    // Always clear localStorage as well
    try {
      storageService.clearAllData();
    } catch (error) {
      console.error('Error clearing localStorage data:', error);
    }
    
    console.log('All application data cleared successfully');
  } catch (error) {
    console.error('Error in clearAllData:', error);
    throw error;
  }
}

// User Service
export const userService = {
  getUser: async (userId: string): Promise<User | null> => {
    if (!browser) return null;
    
    if (isIndexedDBAvailable) {
      try {
        const user = await dbService.getUser(userId);
        return user || null;
      } catch (error) {
        console.error('Error getting user from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.userService.getUser(userId);
      }
    } else {
      return storageService.userService.getUser(userId);
    }
  },
  
  createUser: async (userId: string, username: string): Promise<User> => {
    if (!browser) {
      // Return a default user if not in browser
      return {
        id: userId,
        username,
        created_at: new Date().toISOString(),
        preferences: {
          theme: 'system',
          measurement_system: 'metric'
        }
      };
    }
    
    const newUser: User = {
      id: userId,
      username,
      created_at: new Date().toISOString(),
      preferences: {
        theme: 'system',
        measurement_system: 'metric',
        dietary_restrictions: [],
        favorite_cuisines: []
      }
    };
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.saveUser(newUser);
      } catch (error) {
        console.error('Error saving user to IndexedDB:', error);
        // Fall back to localStorage
        storageService.userService.createUser(userId, username);
      }
    } else {
      storageService.userService.createUser(userId, username);
    }
    
    return newUser;
  },
  
  getOrCreateUser: async (userId: string): Promise<User> => {
    const existingUser = await userService.getUser(userId);
    if (existingUser) return existingUser;
    
    // Generate a random username
    const randomUsername = "Chef_" + Math.random().toString(36).substring(2, 10);
    return userService.createUser(userId, randomUsername);
  },
  
  updateUserPreferences: async (userId: string, preferences: Partial<UserPreferences>): Promise<User | null> => {
    const user = await userService.getUser(userId);
    if (!user) return null;
    
    const updatedUser: User = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences
      }
    };
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.saveUser(updatedUser);
        if (updatedUser.preferences) {
          await dbService.saveUserPreferences(userId, updatedUser.preferences);
        }
      } catch (error) {
        console.error('Error updating user preferences in IndexedDB:', error);
        // Fall back to localStorage
        return storageService.userService.updateUserPreferences(userId, preferences);
      }
    } else {
      return storageService.userService.updateUserPreferences(userId, preferences);
    }
    
    return updatedUser;
  }
};

// Recipe Service
export const recipeService = {
  getRecipes: async (userId: string): Promise<Recipe[]> => {
    if (!browser) return [];
    
    if (isIndexedDBAvailable) {
      try {
        return await dbService.getRecipes(userId);
      } catch (error) {
        console.error('Error getting recipes from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.recipeService.getRecipes(userId);
      }
    } else {
      return storageService.recipeService.getRecipes(userId);
    }
  },
  
  getRecipe: async (recipeId: number): Promise<Recipe | null> => {
    if (!browser) return null;
    
    if (isIndexedDBAvailable) {
      try {
        const recipe = await dbService.getRecipe(recipeId);
        return recipe || null;
      } catch (error) {
        console.error('Error getting recipe from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.recipeService.getRecipe(recipeId);
      }
    } else {
      return storageService.recipeService.getRecipe(recipeId);
    }
  },
  
  saveRecipe: async (recipe: Recipe): Promise<Recipe> => {
    if (!browser) return recipe;
    
    // Generate a new ID if not provided
    if (!recipe.id) {
      const recipes = await recipeService.getRecipes(recipe.user_id);
      const maxId = recipes.length > 0 ? Math.max(...recipes.map(r => r.id)) : 0;
      recipe.id = maxId + 1;
    }
    
    // Set created_at if not provided
    if (!recipe.created_at) {
      recipe.created_at = new Date().toISOString();
    }
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.saveRecipe(recipe);
      } catch (error) {
        console.error('Error saving recipe to IndexedDB:', error);
        // Fall back to localStorage
        storageService.recipeService.saveRecipe(recipe);
      }
    } else {
      storageService.recipeService.saveRecipe(recipe);
    }
    
    return recipe;
  },
  
  deleteRecipe: async (recipeId: number): Promise<boolean> => {
    if (!browser) return false;
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.deleteRecipe(recipeId);
        return true;
      } catch (error) {
        console.error('Error deleting recipe from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.recipeService.deleteRecipe(recipeId);
      }
    } else {
      return storageService.recipeService.deleteRecipe(recipeId);
    }
  },
  
  searchRecipes: async (userId: string, query: string): Promise<Recipe[]> => {
    if (!browser) return [];
    
    if (isIndexedDBAvailable) {
      try {
        return await dbService.searchRecipes(userId, query);
      } catch (error) {
        console.error('Error searching recipes in IndexedDB:', error);
        // Fall back to localStorage
        return storageService.recipeService.searchRecipes(userId, query);
      }
    } else {
      return storageService.recipeService.searchRecipes(userId, query);
    }
  }
};

// Chat History Service
export const chatHistoryService = {
  getChatHistory: async (userId: string): Promise<ChatMessage[]> => {
    if (!browser) return [];
    
    if (isIndexedDBAvailable) {
      try {
        return await dbService.getChatHistory(userId);
      } catch (error) {
        console.error('Error getting chat history from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.chatHistoryService.getChatHistory(userId);
      }
    } else {
      return storageService.chatHistoryService.getChatHistory(userId);
    }
  },
  
  saveChatMessage: async (message: string, response: string, userId: string, intent?: string, recipeId?: number): Promise<ChatMessage> => {
    if (!browser) {
      // Return a default message if not in browser
      return {
        id: 1,
        user_id: userId,
        message,
        response,
        timestamp: new Date().toISOString(),
        intent,
        recipe_id: recipeId
      };
    }
    
    // Create new chat message
    const chatHistory = await chatHistoryService.getChatHistory(userId);
    const newMessage: ChatMessage = {
      id: chatHistory.length > 0 ? Math.max(...chatHistory.map(m => m.id || 0)) + 1 : 1,
      user_id: userId,
      message,
      response,
      timestamp: new Date().toISOString(),
      intent,
      recipe_id: recipeId
    };
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.saveChatMessage(newMessage);
      } catch (error) {
        console.error('Error saving chat message to IndexedDB:', error);
        // Fall back to localStorage
        storageService.chatHistoryService.saveChatMessage(message, response, userId, intent, recipeId);
      }
    } else {
      storageService.chatHistoryService.saveChatMessage(message, response, userId, intent, recipeId);
    }
    
    return newMessage;
  },
  
  clearChatHistory: async (userId: string): Promise<boolean> => {
    if (!browser) return true;
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.clearChatHistory(userId);
        return true;
      } catch (error) {
        console.error('Error clearing chat history in IndexedDB:', error);
        // Fall back to localStorage
        return storageService.chatHistoryService.clearChatHistory(userId);
      }
    } else {
      return storageService.chatHistoryService.clearChatHistory(userId);
    }
  }
};

// Inventory Service
export const inventoryService = {
  getInventory: async (userId: string): Promise<InventoryItem[]> => {
    if (!browser) return [];
    
    if (isIndexedDBAvailable) {
      try {
        return await dbService.getInventory(userId);
      } catch (error) {
        console.error('Error getting inventory from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.inventoryService.getInventory(userId);
      }
    } else {
      return storageService.inventoryService.getInventory(userId);
    }
  },
  
  updateInventory: async (items: InventoryItem[], userId: string): Promise<InventoryItem[]> => {
    if (!browser) return items;
    
    if (isIndexedDBAvailable) {
      try {
        return await dbService.updateInventory(items, userId);
      } catch (error) {
        console.error('Error updating inventory in IndexedDB:', error);
        // Fall back to localStorage
        return storageService.inventoryService.updateInventory(items, userId);
      }
    } else {
      return storageService.inventoryService.updateInventory(items, userId);
    }
  },
  
  deleteInventoryItem: async (itemId: number): Promise<boolean> => {
    if (!browser) return false;
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.deleteInventoryItem(itemId);
        return true;
      } catch (error) {
        console.error('Error deleting inventory item from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.inventoryService.deleteInventoryItem(itemId);
      }
    } else {
      return storageService.inventoryService.deleteInventoryItem(itemId);
    }
  },
  
  checkRecipeIngredients: async (recipe: Recipe, userId: string): Promise<{ 
    hasAllIngredients: boolean; 
    missingIngredients: { name: string; amount: string; unit?: string }[];
    availableIngredients: { name: string; amount: string; unit?: string }[];
  }> => {
    if (!browser) {
      return {
        hasAllIngredients: false,
        missingIngredients: recipe.ingredients.map(i => ({ 
          name: i.name, 
          amount: i.amount,
          unit: i.unit
        })),
        availableIngredients: []
      };
    }
    
    // Get current inventory
    const currentInventory = await inventoryService.getInventory(userId);
    
    const missingIngredients: { name: string; amount: string; unit?: string }[] = [];
    const availableIngredients: { name: string; amount: string; unit?: string }[] = [];
    
    // Check each recipe ingredient
    for (const ingredient of recipe.ingredients) {
      // Skip ingredients with generic names like "Ingredient 1"
      if (/^ingredient\s+\d+$/i.test(ingredient.name)) {
        console.warn(`Skipping generic ingredient name: ${ingredient.name}`);
        continue;
      }
      
      // Find matching inventory item (case insensitive)
      const inventoryItem = currentInventory.find(item => 
        item.ingredient_name.toLowerCase() === ingredient.name.toLowerCase()
      );
      
      if (!inventoryItem) {
        // Ingredient not found in inventory
        missingIngredients.push({ 
          name: ingredient.name, 
          amount: ingredient.amount,
          unit: ingredient.unit
        });
      } else {
        // Ingredient found, check quantity if possible
        let inventoryAmount = inventoryItem.amount ? parseFloat(inventoryItem.amount) : 0;
        let recipeAmount = 1; // Default to 1 if we can't parse
        
        // Try to extract numeric value from recipe amount
        const recipeAmountMatch = ingredient.amount.match(/(\d+(\.\d+)?)/);
        if (recipeAmountMatch && recipeAmountMatch[1]) {
          recipeAmount = parseFloat(recipeAmountMatch[1]);
        }
        
        // Check if we have enough
        if (!isNaN(inventoryAmount) && !isNaN(recipeAmount) && inventoryAmount < recipeAmount) {
          missingIngredients.push({ 
            name: ingredient.name, 
            amount: ingredient.amount,
            unit: ingredient.unit
          });
        } else {
          availableIngredients.push({ 
            name: ingredient.name, 
            amount: ingredient.amount,
            unit: ingredient.unit
          });
        }
      }
    }
    
    return {
      hasAllIngredients: missingIngredients.length === 0,
      missingIngredients,
      availableIngredients
    };
  },
  
  subtractRecipeIngredients: async (recipe: Recipe, userId: string): Promise<InventoryItem[]> => {
    if (!browser) return [];
    
    // Get current inventory
    const currentInventory = await inventoryService.getInventory(userId);
    
    // Create a copy of the inventory to work with
    const updatedInventory: InventoryItem[] = JSON.parse(JSON.stringify(currentInventory));
    
    // Track which items were modified
    const modifiedItems: InventoryItem[] = [];
    
    // Process each recipe ingredient
    for (const ingredient of recipe.ingredients) {
      // Find matching inventory item (case insensitive)
      const inventoryIndex = updatedInventory.findIndex(item => 
        item.ingredient_name.toLowerCase() === ingredient.name.toLowerCase()
      );
      
      if (inventoryIndex >= 0) {
        const inventoryItem = updatedInventory[inventoryIndex];
        
        // Parse amounts to numbers if possible
        let inventoryAmount = inventoryItem.amount ? parseFloat(inventoryItem.amount) : 0;
        let recipeAmount = 1; // Default to 1 if we can't parse
        
        // Try to extract numeric value from recipe amount
        const recipeAmountMatch = ingredient.amount.match(/(\d+(\.\d+)?)/);
        if (recipeAmountMatch && recipeAmountMatch[1]) {
          recipeAmount = parseFloat(recipeAmountMatch[1]);
        }
        
        // Only subtract if we have numeric values
        if (!isNaN(inventoryAmount) && !isNaN(recipeAmount)) {
          // Subtract recipe amount from inventory
          inventoryAmount -= recipeAmount;
          
          // Update or remove the item
          if (inventoryAmount <= 0) {
            // Remove item if quantity is zero or negative
            updatedInventory.splice(inventoryIndex, 1);
            
            // Delete from storage
            if (inventoryItem.id) {
              await inventoryService.deleteInventoryItem(inventoryItem.id);
            }
          } else {
            // Update the amount
            updatedInventory[inventoryIndex] = {
              ...inventoryItem,
              amount: inventoryAmount.toString()
            };
            modifiedItems.push(updatedInventory[inventoryIndex]);
          }
        }
      }
    }
    
    // Save the modified items
    if (modifiedItems.length > 0) {
      await inventoryService.updateInventory(modifiedItems, userId);
    }
    
    return updatedInventory;
  }
};

// Grocery List Service
export const groceryListService = {
  getGroceryLists: async (userId: string): Promise<GroceryList[]> => {
    if (!browser) return [];
    
    if (isIndexedDBAvailable) {
      try {
        return await dbService.getGroceryLists(userId);
      } catch (error) {
        console.error('Error getting grocery lists from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.groceryListService.getGroceryLists(userId);
      }
    } else {
      return storageService.groceryListService.getGroceryLists(userId);
    }
  },
  
  getGroceryList: async (listId: number): Promise<GroceryList | null> => {
    if (!browser) return null;
    
    if (isIndexedDBAvailable) {
      try {
        const list = await dbService.getGroceryList(listId);
        return list || null;
      } catch (error) {
        console.error('Error getting grocery list from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.groceryListService.getGroceryList(listId);
      }
    } else {
      return storageService.groceryListService.getGroceryList(listId);
    }
  },
  
  saveGroceryList: async (list: GroceryList): Promise<GroceryList> => {
    if (!browser) return list;
    
    // Generate a new ID if not provided
    if (!list.id) {
      const lists = await groceryListService.getGroceryLists(list.user_id);
      const maxId = lists.length > 0 ? Math.max(...lists.map(l => l.id)) : 0;
      list.id = maxId + 1;
    }
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.saveGroceryList(list);
        
        // Save each item in the list
        if (list.items && list.items.length > 0) {
          for (const item of list.items) {
            const itemWithListId = {
              ...item,
              list_id: list.id
            };
            await dbService.saveGroceryItem(itemWithListId);
          }
        }
      } catch (error) {
        console.error('Error saving grocery list to IndexedDB:', error);
        // Fall back to localStorage
        storageService.groceryListService.saveGroceryList(list);
      }
    } else {
      storageService.groceryListService.saveGroceryList(list);
    }
    
    return list;
  },
  
  deleteGroceryList: async (listId: number): Promise<boolean> => {
    if (!browser) return false;
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.deleteGroceryList(listId);
        return true;
      } catch (error) {
        console.error('Error deleting grocery list from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.groceryListService.deleteGroceryList(listId);
      }
    } else {
      return storageService.groceryListService.deleteGroceryList(listId);
    }
  },
  
  createGroceryListFromMissingIngredients: async (
    recipeName: string,
    missingIngredients: { name: string; amount: string; unit?: string }[],
    userId: string
  ): Promise<GroceryList> => {
    // Create grocery items from missing ingredients
    const items: GroceryItem[] = missingIngredients.map((ingredient, index) => ({
      id: index + 1,
      list_id: 0, // Will be updated after list creation
      user_id: userId,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      category: getCategoryForIngredient(ingredient.name || ''),
      is_checked: false,
      checked: false
    }));
    
    // Create the grocery list
    const newList: GroceryList = {
      id: 0, // Will be assigned in saveGroceryList
      user_id: userId,
      name: `Shopping for ${recipeName}`,
      created_at: new Date().toISOString(),
      items,
      is_completed: false
    };
    
    // Save and return the list with assigned IDs
    const savedList = await groceryListService.saveGroceryList(newList);
    
    // Update list_id for all items
    savedList.items = savedList.items.map(item => ({
      ...item,
      list_id: savedList.id
    }));
    
    // Save again with updated list_ids
    return groceryListService.saveGroceryList(savedList);
  }
};

// Timer Service
export const timerService = {
  getTimers: async (userId: string): Promise<Timer[]> => {
    if (!browser) return [];
    
    if (isIndexedDBAvailable) {
      try {
        return await dbService.getTimers();
      } catch (error) {
        console.error('Error getting timers from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.timerService.getTimers(userId);
      }
    } else {
      return storageService.timerService.getTimers(userId);
    }
  },
  
  saveTimer: async (timer: Timer): Promise<Timer> => {
    if (!browser) return timer;
    
    // Generate a new ID if not provided
    if (!timer.id) {
      const timers = await timerService.getTimers(timer.user_id);
      const maxId = timers.length > 0 ? Math.max(...timers.map(t => t.id)) : 0;
      timer.id = maxId + 1;
    }
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.saveTimer(timer);
      } catch (error) {
        console.error('Error saving timer to IndexedDB:', error);
        // Fall back to localStorage
        storageService.timerService.saveTimer(timer);
      }
    } else {
      storageService.timerService.saveTimer(timer);
    }
    
    return timer;
  },
  
  deleteTimer: async (timerId: number): Promise<boolean> => {
    if (!browser) return false;
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.deleteTimer(timerId);
        return true;
      } catch (error) {
        console.error('Error deleting timer from IndexedDB:', error);
        // Fall back to localStorage
        return storageService.timerService.deleteTimer(timerId);
      }
    } else {
      return storageService.timerService.deleteTimer(timerId);
    }
  },
  
  createTimerFromRecipeStep: async (
    recipeTitle: string,
    step: { instruction: string; duration?: { minutes: number; seconds: number }; timerLabel?: string }
  ): Promise<Timer | null> => {
    if (!step.duration) return null;
    
    const totalSeconds = (step.duration.minutes * 60) + step.duration.seconds;
    if (totalSeconds <= 0) return null;
    
    const label = step.timerLabel || `${recipeTitle}: ${step.instruction.substring(0, 30)}...`;
    
    const timer: Timer = {
      id: 0, // Will be assigned in saveTimer
      user_id: "", // You should pass the user_id as a parameter and use it here
      label,
      duration: totalSeconds,
      remaining: totalSeconds,
      is_running: false,
      is_completed: false,
      created_at: new Date().toISOString()
    };
    
    return timerService.saveTimer(timer);
  }
};

// Notes Service
export const notesService = {
  getNotes: async (userId: string): Promise<Note[]> => {
    if (!browser) return [];
    
    if (isIndexedDBAvailable) {
      try {
        return await dbService.getNotes(userId);
      } catch (error) {
        console.error('Error getting notes from IndexedDB:', error);
        // Fall back to localStorage
        // Note: The localStorage implementation uses a different format
        // We'll need to convert between formats
        const localStorageNotes = JSON.parse(localStorage.getItem('platesai_notes') || '[]');
        return localStorageNotes.map((note: any) => ({
          id: note.id.toString(),
          content: note.text,
          color: note.color,
          position: { x: note.x, y: note.y },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: userId
        }));
      }
    } else {
      // Convert from localStorage format
      const localStorageNotes = JSON.parse(localStorage.getItem('platesai_notes') || '[]');
      return localStorageNotes.map((note: any) => ({
        id: note.id.toString(),
        content: note.text,
        color: note.color,
        position: { x: note.x, y: note.y },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: userId
      }));
    }
  },
  
  saveNote: async (note: Note): Promise<void> => {
    if (!browser) return;
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.saveNote(note);
      } catch (error) {
        console.error('Error saving note to IndexedDB:', error);
        // Fall back to localStorage
        // Convert to localStorage format
        const localStorageNotes = JSON.parse(localStorage.getItem('platesai_notes') || '[]');
        const existingIndex = localStorageNotes.findIndex((n: any) => n.id.toString() === note.id);
        
        const localStorageNote = {
          id: parseInt(note.id),
          title: note.title || `Note ${note.id}`,
          text: note.content,
          x: note.position.x,
          y: note.position.y,
          width: 300,
          height: 300,
          color: note.color,
          minimized: false,
          zIndex: 100
        };
        
        if (existingIndex >= 0) {
          localStorageNotes[existingIndex] = localStorageNote;
        } else {
          localStorageNotes.push(localStorageNote);
        }
        
        localStorage.setItem('platesai_notes', JSON.stringify(localStorageNotes));
      }
    } else {
      // Convert to localStorage format
      const localStorageNotes = JSON.parse(localStorage.getItem('platesai_notes') || '[]');
      const existingIndex = localStorageNotes.findIndex((n: any) => n.id.toString() === note.id);
      
      const localStorageNote = {
        id: parseInt(note.id),
        title: note.title || `Note ${note.id}`,
        text: note.content,
        x: note.position.x,
        y: note.position.y,
        width: 300,
        height: 300,
        color: note.color,
        minimized: false,
        zIndex: 100
      };
      
      if (existingIndex >= 0) {
        localStorageNotes[existingIndex] = localStorageNote;
      } else {
        localStorageNotes.push(localStorageNote);
      }
      
      localStorage.setItem('platesai_notes', JSON.stringify(localStorageNotes));
    }
  },
  
  deleteNote: async (noteId: string): Promise<void> => {
    if (!browser) return;
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.deleteNote(noteId);
      } catch (error) {
        console.error('Error deleting note from IndexedDB:', error);
        // Fall back to localStorage
        const localStorageNotes = JSON.parse(localStorage.getItem('platesai_notes') || '[]');
        const updatedNotes = localStorageNotes.filter((n: any) => n.id.toString() !== noteId);
        localStorage.setItem('platesai_notes', JSON.stringify(updatedNotes));
      }
    } else {
      const localStorageNotes = JSON.parse(localStorage.getItem('platesai_notes') || '[]');
      const updatedNotes = localStorageNotes.filter((n: any) => n.id.toString() !== noteId);
      localStorage.setItem('platesai_notes', JSON.stringify(updatedNotes));
    }
  }
};

// AI Model Config Service
export const aiModelConfigService = {
  getAIModelConfig: async (): Promise<AIModelConfig | null> => {
    if (!browser) return null;
    
    if (isIndexedDBAvailable) {
      try {
        const config = await dbService.getAIModelConfig();
        return config || null;
      } catch (error) {
        console.error('Error getting AI model config from IndexedDB:', error);
        // Fall back to localStorage
        const configJson = localStorage.getItem('aiModelConfig');
        return configJson ? JSON.parse(configJson) : null;
      }
    } else {
      const configJson = localStorage.getItem('aiModelConfig');
      return configJson ? JSON.parse(configJson) : null;
    }
  },
  
  setAIModelConfig: async (config: AIModelConfig): Promise<void> => {
    if (!browser) return;
    
    if (isIndexedDBAvailable) {
      try {
        await dbService.setAIModelConfig(config);
      } catch (error) {
        console.error('Error saving AI model config to IndexedDB:', error);
        // Fall back to localStorage
        localStorage.setItem('aiModelConfig', JSON.stringify(config));
      }
    } else {
      localStorage.setItem('aiModelConfig', JSON.stringify(config));
    }
  }
};

// Helper function to guess ingredient category
function getCategoryForIngredient(name: string): string {
  name = name.toLowerCase();
  
  // Common categories and their keywords
  const categories: { [key: string]: string[] } = {
    'Produce': ['apple', 'banana', 'lettuce', 'tomato', 'onion', 'garlic', 'potato', 'carrot', 'pepper', 'vegetable', 'fruit', 'herb', 'lemon', 'lime', 'orange', 'berry', 'berries', 'greens'],
    'Meat': ['beef', 'chicken', 'pork', 'lamb', 'turkey', 'sausage', 'bacon', 'ham', 'steak', 'ground', 'meat'],
    'Seafood': ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'seafood'],
    'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'ice cream', 'dairy'],
    'Bakery': ['bread', 'roll', 'bun', 'bagel', 'pastry', 'cake', 'cookie', 'pie', 'bakery'],
    'Pantry': ['flour', 'sugar', 'salt', 'pepper', 'spice', 'oil', 'vinegar', 'sauce', 'can', 'pasta', 'rice', 'bean', 'lentil', 'grain', 'cereal', 'condiment'],
    'Frozen': ['frozen', 'ice cream', 'pizza', 'vegetable'],
    'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'drink', 'beverage', 'wine', 'beer', 'alcohol']
  };
  
  // Check each category
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }
  
  // Default category
  return 'Other';
}
