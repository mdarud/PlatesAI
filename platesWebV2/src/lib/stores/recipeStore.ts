import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { Recipe } from '../services/types';
import { recipeService } from '../services/dataService';
import { browser } from '$app/environment';

// Create a custom store with additional methods
function createRecipeStore() {
  // Initialize with empty array, we'll load recipes when needed
  const { subscribe, set, update }: Writable<Recipe[]> = writable([]);
  
  return {
    subscribe,
    
    // Load recipes for a user
    loadRecipes: async (userId: string) => {
      if (!browser) return; // Only run in browser
      
      try {
        const recipes = await recipeService.getRecipes(userId);
        set(recipes);
        return recipes;
      } catch (error) {
        console.error('Error loading recipes:', error);
        set([]);
        return [];
      }
    },
    
    // Add a new recipe
    addRecipe: async (recipe: Recipe) => {
      try {
        // Save to data service
        const savedRecipe = await recipeService.saveRecipe(recipe);
        
        // Update store
        update(recipes => [...recipes, savedRecipe]);
        
        return savedRecipe;
      } catch (error) {
        console.error('Error adding recipe:', error);
        return recipe; // Return original recipe on error
      }
    },
    
    // Update an existing recipe
    updateRecipe: async (recipe: Recipe) => {
      try {
        // Save to data service
        const updatedRecipe = await recipeService.saveRecipe(recipe);
        
        // Update store
        update(recipes => 
          recipes.map(r => r.id === recipe.id ? updatedRecipe : r)
        );
        
        return updatedRecipe;
      } catch (error) {
        console.error('Error updating recipe:', error);
        return recipe; // Return original recipe on error
      }
    },
    
    // Delete a recipe
    deleteRecipe: async (recipeId: number) => {
      try {
        // Delete from data service
        const success = await recipeService.deleteRecipe(recipeId);
        
        if (success) {
          // Update store
          update(recipes => recipes.filter(r => r.id !== recipeId));
        }
        
        return success;
      } catch (error) {
        console.error('Error deleting recipe:', error);
        return false;
      }
    },
    
    // Search recipes
    searchRecipes: async (userId: string, query: string) => {
      try {
        const searchResults = await recipeService.searchRecipes(userId, query);
        set(searchResults);
        return searchResults;
      } catch (error) {
        console.error('Error searching recipes:', error);
        return [];
      }
    },
    
    // Get a single recipe by ID
    getRecipe: async (recipeId: number): Promise<Recipe | null> => {
      let foundRecipe: Recipe | undefined;
      
      // Use the subscribe method to get the current value
      subscribe(recipes => {
        foundRecipe = recipes.find(r => r.id === recipeId);
      })();
      
      // If found in store, return it
      if (foundRecipe) {
        return foundRecipe;
      }
      
      // If not found in store, try to get from data service
      if (browser) {
        try {
          const recipe = await recipeService.getRecipe(recipeId);
          if (recipe) {
            // Add to store if found
            update(recipes => {
              if (!recipes.some(r => r.id === recipe.id)) {
                return [...recipes, recipe];
              }
              return recipes;
            });
            return recipe;
          }
        } catch (error) {
          console.error('Error getting recipe:', error);
        }
      }
      
      return null;
    }
  };
}

// Export the store
export const recipeStore = createRecipeStore();
