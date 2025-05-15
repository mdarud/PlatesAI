import type { 
  AIModelConfig, 
  Note, 
  Recipe, 
  InventoryItem, 
  MealPlan, 
  ChatMessage, 
  GroceryList, 
  GroceryItem, 
  Timer, 
  User, 
  UserPreferences 
} from './types';

const DB_NAME = 'platesAIDB';
const DB_VERSION = 2; // Increased version for schema update

interface DBSchema {
  aiModelConfig: AIModelConfig;
  notes: Note;
  recipes: Recipe;
  inventory: InventoryItem;
  mealPlans: MealPlan;
  chatHistory: ChatMessage;
  groceryLists: GroceryList;
  groceryItems: GroceryItem;
  timers: Timer;
  users: User;
  preferences: UserPreferences;
}

class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Create or update object stores with indexes
        if (!db.objectStoreNames.contains('aiModelConfig')) {
          db.createObjectStore('aiModelConfig');
        }

        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('user_id', 'user_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('recipes')) {
          const recipesStore = db.createObjectStore('recipes', { keyPath: 'id' });
          recipesStore.createIndex('user_id', 'user_id', { unique: false });
          recipesStore.createIndex('title', 'title', { unique: false });
          recipesStore.createIndex('meal_type', 'meal_type', { unique: false });
          recipesStore.createIndex('cuisine_type', 'cuisine_type', { unique: false });
        }

        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' });
          inventoryStore.createIndex('user_id', 'user_id', { unique: false });
          inventoryStore.createIndex('category', 'category', { unique: false });
          inventoryStore.createIndex('expires_at', 'expires_at', { unique: false });
        }

        if (!db.objectStoreNames.contains('mealPlans')) {
          const mealPlansStore = db.createObjectStore('mealPlans', { keyPath: 'id' });
          mealPlansStore.createIndex('user_id', 'user_id', { unique: false });
          mealPlansStore.createIndex('start_date', 'start_date', { unique: false });
        }

        // New stores in version 2
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('chatHistory')) {
            const chatHistoryStore = db.createObjectStore('chatHistory', { keyPath: 'id' });
            chatHistoryStore.createIndex('user_id', 'user_id', { unique: false });
            chatHistoryStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          if (!db.objectStoreNames.contains('groceryLists')) {
            const groceryListsStore = db.createObjectStore('groceryLists', { keyPath: 'id' });
            groceryListsStore.createIndex('user_id', 'user_id', { unique: false });
          }

          if (!db.objectStoreNames.contains('groceryItems')) {
            const groceryItemsStore = db.createObjectStore('groceryItems', { keyPath: 'id' });
            groceryItemsStore.createIndex('list_id', 'list_id', { unique: false });
            groceryItemsStore.createIndex('user_id', 'user_id', { unique: false });
            groceryItemsStore.createIndex('category', 'category', { unique: false });
            groceryItemsStore.createIndex('is_checked', 'is_checked', { unique: false });
          }

          if (!db.objectStoreNames.contains('timers')) {
            const timersStore = db.createObjectStore('timers', { keyPath: 'id' });
            timersStore.createIndex('is_completed', 'is_completed', { unique: false });
          }

          if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'id' });
            usersStore.createIndex('username', 'username', { unique: false });
          }

          if (!db.objectStoreNames.contains('preferences')) {
            db.createObjectStore('preferences');
          }
        }
      };
    });
  }

  private getStore<T extends keyof DBSchema>(storeName: T, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Generic CRUD operations
  async get<T extends keyof DBSchema>(storeName: T, key: IDBValidKey): Promise<DBSchema[T] | undefined> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName).get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll<T extends keyof DBSchema>(storeName: T): Promise<DBSchema[T][]> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName).getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async put<T extends keyof DBSchema>(storeName: T, value: DBSchema[T], key?: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, 'readwrite').put(value, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete<T extends keyof DBSchema>(storeName: T, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, 'readwrite').delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear<T extends keyof DBSchema>(storeName: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getStore(storeName, 'readwrite').clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Specific methods for AI Model Config
  async getAIModelConfig(): Promise<AIModelConfig | undefined> {
    return this.get('aiModelConfig', 'current');
  }

  async setAIModelConfig(config: AIModelConfig): Promise<void> {
    await this.put('aiModelConfig', config, 'current');
    // Also update localStorage for backward compatibility
    localStorage.setItem('aiModelConfig', JSON.stringify(config));
  }

  // User methods
  async getUser(userId: string): Promise<User | undefined> {
    return this.get('users', userId);
  }

  async saveUser(user: User): Promise<void> {
    await this.put('users', user);
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    return this.get('preferences', userId);
  }

  async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    await this.put('preferences', preferences, userId);
  }

  // Recipe methods
  async getRecipes(userId: string): Promise<Recipe[]> {
    return this.queryByIndex('recipes', 'user_id', userId);
  }

  async getRecipe(recipeId: number): Promise<Recipe | undefined> {
    return this.get('recipes', recipeId);
  }

  async saveRecipe(recipe: Recipe): Promise<void> {
    await this.put('recipes', recipe);
  }

  async deleteRecipe(recipeId: number): Promise<void> {
    await this.delete('recipes', recipeId);
  }

  async searchRecipes(userId: string, query: string): Promise<Recipe[]> {
    const recipes = await this.getRecipes(userId);
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

  // Inventory methods
  async getInventory(userId: string): Promise<InventoryItem[]> {
    return this.queryByIndex('inventory', 'user_id', userId);
  }

  async saveInventoryItem(item: InventoryItem): Promise<void> {
    await this.put('inventory', item);
  }

  async deleteInventoryItem(itemId: number): Promise<void> {
    await this.delete('inventory', itemId);
  }

  async updateInventory(items: InventoryItem[], userId: string): Promise<InventoryItem[]> {
    // Get existing items for this user
    const allItems = await this.getInventory(userId);
    const existingUserItems = [...allItems];
    
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
        const itemToDelete = existingUserItems[existingIndex];
        if (itemToDelete.id) {
          await this.delete('inventory', itemToDelete.id);
        }
        existingUserItems.splice(existingIndex, 1);
      }
    }
    
    // Process new items, merging with existing ones if they exist
    let nextId = 1;
    if (allItems.length > 0) {
      const maxId = Math.max(...allItems.map(item => item.id || 0));
      nextId = maxId + 1;
    }
    
    const updatedItems: InventoryItem[] = [];
    
    // Process each valid item
    for (const newItem of validItems) {
      // Check if this item already exists for this user
      const existingItem = existingUserItems.find(item => 
        item.ingredient_name.toLowerCase() === newItem.ingredient_name.toLowerCase()
      );
      
      if (existingItem) {
        // If item exists, update it
        const updatedItem = {
          ...existingItem,
          amount: newItem.amount,
          unit: newItem.unit || existingItem.unit,
          category: newItem.category || existingItem.category,
          expires_at: newItem.expires_at || existingItem.expires_at,
          location: newItem.location || existingItem.location,
          notes: newItem.notes || existingItem.notes
        };
        
        await this.put('inventory', updatedItem);
        updatedItems.push(updatedItem);
        
        // Remove from existing items list to track what's been processed
        existingUserItems.splice(existingUserItems.indexOf(existingItem), 1);
      } else {
        // If it's a new item, add an ID
        const itemWithId = {
          ...newItem,
          id: newItem.id || nextId++,
          user_id: userId
        };
        
        await this.put('inventory', itemWithId);
        updatedItems.push(itemWithId);
      }
    }
    
    // Keep remaining existing items
    for (const item of existingUserItems) {
      updatedItems.push(item);
    }
    
    return updatedItems;
  }

  // Chat history methods
  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    const messages = await this.queryByIndex('chatHistory', 'user_id', userId);
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async saveChatMessage(message: ChatMessage): Promise<void> {
    await this.put('chatHistory', message);
  }

  async clearChatHistory(userId: string): Promise<void> {
    const messages = await this.getChatHistory(userId);
    for (const message of messages) {
      if (message.id) {
        await this.delete('chatHistory', message.id);
      }
    }
  }

  // Grocery list methods
  async getGroceryLists(userId: string): Promise<GroceryList[]> {
    return this.queryByIndex('groceryLists', 'user_id', userId);
  }

  async getGroceryList(listId: number): Promise<GroceryList | undefined> {
    return this.get('groceryLists', listId);
  }

  async saveGroceryList(list: GroceryList): Promise<void> {
    await this.put('groceryLists', list);
  }

  async deleteGroceryList(listId: number): Promise<void> {
    await this.delete('groceryLists', listId);
    
    // Also delete all items in this list
    const items = await this.queryByIndex('groceryItems', 'list_id', listId);
    for (const item of items) {
      if (item.id) {
        await this.delete('groceryItems', item.id);
      }
    }
  }

  async getGroceryItems(userId: string): Promise<GroceryItem[]> {
    return this.queryByIndex('groceryItems', 'user_id', userId);
  }

  async saveGroceryItem(item: GroceryItem): Promise<void> {
    await this.put('groceryItems', item);
  }

  async deleteGroceryItem(itemId: number): Promise<void> {
    await this.delete('groceryItems', itemId);
  }

  // Timer methods
  async getTimers(): Promise<Timer[]> {
    return this.getAll('timers');
  }

  async saveTimer(timer: Timer): Promise<void> {
    await this.put('timers', timer);
  }

  async deleteTimer(timerId: number): Promise<void> {
    await this.delete('timers', timerId);
  }

  // Note methods
  async getNotes(userId: string): Promise<Note[]> {
    return this.queryByIndex('notes', 'user_id', userId);
  }

  async saveNote(note: Note): Promise<void> {
    await this.put('notes', note);
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.delete('notes', noteId);
  }

  // Query methods
  async queryByIndex<T extends keyof DBSchema>(
    storeName: T,
    indexName: string,
    value: IDBValidKey
  ): Promise<DBSchema[T][]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Data migration methods
  async migrateFromLocalStorage(): Promise<void> {
    // Migrate AI Model Config
    try {
      const aiModelConfigJson = localStorage.getItem('aiModelConfig');
      if (aiModelConfigJson) {
        const config = JSON.parse(aiModelConfigJson);
        await this.setAIModelConfig(config);
      }
    } catch (error) {
      console.error('Error migrating AI Model Config:', error);
    }

    // Migrate Notes
    try {
      const notesJson = localStorage.getItem('platesai_notes');
      if (notesJson) {
        const notes = JSON.parse(notesJson);
        for (const note of notes) {
          await this.saveNote({
            id: note.id.toString(),
            content: note.text,
            color: note.color,
            position: { x: note.x, y: note.y },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: 'default-user'
          });
        }
      }
    } catch (error) {
      console.error('Error migrating Notes:', error);
    }

    // Migrate Recipes
    try {
      const recipesJson = localStorage.getItem('platesai_recipes');
      if (recipesJson) {
        const recipes = JSON.parse(recipesJson);
        for (const recipe of recipes) {
          await this.saveRecipe(recipe);
        }
      }
    } catch (error) {
      console.error('Error migrating Recipes:', error);
    }

    // Migrate Inventory
    try {
      const inventoryJson = localStorage.getItem('platesai_inventory');
      if (inventoryJson) {
        const inventory = JSON.parse(inventoryJson);
        for (const item of inventory) {
          await this.saveInventoryItem(item);
        }
      }
    } catch (error) {
      console.error('Error migrating Inventory:', error);
    }

    // Migrate Chat History
    try {
      const chatHistoryJson = localStorage.getItem('platesai_chat_history');
      if (chatHistoryJson) {
        const chatHistory = JSON.parse(chatHistoryJson);
        for (const message of chatHistory) {
          await this.saveChatMessage(message);
        }
      }
    } catch (error) {
      console.error('Error migrating Chat History:', error);
    }

    // Migrate Grocery Lists
    try {
      const groceryListsJson = localStorage.getItem('platesai_grocery_lists');
      if (groceryListsJson) {
        const groceryLists = JSON.parse(groceryListsJson);
        for (const list of groceryLists) {
          await this.saveGroceryList(list);
          
          // Save each item in the list
          if (list.items && list.items.length > 0) {
            for (const item of list.items) {
              await this.saveGroceryItem({
                ...item,
                list_id: list.id
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error migrating Grocery Lists:', error);
    }

    // Migrate Timers
    try {
      const timersJson = localStorage.getItem('platesai_timers');
      if (timersJson) {
        const timers = JSON.parse(timersJson);
        for (const timer of timers) {
          await this.saveTimer(timer);
        }
      }
    } catch (error) {
      console.error('Error migrating Timers:', error);
    }

    // Migrate Users
    try {
      const usersJson = localStorage.getItem('platesai_users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        for (const user of users) {
          await this.saveUser(user);
          
          // Save user preferences
          if (user.preferences) {
            await this.saveUserPreferences(user.id, user.preferences);
          }
        }
      }
    } catch (error) {
      console.error('Error migrating Users:', error);
    }

    console.log('Data migration from localStorage to IndexedDB complete');
  }

  /**
   * Clears all data from the IndexedDB database
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized');
      return;
    }
    
    try {
      console.log('Clearing all data from IndexedDB...');
      
      const storeNames = this.db.objectStoreNames;
      const tx = this.db.transaction(Array.from(storeNames), 'readwrite');
      
      // Clear each object store
      const clearPromises = [];
      for (const storeName of storeNames) {
        const store = tx.objectStore(storeName);
        clearPromises.push(new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => {
            console.log(`Cleared store: ${storeName}`);
            resolve();
          };
          request.onerror = () => {
            reject(request.error);
          };
        }));
      }
      
      await Promise.all(clearPromises);
      
      // Wait for transaction to complete
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
      
      console.log('All IndexedDB data cleared successfully');
    } catch (error) {
      console.error('Error clearing IndexedDB data:', error);
      throw error;
    }
  }
}

export const dbService = new DBService();
