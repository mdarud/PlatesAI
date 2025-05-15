import type {
  User,
  Recipe,
  ChatMessage,
  InventoryItem,
  GroceryList,
  GroceryItem,
  MealPlan,
  Timer,
  UserPreferences
} from './types';
import { browser } from '$app/environment';

// Storage keys
const STORAGE_KEYS = {
  USERS: 'platesai_users',
  RECIPES: 'platesai_recipes',
  CHAT_HISTORY: 'platesai_chat_history',
  INVENTORY: 'platesai_inventory',
  GROCERY_LISTS: 'platesai_grocery_lists',
  MEAL_PLANS: 'platesai_meal_plans',
  TIMERS: 'platesai_timers',
  PREFERENCES: 'platesai_preferences'
};

// Error handling wrapper for localStorage operations
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error retrieving from localStorage: ${key}`, error);
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage: ${key}`, error);
      
      // Check if it's a quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Consider clearing some data.');
      }
      
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage: ${key}`, error);
      return false;
    }
  }
};

// User Service
export const userService = {
  getUser: (userId: string): User | null => {
    const usersJson = safeStorage.getItem(STORAGE_KEYS.USERS);
    if (!usersJson) return null;
    
    try {
      const users: User[] = JSON.parse(usersJson);
      return users.find(user => user.id === userId) || null;
    } catch (error) {
      console.error('Error parsing users data', error);
      return null;
    }
  },
  
  createUser: (userId: string, username: string): User => {
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
    
    const usersJson = safeStorage.getItem(STORAGE_KEYS.USERS);
    let users: User[] = [];
    
    if (usersJson) {
      try {
        users = JSON.parse(usersJson);
      } catch (error) {
        console.error('Error parsing users data', error);
      }
    }
    
    // Add the new user if it doesn't exist
    if (!users.some(user => user.id === userId)) {
      users.push(newUser);
      safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    
    return newUser;
  },
  
  getOrCreateUser: (userId: string): User => {
    const existingUser = userService.getUser(userId);
    if (existingUser) return existingUser;
    
    // Generate a random username
    const randomUsername = "Chef_" + Math.random().toString(36).substring(2, 10);
    return userService.createUser(userId, randomUsername);
  },
  
  updateUserPreferences: (userId: string, preferences: Partial<UserPreferences>): User | null => {
    const user = userService.getUser(userId);
    if (!user) return null;
    
    const updatedUser: User = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences
      }
    };
    
    const usersJson = safeStorage.getItem(STORAGE_KEYS.USERS);
    if (!usersJson) return null;
    
    try {
      const users: User[] = JSON.parse(usersJson);
      const updatedUsers = users.map(u => u.id === userId ? updatedUser : u);
      safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      return updatedUser;
    } catch (error) {
      console.error('Error updating user preferences', error);
      return null;
    }
  }
};

// Recipe Service
export const recipeService = {
  getRecipes: (userId: string): Recipe[] => {
    const recipesJson = safeStorage.getItem(STORAGE_KEYS.RECIPES);
    if (!recipesJson) return [];
    
    try {
      const recipes: Recipe[] = JSON.parse(recipesJson);
      return recipes.filter(recipe => recipe.user_id === userId);
    } catch (error) {
      console.error('Error parsing recipes data', error);
      return [];
    }
  },
  
  getRecipe: (recipeId: number): Recipe | null => {
    const recipesJson = safeStorage.getItem(STORAGE_KEYS.RECIPES);
    if (!recipesJson) return null;
    
    try {
      const recipes: Recipe[] = JSON.parse(recipesJson);
      return recipes.find(recipe => recipe.id === recipeId) || null;
    } catch (error) {
      console.error('Error parsing recipes data', error);
      return null;
    }
  },
  
  saveRecipe: (recipe: Recipe): Recipe => {
    const recipesJson = safeStorage.getItem(STORAGE_KEYS.RECIPES);
    let recipes: Recipe[] = [];
    
    if (recipesJson) {
      try {
        recipes = JSON.parse(recipesJson);
      } catch (error) {
        console.error('Error parsing recipes data', error);
      }
    }
    
    // Generate a new ID if not provided
    if (!recipe.id) {
      const maxId = recipes.length > 0 ? Math.max(...recipes.map(r => r.id)) : 0;
      recipe.id = maxId + 1;
    }
    
    // Set created_at if not provided
    if (!recipe.created_at) {
      recipe.created_at = new Date().toISOString();
    }
    
    // Update existing recipe or add new one
    const existingIndex = recipes.findIndex(r => r.id === recipe.id);
    if (existingIndex >= 0) {
      recipes[existingIndex] = recipe;
    } else {
      recipes.push(recipe);
    }
    
    safeStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
    return recipe;
  },
  
  deleteRecipe: (recipeId: number): boolean => {
    const recipesJson = safeStorage.getItem(STORAGE_KEYS.RECIPES);
    if (!recipesJson) return false;
    
    try {
      let recipes: Recipe[] = JSON.parse(recipesJson);
      recipes = recipes.filter(recipe => recipe.id !== recipeId);
      safeStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
      return true;
    } catch (error) {
      console.error('Error deleting recipe', error);
      return false;
    }
  },
  
  searchRecipes: (userId: string, query: string): Recipe[] => {
    const recipes = recipeService.getRecipes(userId);
    if (!query.trim()) return recipes;
    
    const searchTerms = query.toLowerCase().split(' ');
    
    return recipes.filter(recipe => {
      const searchableText = [
        recipe.title,
        recipe.description,
        recipe.keywords,
        ...recipe.ingredients.map(i => i.name),
        ...recipe.methods,
        recipe.cuisine_type,
        recipe.meal_type
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    });
  }
};

// Chat History Service
export const chatHistoryService = {
  getChatHistory: (userId: string): ChatMessage[] => {
    const historyJson = safeStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (!historyJson) return [];
    
    try {
      const history: ChatMessage[] = JSON.parse(historyJson);
      return history
        .filter(msg => msg.user_id === userId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error parsing chat history data', error);
      return [];
    }
  },
  
  saveChatMessage: (message: string, response: string, userId: string, intent?: string, recipeId?: number): ChatMessage => {
    const historyJson = safeStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    let history: ChatMessage[] = [];
    
    if (historyJson) {
      try {
        history = JSON.parse(historyJson);
      } catch (error) {
        console.error('Error parsing chat history data', error);
      }
    }
    
    // Create new chat message
    const newMessage: ChatMessage = {
      id: history.length > 0 ? Math.max(...history.map(m => m.id || 0)) + 1 : 1,
      user_id: userId,
      message,
      response,
      timestamp: new Date().toISOString(),
      intent,
      recipe_id: recipeId
    };
    
    history.push(newMessage);
    safeStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
    return newMessage;
  },
  
  clearChatHistory: (userId: string): boolean => {
    const historyJson = safeStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (!historyJson) return true;
    
    try {
      const history: ChatMessage[] = JSON.parse(historyJson);
      const filteredHistory = history.filter(msg => msg.user_id !== userId);
      safeStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(filteredHistory));
      return true;
    } catch (error) {
      console.error('Error clearing chat history', error);
      return false;
    }
  }
};

// Inventory Service
export const inventoryService = {
  getInventory: (userId: string): InventoryItem[] => {
    const inventoryJson = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!inventoryJson) return [];
    
    try {
      const inventory: InventoryItem[] = JSON.parse(inventoryJson);
      return inventory.filter(item => item.user_id === userId);
    } catch (error) {
      console.error('Error parsing inventory data', error);
      return [];
    }
  },
  
  updateInventory: (items: InventoryItem[], userId: string): InventoryItem[] => {
    const inventoryJson = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
    let inventory: InventoryItem[] = [];
    
    if (inventoryJson) {
      try {
        inventory = JSON.parse(inventoryJson);
      } catch (error) {
        console.error('Error parsing inventory data', error);
      }
    }
    
    // Get existing items for this user
    const existingUserItems = inventory.filter(item => item.user_id === userId);
    // Get items from other users (we'll keep these unchanged)
    const otherUsersItems = inventory.filter(item => item.user_id !== userId);
    
    // Separate items to remove (with "-1" amount) from valid items
    const itemsToRemove = items.filter(item => item.amount === "-1");
    const validItems = items.filter(item => {
      // Skip items with "-1" amount
      if (item.amount === "-1") return false;
      
      // Skip items with negative numeric amount
      const numAmount = parseInt(item.amount || "0");
      if (!isNaN(numAmount) && numAmount < 0) return false;
      
      return true;
    });
    
    // Remove items marked for deletion
    for (const removeItem of itemsToRemove) {
      // Find the item in existing items
      const existingIndex = existingUserItems.findIndex(item => 
        item.ingredient_name.toLowerCase() === removeItem.ingredient_name.toLowerCase()
      );
      
      // Remove it if found
      if (existingIndex >= 0) {
        existingUserItems.splice(existingIndex, 1);
      }
    }
    
    // Process new items, merging with existing ones if they exist
    let nextId = inventory.length > 0 ? Math.max(...inventory.map(item => item.id || 0)) + 1 : 1;
    const updatedItems: InventoryItem[] = [];
    
    // Process each valid item
    for (const newItem of validItems) {
      // Check if this item already exists for this user
      const existingItem = existingUserItems.find(item => 
        item.ingredient_name.toLowerCase() === newItem.ingredient_name.toLowerCase()
      );
      
      if (existingItem) {
        // If item exists, update it
        updatedItems.push({
          ...existingItem,
          amount: newItem.amount,
          unit: newItem.unit || existingItem.unit,
          category: newItem.category || existingItem.category,
          expires_at: newItem.expires_at || existingItem.expires_at,
          location: newItem.location || existingItem.location,
          notes: newItem.notes || existingItem.notes
        });
        
        // Remove from existing items list to track what's been processed
        existingUserItems.splice(existingUserItems.indexOf(existingItem), 1);
      } else {
        // If it's a new item, add an ID
        updatedItems.push({
          ...newItem,
          id: newItem.id || nextId++,
          user_id: userId
        });
      }
    }
    
    // Add remaining existing items that weren't in the new items list
    // (we keep these since they weren't explicitly removed)
    updatedItems.push(...existingUserItems);
    
    // Combine updated user items with other users' items
    const finalInventory = [...otherUsersItems, ...updatedItems];
    safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(finalInventory));
    
    // Return only this user's updated items
    return updatedItems;
  },
  
  deleteInventoryItem: (itemId: number): boolean => {
    const inventoryJson = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!inventoryJson) return false;
    
    try {
      let inventory: InventoryItem[] = JSON.parse(inventoryJson);
      inventory = inventory.filter(item => item.id !== itemId);
      safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
      return true;
    } catch (error) {
      console.error('Error deleting inventory item', error);
      return false;
    }
  },
  
  // Check if all recipe ingredients are available in inventory
  checkRecipeIngredients: (recipe: Recipe, userId: string): { 
    hasAllIngredients: boolean; 
    missingIngredients: { name: string; amount: string; unit?: string }[];
    availableIngredients: { name: string; amount: string; unit?: string }[];
  } => {
    // Get current inventory
    const currentInventory = inventoryService.getInventory(userId);
    
    const missingIngredients: { name: string; amount: string; unit?: string }[] = [];
    const availableIngredients: { name: string; amount: string; unit?: string }[] = [];
    
    // Check each recipe ingredient
    for (const ingredient of recipe.ingredients) {
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
  
  // Subtract recipe ingredients from inventory
  subtractRecipeIngredients: (recipe: Recipe, userId: string): InventoryItem[] => {
    // Get current inventory
    const currentInventory = inventoryService.getInventory(userId);
    
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
    
    // Save the updated inventory
    const inventoryJson = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (inventoryJson) {
      try {
        const allInventory: InventoryItem[] = JSON.parse(inventoryJson);
        const otherUsersItems = allInventory.filter(item => item.user_id !== userId);
        const finalInventory = [...otherUsersItems, ...updatedInventory];
        safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(finalInventory));
      } catch (error) {
        console.error('Error updating inventory after recipe subtraction', error);
      }
    }
    
    // Return the updated inventory for this user
    return updatedInventory;
  }
};

// Grocery List Service
export const groceryListService = {
  getGroceryLists: (userId: string): GroceryList[] => {
    const listsJson = safeStorage.getItem(STORAGE_KEYS.GROCERY_LISTS);
    if (!listsJson) return [];
    
    try {
      const lists: GroceryList[] = JSON.parse(listsJson);
      return lists.filter(list => list.user_id === userId);
    } catch (error) {
      console.error('Error parsing grocery lists data', error);
      return [];
    }
  },
  
  getGroceryList: (listId: number): GroceryList | null => {
    const listsJson = safeStorage.getItem(STORAGE_KEYS.GROCERY_LISTS);
    if (!listsJson) return null;
    
    try {
      const lists: GroceryList[] = JSON.parse(listsJson);
      return lists.find(list => list.id === listId) || null;
    } catch (error) {
      console.error('Error parsing grocery lists data', error);
      return null;
    }
  },
  
  saveGroceryList: (list: GroceryList): GroceryList => {
    const listsJson = safeStorage.getItem(STORAGE_KEYS.GROCERY_LISTS);
    let lists: GroceryList[] = [];
    
    if (listsJson) {
      try {
        lists = JSON.parse(listsJson);
      } catch (error) {
        console.error('Error parsing grocery lists data', error);
      }
    }
    
    // Generate a new ID if not provided
    if (!list.id) {
      const maxId = lists.length > 0 ? Math.max(...lists.map(l => l.id)) : 0;
      list.id = maxId + 1;
    }
    
    // Update existing list or add new one
    const existingIndex = lists.findIndex(l => l.id === list.id);
    if (existingIndex >= 0) {
      lists[existingIndex] = list;
    } else {
      lists.push(list);
    }
    
    safeStorage.setItem(STORAGE_KEYS.GROCERY_LISTS, JSON.stringify(lists));
    return list;
  },
  
  deleteGroceryList: (listId: number): boolean => {
    const listsJson = safeStorage.getItem(STORAGE_KEYS.GROCERY_LISTS);
    if (!listsJson) return false;
    
    try {
      let lists: GroceryList[] = JSON.parse(listsJson);
      lists = lists.filter(list => list.id !== listId);
      safeStorage.setItem(STORAGE_KEYS.GROCERY_LISTS, JSON.stringify(lists));
      return true;
    } catch (error) {
      console.error('Error deleting grocery list', error);
      return false;
    }
  },
  
  // Create a grocery list from missing ingredients
  createGroceryListFromMissingIngredients: (
    recipeName: string,
    missingIngredients: { name: string; amount: string; unit?: string }[],
    userId: string
  ): GroceryList => {
    // Create grocery items from missing ingredients
    const items: GroceryItem[] = missingIngredients.map((ingredient, index) => ({
      id: index + 1,
      list_id: 0, // Will be updated after list creation
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      category: getCategoryForIngredient(ingredient.name),
      is_checked: false
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
    const savedList = groceryListService.saveGroceryList(newList);
    
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
  getTimers: (userId: string): Timer[] => {
    const timersJson = safeStorage.getItem(STORAGE_KEYS.TIMERS);
    if (!timersJson) return [];
    
    try {
      const timers: Timer[] = JSON.parse(timersJson);
      return timers;
    } catch (error) {
      console.error('Error parsing timers data', error);
      return [];
    }
  },
  
  saveTimer: (timer: Timer): Timer => {
    const timersJson = safeStorage.getItem(STORAGE_KEYS.TIMERS);
    let timers: Timer[] = [];
    
    if (timersJson) {
      try {
        timers = JSON.parse(timersJson);
      } catch (error) {
        console.error('Error parsing timers data', error);
      }
    }
    
    // Generate a new ID if not provided
    if (!timer.id) {
      const maxId = timers.length > 0 ? Math.max(...timers.map(t => t.id)) : 0;
      timer.id = maxId + 1;
    }
    
    // Update existing timer or add new one
    const existingIndex = timers.findIndex(t => t.id === timer.id);
    if (existingIndex >= 0) {
      timers[existingIndex] = timer;
    } else {
      timers.push(timer);
    }
    
    safeStorage.setItem(STORAGE_KEYS.TIMERS, JSON.stringify(timers));
    return timer;
  },
  
  deleteTimer: (timerId: number): boolean => {
    const timersJson = safeStorage.getItem(STORAGE_KEYS.TIMERS);
    if (!timersJson) return false;
    
    try {
      let timers: Timer[] = JSON.parse(timersJson);
      timers = timers.filter(timer => timer.id !== timerId);
      safeStorage.setItem(STORAGE_KEYS.TIMERS, JSON.stringify(timers));
      return true;
    } catch (error) {
      console.error('Error deleting timer', error);
      return false;
    }
  },
  
  // Create a timer from a recipe step
  createTimerFromRecipeStep: (
    recipeTitle: string,
    step: { instruction: string; duration?: { minutes: number; seconds: number }; timerLabel?: string }
  ): Timer | null => {
    if (!step.duration) return null;
    
    const totalSeconds = (step.duration.minutes * 60) + step.duration.seconds;
    if (totalSeconds <= 0) return null;
    
    const label = step.timerLabel || `${recipeTitle}: ${step.instruction.substring(0, 30)}...`;
    
    const timer: Timer = {
      id: 0, // Will be assigned in saveTimer
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

/**
 * Clears all application data from localStorage
 */
export function clearAllData(): void {
  if (!browser) return;
  
  try {
    console.log('Clearing all PlatesAI data from localStorage...');
    
    // Get all keys from localStorage
    const allKeys = Object.keys(localStorage);
    
    // Filter keys that belong to the PlatesAI app (they start with 'platesai_')
    const appKeys = allKeys.filter(key => key.startsWith('platesai_'));
    
    // Remove each key
    appKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed localStorage key: ${key}`);
    });
    
    console.log('All localStorage data cleared successfully');
  } catch (error) {
    console.error('Error clearing localStorage data:', error);
    throw error;
  }
}
