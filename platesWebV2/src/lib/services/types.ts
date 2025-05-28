// Data models for PlatesAI V2

// User model
export interface User {
  id: string; // UUID
  username: string;
  created_at: string; // ISO date string
  preferences?: UserPreferences;
}

// User preferences
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  dietary_restrictions?: string[];
  favorite_cuisines?: string[];
  measurement_system?: 'metric' | 'imperial';
  ai_model?: AIModelConfig;
}

// AI model types
export type AIModelType = 'default' | 'gemini' | 'openai' | 'claude' | 'mock';

// Ingredient check method
export type IngredientCheckMethod = 'ai' | 'direct';

// Model versions for each provider
export type GeminiModelVersion = 
  | 'gemini-pro' 
  | 'gemini-1.5-pro' 
  | 'gemini-1.5-flash' 
  | 'gemini-1.5-flash-preview-04-17'
  | 'gemini-2.5-flash-preview-04-17';

export type OpenAIModelVersion = 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';

export type ClaudeModelVersion = 'claude-3-sonnet' | 'claude-3-opus' | 'claude-3-haiku';

export type MockModelVersion = 'default';

// Combined model version type
export type AIModelVersion = GeminiModelVersion | OpenAIModelVersion | ClaudeModelVersion | MockModelVersion;

// AI model configuration
export interface AIModelConfig {
  type: AIModelType;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  model: AIModelVersion;
  ingredientCheckMethod: IngredientCheckMethod;
}

// Note type for sticky notes
export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  position: {
    x: number;
    y: number;
  };
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Recipe model
export interface Recipe {
  id: number;
  user_id: string;
  title: string;
  description: string;
  servings: string;
  prep_time?: string;
  cook_time?: string;
  total_time?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  calories_per_serving?: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tools: string[];
  methods: string[];
  keywords: string;
  cuisine_type?: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  created_at: string; // ISO date string
  image_url?: string;
  notes?: string;
  rating?: number;
  saved?: boolean; // Flag to indicate if recipe has been saved
  source?: string; // Where the recipe came from
}

// Ingredient model with enhanced properties
export interface Ingredient {
  id?: number;
  recipe_id?: number;
  name: string;
  amount: string;
  unit?: string;
  preparation?: string; // e.g., "chopped", "diced"
  substitute?: string; // Possible substitution
  optional?: boolean;
  category?: string; // e.g., "dairy", "produce", "meat"
  nutrition?: IngredientNutrition;
}

// Nutrition information for ingredients
export interface IngredientNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  serving_size?: string;
}

// Enhanced recipe step with timer
export interface RecipeStep {
  instruction: string;
  order: number;
  duration?: {
    minutes: number;
    seconds: number;
  };
  timerLabel?: string;
  image_url?: string;
  tip?: string;
}

// Chat message model
export interface ChatMessage {
  id?: number;
  user_id: string;
  message: string;
  response: string;
  timestamp: string; // ISO date string
  intent?: string;
  recipe_id?: number; // Reference to a recipe if one was generated
}

// Inventory item model
export interface InventoryItem {
  id?: number;
  user_id: string;
  ingredient_name: string;
  amount?: string;
  unit?: string;
  category?: string;
  expires_at?: string; // ISO date string
  purchase_date?: string; // ISO date string
  location?: string; // e.g., "fridge", "pantry", "freezer"
  notes?: string;
}

// Grocery list model
export interface GroceryList {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
  items: GroceryItem[];
  is_completed?: boolean;
}

// Grocery item model
export interface GroceryItem {
  id?: number;
  list_id?: number;
  user_id?: string;
  name: string;
  amount?: string;
  unit?: string;
  category?: string;
  is_checked?: boolean;
  checked?: boolean; // Alternative to is_checked for UI components
  notes?: string;
  scheduled_date?: string; // Date when the item should be purchased
}

// Meal plan model
export interface MealPlan {
  id: number;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  meals: MealPlanItem[];
}

// Meal plan item
export interface MealPlanItem {
  id: number;
  plan_id: number;
  recipe_id?: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes?: string;
}

// Timer model
export type Timer = {
  id: number;
  user_id: string;
  label: string;
  duration: number;
  remaining: number;
  is_running: boolean;
  is_completed: boolean;
  created_at: string;
};

// AI response schema
export interface AIResponse {
  intent: string;
  ai_response: string;
  recipe?: Recipe;
  grocery_list?: GroceryList;
  inventory_items?: InventoryItem[];
}

// Chat request model
export interface ChatRequest {
  message: string;
  user_id: string;
  modelConfig?: AIModelConfig;
  context?: {
    inventory?: InventoryItem[];
    recent_recipes?: Recipe[];
    preferences?: UserPreferences;
  };
}

// Recipe parser result
export interface RecipeParserResult {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  confidence: number; // 0-1 indicating confidence in the parsing
}
