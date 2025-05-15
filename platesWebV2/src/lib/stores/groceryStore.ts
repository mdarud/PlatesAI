import { writable, get } from 'svelte/store';
import type { GroceryItem, GroceryList, InventoryItem, Recipe } from '../services/types';
import { groceryListService } from '../services/dataService';
import { inventoryStore } from './inventoryStore';
import { recipeStore } from './recipeStore';

// Define the store type
interface GroceryStore {
  items: GroceryItem[];
  lists: GroceryList[];
  subscribe: (run: (value: GroceryItem[]) => void) => () => void;
  addItem: (item: GroceryItem, userId: string) => Promise<GroceryItem[]>;
  updateItem: (item: GroceryItem) => GroceryItem[];
  removeItem: (itemId: number) => void;
  toggleItemChecked: (itemId: number | undefined) => void;
  getItemsByCategory: () => { [category: string]: GroceryItem[] };
  getItemsByDate: (date: string) => GroceryItem[];
  getUnscheduledItems: () => GroceryItem[];
  getScheduledDates: () => { [date: string]: number };
  scheduleItemForDate: (itemId: number, date: string) => Promise<GroceryItem[]>;
  createItemForDate: (item: GroceryItem, date: string, userId: string) => Promise<GroceryItem[]>;
  createList: (name: string, userId: string) => GroceryList;
  loadGroceryItems: (userId: string) => Promise<{ [date: string]: number }>;
  generateFromRecipes: (recipeIds: number[], userId: string) => Promise<GroceryItem[]>;
  createGroceryListFromMissingIngredients: (
    recipeName: string,
    missingIngredients: { name: string; amount: string; unit?: string }[],
    userId: string
  ) => Promise<GroceryList>;
}

// Create the store
function createGroceryStore(): GroceryStore {
  const { subscribe, set, update } = writable<GroceryItem[]>([]);
  
  // Storage keys
  const GROCERY_ITEMS_KEY = 'platesai_grocery_items';
  const GROCERY_LISTS_KEY = 'platesai_grocery_lists';
  
  // Internal state
  let lists: GroceryList[] = [];
  
  return {
    items: [],
    lists: [],
    subscribe,
    
    // Add a new grocery item or update an existing one
    addItem: async (item: GroceryItem, userId: string) => {
      let updatedItems: GroceryItem[] = [];
      
      // Create a new grocery list if needed
      if (!item.list_id) {
        try {
          const lists = await groceryListService.getGroceryLists(userId);
          let defaultList: GroceryList;
          
          if (lists.length === 0) {
            // Create a default list
            defaultList = await groceryListService.saveGroceryList({
              id: 0, // Will be assigned by the service
              user_id: userId,
              name: 'Shopping List',
              created_at: new Date().toISOString(),
              items: [],
              is_completed: false
            });
          } else {
            // Use the first list
            defaultList = lists[0];
          }
          
          item.list_id = defaultList.id;
        } catch (error) {
          console.error('Error getting or creating grocery list:', error);
        }
      }
      
      update(items => {
        // If item has an ID, it's an update
        if (item.id) {
          updatedItems = items.map(i => i.id === item.id ? { ...item } : i);
        } else {
          // Generate a new ID that's guaranteed to be unique
          // Use current timestamp plus a large random number
          const timestamp = Date.now();
          const randomPart = Math.floor(Math.random() * 100000);
          const newId = timestamp + randomPart;
          
          const newItem = { 
            ...item, 
            id: newId,
            user_id: userId
          };
          updatedItems = [...items, newItem];
        }
        
        return updatedItems;
      });
      
      // Save to IndexedDB via dataService
      try {
        // Get the list this item belongs to
        const listId = item.list_id !== undefined ? item.list_id : 0;
        // Ensure listId is a number
        const list = await groceryListService.getGroceryList(listId);
        if (list) {
          // Add or update the item in the list
          const listItems = list.items || [];
          const itemIndex = listItems.findIndex(i => i.id === item.id);
          
          if (itemIndex >= 0) {
            listItems[itemIndex] = item;
          } else {
            listItems.push(item);
          }
          
          // Save the updated list
          list.items = listItems;
          await groceryListService.saveGroceryList(list);
        }
      } catch (error) {
        console.error('Error saving grocery item:', error);
        // Fall back to localStorage
        localStorage.setItem(GROCERY_ITEMS_KEY, JSON.stringify(updatedItems));
      }
      
      return updatedItems;
    },
    
    // Update an existing grocery item
    updateItem: (item: GroceryItem) => {
      let updatedItems: GroceryItem[] = [];
      
      update(items => {
        updatedItems = items.map(i => i.id === item.id ? { ...item } : i);
        
        // Save to local storage using browser localStorage
        localStorage.setItem(GROCERY_ITEMS_KEY, JSON.stringify(updatedItems));
        
        return updatedItems;
      });
      
      return updatedItems;
    },
    
    // Remove a grocery item
    removeItem: async (itemId: number) => {
      let removedItem: GroceryItem | undefined;
      
      update(items => {
        // Find the item to be removed (to get its list_id)
        removedItem = items.find(item => item.id === itemId);
        
        // Filter out the item to be removed
        const updatedItems = items.filter(i => i.id !== itemId);
        
        // Save to local storage using browser localStorage
        localStorage.setItem(GROCERY_ITEMS_KEY, JSON.stringify(updatedItems));
        
        return updatedItems;
      });
      
      // Also remove from database via dataService if possible
      if (removedItem?.list_id) {
        try {
          // Get the list this item belongs to
          const list = await groceryListService.getGroceryList(removedItem.list_id);
          
          if (list) {
            // Remove the item from the list's items array
            list.items = (list.items || []).filter(item => item.id !== itemId);
            
            // Save the updated list back to the database
            await groceryListService.saveGroceryList(list);
            console.log(`Item ${itemId} removed from list ${list.id} in database`);
          } else {
            console.warn(`Could not find list ${removedItem.list_id} to remove item ${itemId}`);
          }
        } catch (error) {
          console.error(`Error removing item ${itemId} from database:`, error);
        }
      } else {
        console.warn(`Item ${itemId} has no list_id, only removed from store`);
      }
    },
    
    // Toggle the checked status of an item
    toggleItemChecked: async (itemId: number | undefined) => {
      if (typeof itemId !== 'number') return;
      
      let previouslyChecked = false;
      let toggledItem: GroceryItem | undefined;
      
      try {
        update(items => {
          // Find the item to be toggled
          const itemToToggle = items.find(item => item.id === itemId);
          if (!itemToToggle) return items;
          
          // Save the previous checked state
          previouslyChecked = itemToToggle.checked || false;
          
          // Update all items
          const updatedItems = items.map(item => {
            if (item.id === itemId) {
              const newCheckedState = !item.checked;
              toggledItem = { 
                ...item, 
                checked: newCheckedState,
                is_checked: newCheckedState
              };
              return toggledItem;
            }
            return item;
          });
          
          // Save to local storage using browser localStorage
          localStorage.setItem(GROCERY_ITEMS_KEY, JSON.stringify(updatedItems));

          // Save to IndexedDB via dataService
          if (toggledItem?.list_id) {
            const list = lists.find(l => l.id === toggledItem?.list_id);
            if (list) {
              const updatedList = {
                ...list,
                items: list.items.map(i => 
                  i.id === itemId 
                    ? { ...i, checked: !i.checked, is_checked: !i.checked }
                    : i
                )
              };
              groceryListService.saveGroceryList(updatedList);
            }
          }
          
          return updatedItems;
        });
        
        // If item is now checked (was previously unchecked), add it to inventory
        if (toggledItem && !previouslyChecked && toggledItem.checked) {
          const userId = toggledItem.user_id;
            
          // Only proceed if we have a user ID
          if (userId) {
            // Check if item already exists in inventory
            const existingItems = inventoryStore.getItemsByName(toggledItem.name);
            
            if (existingItems.length > 0) {
              // If units match, add amounts
              const matchingUnitItem = existingItems.find(item => item.unit === toggledItem?.unit);
              if (matchingUnitItem) {
                const newAmount = parseFloat(matchingUnitItem.amount || '0') + parseFloat(toggledItem.amount || '1');
                // Update the matching item with new amount
                inventoryStore.updateInventory([{
                  ...matchingUnitItem,
                  amount: newAmount.toString()
                }], userId);
              } else {
                // If units don't match, add as new item
                const inventoryItem: InventoryItem = {
                  user_id: userId,
                  ingredient_name: toggledItem.name,
                  amount: toggledItem.amount || '1',
                  unit: toggledItem.unit,
                  category: toggledItem.category,
                  notes: toggledItem.notes
                };
                inventoryStore.updateInventory([inventoryItem], userId);
              }
            } else {
              // Add as new item if it doesn't exist
              const inventoryItem: InventoryItem = {
                user_id: userId,
                ingredient_name: toggledItem.name,
                amount: toggledItem.amount || '1',
                unit: toggledItem.unit,
                category: toggledItem.category,
                notes: toggledItem.notes
              };
              inventoryStore.updateInventory([inventoryItem], userId);
            }
          }
        }
        // If item is now unchecked (was previously checked), remove it from inventory
        else if (toggledItem && previouslyChecked && !toggledItem.checked) {
          const userId = toggledItem.user_id;
          
          // Only proceed if we have a user ID
          if (userId) {
            // Find matching items in inventory
            const existingItems = inventoryStore.getItemsByName(toggledItem.name);
            
            if (existingItems.length > 0) {
              // If units match, subtract amount
              const matchingUnitItem = existingItems.find(item => item.unit === toggledItem?.unit);
              
              if (matchingUnitItem) {
                const currentAmount = parseFloat(matchingUnitItem.amount || '0');
                const amountToSubtract = parseFloat(toggledItem.amount || '1');
                
                if (currentAmount <= amountToSubtract) {
                  // If we would reduce to zero or negative, remove the item
                  inventoryStore.updateInventory([{
                    ...matchingUnitItem,
                    amount: "-1" // Special value to mark for deletion
                  }], userId);
                } else {
                  // Otherwise, subtract the amount
                  const newAmount = currentAmount - amountToSubtract;
                  inventoryStore.updateInventory([{
                    ...matchingUnitItem,
                    amount: newAmount.toString()
                  }], userId);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error toggling item checked state:', error);
      }
    },
    
    // Get items grouped by category
    getItemsByCategory: () => {
      let categorizedItems: { [category: string]: GroceryItem[] } = {};
      
      update(items => {
        // Group items by category
        categorizedItems = items.reduce((acc, item) => {
          const category = item.category || 'Uncategorized';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        }, {} as { [category: string]: GroceryItem[] });
        
        return items;
      });
      
      return categorizedItems;
    },
    
    // Get items scheduled for a specific date
    getItemsByDate: (date: string) => {
      let dateItems: GroceryItem[] = [];
      
      update(items => {
        dateItems = items.filter(item => item.scheduled_date === date);
        return items;
      });
      
      return dateItems;
    },
    
    // Get items that aren't scheduled for any date
    getUnscheduledItems: () => {
      let unscheduledItems: GroceryItem[] = [];
      
      update(items => {
        unscheduledItems = items.filter(item => !item.scheduled_date);
        return items;
      });
      
      return unscheduledItems;
    },
    
    // Get all dates that have scheduled items with counts
    getScheduledDates: () => {
      let dates: { [date: string]: number } = {};
      
      // Use a direct store access instead of using update which triggers subscribers
      const items = get(groceryStore);
      
      // Process items directly without triggering update
      items.forEach(item => {
        if (item.scheduled_date) {
          dates[item.scheduled_date] = (dates[item.scheduled_date] || 0) + 1;
        }
      });
      
      return dates;
    },
    
    // Schedule an existing item for a date
    scheduleItemForDate: async (itemId: number, date: string) => {
      let updatedItems: GroceryItem[] = [];
      let item: GroceryItem | undefined;
      
      update(items => {
        // Find the item first
        item = items.find(i => i.id === itemId);
        if (!item) {
          console.error(`Item with ID ${itemId} not found`);
          return items;
        }
        
        // Make a copy of the item with updated date
        const updatedItem = { 
          ...item, 
          scheduled_date: date 
        };
        
        // Update the item in the array
        updatedItems = items.map(i => {
          if (i.id === itemId) {
            return updatedItem;
          }
          return i;
        });
        
        // Save to local storage immediately
        localStorage.setItem(GROCERY_ITEMS_KEY, JSON.stringify(updatedItems));
        
        return updatedItems;
      });
      
      // Save to IndexedDB via dataService if the item belongs to a list
      if (item?.list_id) {
        try {
          const list = await groceryListService.getGroceryList(item.list_id);
          if (list) {
            // Update the item in the list's items array
            list.items = list.items.map(i => 
              i.id === itemId 
                ? { ...i, scheduled_date: date }
                : i
            );
            
            // Save the updated list back to the database
            await groceryListService.saveGroceryList(list);
            console.log(`Item ${itemId} scheduled for date ${date} in database`);
          } else {
            console.warn(`Could not find list ${item.list_id} to update item ${itemId}`);
          }
        } catch (error) {
          console.error(`Error scheduling item ${itemId} for date ${date}:`, error);
        }
      } else {
        console.warn(`Item ${itemId} has no list_id, only scheduled in store`);
      }
      
      // Force a refresh of scheduled dates
      const scheduledDates = groceryStore.getScheduledDates();
      return updatedItems;
    },
    
    // Create a new item and schedule it for a date
    createItemForDate: async (item: GroceryItem, date: string, userId: string) => {
      const newItem = { ...item, scheduled_date: date };
      return await groceryStore.addItem(newItem, userId);
    },
    
    // Create a new grocery list
    createList: (name: string, userId: string) => {
      const newId = Math.max(0, ...lists.map(l => l.id || 0)) + 1;
      const newList: GroceryList = {
        id: newId,
        user_id: userId,
        name,
        created_at: new Date().toISOString(),
        items: [],
        is_completed: false
      };
      
      lists = [...lists, newList];
      
      // Save to local storage using browser localStorage
      localStorage.setItem(GROCERY_LISTS_KEY, JSON.stringify(lists));
      
      return newList;
    },
    
    // Load grocery items for a user
    loadGroceryItems: async (userId: string) => {
      try {
        // Prevent excessive logging
        const isDevelopment = import.meta.env.DEV;
        
        if (isDevelopment) {
          console.log('Loading grocery items for user:', userId);
        }
        
        // Load lists from dataService
        const userLists = await groceryListService.getGroceryLists(userId);
        
        // Only log in development
        if (isDevelopment) {
          console.log('Loaded grocery lists:', userLists);
        }
        
        lists = userLists || [];
        
        // Extract all items from all lists
        const allItems: GroceryItem[] = [];
        for (const list of lists) {
          if (list.items && Array.isArray(list.items) && list.items.length > 0) {
            // Ensure each item has the correct user_id and list_id
            const itemsWithIds = list.items.map(item => ({
              ...item,
              user_id: userId,
              list_id: list.id,
              // Ensure checked property is correctly set
              checked: item.is_checked || item.checked || false
            }));
            allItems.push(...itemsWithIds);
          }
        }
        
        // Only log in development
        if (isDevelopment) {
          console.log('Extracted grocery items:', allItems.length);
        }
        
        // Directly set the items in the store
        set(allItems);
        
        // Calculate and return the scheduled dates without triggering a store update
        const dates: { [date: string]: number } = {};
        allItems.forEach(item => {
          if (item.scheduled_date) {
            dates[item.scheduled_date] = (dates[item.scheduled_date] || 0) + 1;
          }
        });
        
        return dates;
      } catch (error) {
        console.error('Error loading grocery items:', error);
        
        // Fall back to localStorage
        const storedItems = localStorage.getItem(GROCERY_ITEMS_KEY);
        if (storedItems) {
          try {
            const parsedItems = JSON.parse(storedItems) as GroceryItem[];
            const userItems = parsedItems.filter(item => item.user_id === userId);
            console.log('Loaded grocery items from localStorage:', userItems);
            
            // Directly set the items in the store
            set(userItems);
          } catch (error) {
            console.error('Error parsing grocery items:', error);
            set([]);
          }
        } else {
          // If no items found, set empty array
          console.log('No grocery items found in localStorage');
          set([]);
        }
        
        // Load lists from local storage using browser localStorage
        const storedLists = localStorage.getItem(GROCERY_LISTS_KEY);
        if (storedLists) {
          try {
            const parsedLists = JSON.parse(storedLists) as GroceryList[];
            lists = parsedLists.filter(list => list.user_id === userId);
            console.log('Loaded grocery lists from localStorage:', lists);
          } catch (error) {
            console.error('Error parsing grocery lists:', error);
            lists = [];
          }
        } else {
          console.log('No grocery lists found in localStorage');
          lists = [];
        }
        
        // Calculate and return the scheduled dates without triggering a store update
        const dates: { [date: string]: number } = {};
        lists.forEach(list => {
          if (list.items && Array.isArray(list.items) && list.items.length > 0) {
            list.items.forEach(item => {
              if (item.scheduled_date) {
                dates[item.scheduled_date] = (dates[item.scheduled_date] || 0) + 1;
              }
            });
          }
        });
        
        return dates;
      }
    },
    
    // Generate grocery items from recipes
    generateFromRecipes: async (recipeIds: number[], userId: string) => {
      try {
        // Get the selected recipes
        const allRecipes = await recipeStore.loadRecipes(userId) || [];
        const selectedRecipes = allRecipes.filter((recipe: Recipe) => recipeIds.includes(recipe.id));
        
        if (selectedRecipes.length === 0) {
          console.error('No recipes found with the provided IDs');
          return [];
        }
        
        console.log('Selected recipes for grocery generation:', selectedRecipes);
        
        // Extract ingredients from the selected recipes
        const ingredientMap = new Map<string, GroceryItem>();
        
        // Process each recipe
        for (const recipe of selectedRecipes) {
          // Ensure recipe has ingredients
          if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
            console.warn(`Recipe ${recipe.id} (${recipe.title}) has no ingredients`);
            continue;
          }
          
          // Process each ingredient in the recipe
          for (const ingredient of recipe.ingredients) {
            // Skip invalid ingredients
            if (!ingredient || !ingredient.name) {
              continue;
            }
            
            const key = `${ingredient.name.toLowerCase()}-${ingredient.unit || ''}`;
            
            if (ingredientMap.has(key)) {
              // Ingredient already exists, try to combine quantities
              const existingItem = ingredientMap.get(key)!;
              
              // Try to parse amounts as numbers
              const existingAmount = parseFloat(existingItem.amount || '0');
              let ingredientAmount = 1;
              
              // Try to extract numeric value from ingredient amount
              if (ingredient.amount) {
                const amountMatch = ingredient.amount.match(/(\d+(\.\d+)?)/);
                if (amountMatch && amountMatch[1]) {
                  ingredientAmount = parseFloat(amountMatch[1]);
                }
              }
              
              // Only combine if both are valid numbers
              if (!isNaN(existingAmount) && !isNaN(ingredientAmount)) {
                existingItem.amount = (existingAmount + ingredientAmount).toString();
              } else {
                // If we can't combine numerically, append the amounts
                existingItem.amount = `${existingItem.amount || ''}, ${ingredient.amount || '1'}`.trim();
                if (existingItem.amount.startsWith(',')) {
                  existingItem.amount = existingItem.amount.substring(1).trim();
                }
              }
              
              // Update notes to include recipe reference
              existingItem.notes = existingItem.notes 
                ? `${existingItem.notes}, ${recipe.title}`
                : `For ${recipe.title}`;
            } else {
              // Create a new grocery item with a guaranteed unique ID
              // Use a combination of timestamp and a random number to ensure uniqueness
              const uniqueId = Date.now() + Math.floor(Math.random() * 100000);
              
              const groceryItem: GroceryItem = {
                id: uniqueId,
                user_id: userId,
                name: ingredient.name,
                amount: ingredient.amount || '1',
                unit: ingredient.unit || '',
                category: ingredient.category || getCategoryForIngredient(ingredient.name),
                checked: false,
                is_checked: false,
                notes: `For ${recipe.title}`
              };
              
              ingredientMap.set(key, groceryItem);
            }
          }
        }
        
        // Convert map to array
        const groceryItems = Array.from(ingredientMap.values());

        // Create a new grocery list with a meaningful name
        const listName = selectedRecipes.length === 1 
          ? `Ingredients for ${selectedRecipes[0].title}`
          : `Ingredients for ${selectedRecipes.length} recipes`;
        
        // Create the list with items already included
        const newList = await groceryListService.saveGroceryList({
          id: 0, // Will be assigned by the service
          user_id: userId,
          name: listName,
          created_at: new Date().toISOString(),
          items: groceryItems, // Include items directly in the list
          is_completed: false
        });
        
        // Update list_id for all items
        for (const item of groceryItems) {
          item.list_id = newList.id;
        }
        
        // Create a store reference for get() to use
        const store = { subscribe };
        
        // Get current items from the store
        const currentItems = get(store);
        
        // Update the store with the new items
        set([...currentItems, ...groceryItems]);
        
        console.log('Added grocery items to store:', groceryItems);
        
        return groceryItems;
      } catch (error) {
        console.error('Error generating grocery items from recipes:', error);
        return [];
      }
    },
    
    // Create a grocery list from missing ingredients
    createGroceryListFromMissingIngredients: async (
      recipeName: string,
      missingIngredients: { name: string; amount: string; unit?: string }[],
      userId: string
    ) => {
      try {
        // Use the dataService to create the grocery list
        const groceryList = await groceryListService.createGroceryListFromMissingIngredients(
          recipeName,
          missingIngredients,
          userId
        );
        
        // Update the store with the new items
        if (groceryList.items && groceryList.items.length > 0) {
          update(items => [...items, ...groceryList.items]);
        }
        
        return groceryList;
      } catch (error) {
        console.error('Error creating grocery list from missing ingredients:', error);
        
        // Fallback implementation if the dataService fails
        const newList: GroceryList = {
          id: Math.max(0, ...lists.map(l => l.id || 0)) + 1,
          user_id: userId,
          name: `Shopping for ${recipeName}`,
          created_at: new Date().toISOString(),
          items: [],
          is_completed: false
        };
        
        const groceryItems = missingIngredients.map((ingredient, index) => {
          // Generate a unique ID using timestamp and random values
          const timestamp = Date.now();
          const randomPart = Math.floor(Math.random() * 100000) + index;
          const uniqueId = timestamp + randomPart;
          
          const item: GroceryItem = {
            id: uniqueId,
            list_id: newList.id,
            user_id: userId,
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            category: 'Other',
            checked: false,
            is_checked: false,
            notes: `For ${recipeName}`
          };
          return item;
        });
        
        newList.items = groceryItems;
        lists = [...lists, newList];
        
        // Save to localStorage as fallback
        localStorage.setItem(GROCERY_LISTS_KEY, JSON.stringify(lists));
        
        // Update the store with the new items
        update(items => [...items, ...groceryItems]);
        
        return newList;
      }
    }
  };
}

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

// Export the store instance
export const groceryStore = createGroceryStore();
