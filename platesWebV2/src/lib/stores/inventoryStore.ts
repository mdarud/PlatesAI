import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { InventoryItem, Recipe } from '../services/types';
import { inventoryService } from '../services/dataService';
import { browser } from '$app/environment';

// Create a custom store with additional methods
function createInventoryStore() {
  // Initialize with empty array, we'll load inventory when needed
  const { subscribe, set, update }: Writable<InventoryItem[]> = writable([]);
  
  return {
    subscribe,
    
    // Load inventory for a user
    loadInventory: async (userId: string) => {
      if (!browser) return; // Only run in browser
      
      try {
        const inventory = await inventoryService.getInventory(userId);
        set(inventory);
        return inventory;
      } catch (error) {
        console.error('Error loading inventory:', error);
        set([]);
        return [];
      }
    },
    
    // Add or update inventory items
    updateInventory: async (items: InventoryItem[], userId: string) => {
      try {
        // Save to data service
        const updatedItems = await inventoryService.updateInventory(items, userId);
        
        // Update store
        set(updatedItems);
        
        return updatedItems;
      } catch (error) {
        console.error('Error updating inventory:', error);
        return items; // Return original items on error
      }
    },
    
    // Add a single inventory item
    addItem: async (item: InventoryItem, userId: string) => {
      try {
        // Call the updateInventory function directly with the store instance
        return await inventoryService.updateInventory([item], userId);
      } catch (error) {
        console.error('Error adding inventory item:', error);
        return [item]; // Return original item on error
      }
    },
    
    // Remove an inventory item
    removeItem: async (itemId: number) => {
      try {
        // Delete from data service
        const success = await inventoryService.deleteInventoryItem(itemId);
        
        if (success) {
          // Update store
          update(items => items.filter(item => item.id !== itemId));
        }
        
        return success;
      } catch (error) {
        console.error('Error removing inventory item:', error);
        return false;
      }
    },
    
    // Check if all recipe ingredients are available in inventory
    checkRecipeIngredients: async (recipe: Recipe, userId: string) => {
      try {
        return await inventoryService.checkRecipeIngredients(recipe, userId);
      } catch (error) {
        console.error('Error checking recipe ingredients:', error);
        // Return default result on error
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
    },
    
    // Subtract recipe ingredients from inventory after cooking
    subtractRecipeIngredients: async (recipe: Recipe, userId: string) => {
      try {
        const updatedInventory = await inventoryService.subtractRecipeIngredients(recipe, userId);
        
        // Update store
        set(updatedInventory);
        
        return updatedInventory;
      } catch (error) {
        console.error('Error subtracting recipe ingredients:', error);
        // Return current inventory on error
        let currentInventory: InventoryItem[] = [];
        subscribe(items => {
          currentInventory = items;
        })();
        return currentInventory;
      }
    },
    
    // Get items by category
    getItemsByCategory: () => {
      let categorizedItems: { [category: string]: InventoryItem[] } = {};
      
      // Use the subscribe method to get the current value
      subscribe(items => {
        // Group items by category
        categorizedItems = items.reduce((acc, item) => {
          const category = item.category || 'Uncategorized';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        }, {} as { [category: string]: InventoryItem[] });
      })();
      
      return categorizedItems;
    },
    
    // Get expiring items (items that expire within the next 7 days)
    getExpiringItems: () => {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      let expiringItems: InventoryItem[] = [];
      
      // Use the subscribe method to get the current value
      subscribe(items => {
        expiringItems = items.filter(item => {
          if (!item.expires_at) return false;
          
          const expiryDate = new Date(item.expires_at);
          return expiryDate > now && expiryDate <= sevenDaysLater;
        });
      })();
      
      return expiringItems;
    },
    
    // Get expired items (items that have already expired)
    getExpiredItems: () => {
      const now = new Date();
      
      let expiredItems: InventoryItem[] = [];
      
      // Use the subscribe method to get the current value
      subscribe(items => {
        expiredItems = items.filter(item => {
          if (!item.expires_at) return false;
          
          const expiryDate = new Date(item.expires_at);
          return expiryDate <= now;
        });
      })();
      
      return expiredItems;
    },
    
    // Get items by name
    getItemsByName: (name: string) => {
      let matchingItems: InventoryItem[] = [];
      
      // Use the subscribe method to get the current value
      subscribe(items => {
        matchingItems = items.filter(item => 
          item.ingredient_name.toLowerCase() === name.toLowerCase()
        );
      })();
      
      return matchingItems;
    }
  };
}

// Export the store
export const inventoryStore = createInventoryStore();
