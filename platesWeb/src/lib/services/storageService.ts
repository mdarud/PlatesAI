import type { User, Recipe, ChatMessage, InventoryItem } from './types';

// Storage keys
const STORAGE_KEYS = {
  USERS: 'plates_users',
  RECIPES: 'plates_recipes',
  CHAT_HISTORY: 'plates_chat_history',
  INVENTORY: 'plates_inventory',
  STICKY_NOTES: 'stickyNotes' // Keep the existing key for sticky notes
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
      created_at: new Date().toISOString()
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
    
    // Generate a random username like the backend does
    const randomUsername = "User_" + Math.random().toString(36).substring(2, 10);
    return userService.createUser(userId, randomUsername);
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
  
  saveChatMessage: (message: string, response: string, userId: string): ChatMessage => {
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
      timestamp: new Date().toISOString()
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
          expires_at: newItem.expires_at || existingItem.expires_at
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
  
  updateInventoryItem: (item: InventoryItem): InventoryItem | null => {
    const inventoryJson = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!inventoryJson) return null;
    
    try {
      let inventory: InventoryItem[] = JSON.parse(inventoryJson);
      
      // Find and update the item or add it if it doesn't exist
      const existingIndex = inventory.findIndex(i => i.id === item.id);
      
      if (existingIndex >= 0) {
        inventory[existingIndex] = { ...inventory[existingIndex], ...item };
      } else {
        // Generate a new ID if not provided
        if (!item.id) {
          const maxId = inventory.length > 0 ? Math.max(...inventory.map(i => i.id || 0)) : 0;
          item.id = maxId + 1;
        }
        inventory.push(item);
      }
      
      safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
      return existingIndex >= 0 ? inventory[existingIndex] : item;
    } catch (error) {
      console.error('Error updating inventory item', error);
      return null;
    }
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
  
  // Function to parse inventory from HTML content (similar to what's in StickyNote.svelte)
  parseInventoryFromHtml: (html: string, userId: string): InventoryItem[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const items: InventoryItem[] = [];
    
    // Find all list items
    const listItems = doc.querySelectorAll('li');
    
    listItems.forEach((li) => {
      const text = li.textContent || '';
      
      // Extract ingredient name and amount
      const nameMatch = text.match(/^(?:<s>)?<b>(.*?):<\/b>/);
      const amountMatch = text.match(/<\/b> (.*?)(?:<\/s>)?(?:\(Expires|$)/);
      const expiryMatch = text.match(/\(Expires: (.*?)\)/);
      
      if (nameMatch && nameMatch[1]) {
        const item: InventoryItem = {
          user_id: userId,
          ingredient_name: nameMatch[1].trim()
        };
        
        if (amountMatch && amountMatch[1]) {
          item.amount = amountMatch[1].trim();
        }
        
        if (expiryMatch && expiryMatch[1]) {
          item.expires_at = expiryMatch[1].trim();
        }
        
        items.push(item);
      }
    });
    
    return items;
  },
  
  // Function to convert inventory to HTML (similar to what's in StickyNote.svelte)
  inventoryToHtml: (inventory: InventoryItem[]): string => {
    let html = `<ul>`;
    
    inventory.forEach((item) => {
      const isOutOfStock = item.amount ? parseInt(item.amount) === 0 : false;
      html += `<li>${isOutOfStock ? "<s>" : ""}<b>${item.ingredient_name}:</b> ${item.amount || "Unknown amount"}${isOutOfStock ? "</s>" : ""}`;
      
      if (item.expires_at) {
        html += ` (Expires: ${item.expires_at})`;
      }
      
      html += `</li>`;
    });
    
    html += `</ul>`;
    return html;
  },
  
  // Function to subtract recipe ingredients from inventory
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
    safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updatedInventory));
    
    // Return the updated inventory for this user
    return updatedInventory;
  },
  
  // Function to check if all recipe ingredients are available in inventory
  checkRecipeIngredients: (recipe: Recipe, userId: string): { 
    hasAllIngredients: boolean; 
    missingIngredients: { name: string; amount: string }[];
    availableIngredients: { name: string; amount: string }[];
  } => {
    // Get current inventory
    const currentInventory = inventoryService.getInventory(userId);
    
    const missingIngredients: { name: string; amount: string }[] = [];
    const availableIngredients: { name: string; amount: string }[] = [];
    
    // Check each recipe ingredient
    for (const ingredient of recipe.ingredients) {
      // Find matching inventory item (case insensitive)
      const inventoryItem = currentInventory.find(item => 
        item.ingredient_name.toLowerCase() === ingredient.name.toLowerCase()
      );
      
      if (!inventoryItem) {
        // Ingredient not found in inventory
        missingIngredients.push({ name: ingredient.name, amount: ingredient.amount });
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
          missingIngredients.push({ name: ingredient.name, amount: ingredient.amount });
        } else {
          availableIngredients.push({ name: ingredient.name, amount: ingredient.amount });
        }
      }
    }
    
    return {
      hasAllIngredients: missingIngredients.length === 0,
      missingIngredients,
      availableIngredients
    };
  }
};
