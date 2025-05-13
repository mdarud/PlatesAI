// Data models for PlatesAI

// User model
export interface User {
  id: string; // UUID
  username: string;
  created_at: string; // ISO date string
}

// Recipe model
export interface Recipe {
  id: number;
  user_id: string;
  title: string;
  description: string;
  servings: string;
  tools: string[];
  methods: string[];
  keywords: string;
  created_at: string; // ISO date string
  ingredients: Ingredient[];
  steps: string[]; // Added to match the AI response schema
  saved?: boolean; // Flag to indicate if recipe has been saved to a sticky note
}

// Ingredient model
export interface Ingredient {
  id?: number;
  recipe_id?: number;
  name: string;
  amount: string;
}

// Chat history model
export interface ChatMessage {
  id?: number;
  user_id: string;
  message: string;
  response: string;
  timestamp: string; // ISO date string
}

// Inventory item model
export interface InventoryItem {
  id?: number;
  user_id: string;
  ingredient_name: string;
  amount?: string;
  expires_at?: string; // ISO date string
}

// Sticky note model (already exists in the app)
export interface Note {
  id: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  minimized: boolean;
  zIndex: number;
}

// AI response schema
export interface AIResponse {
  intent: string;
  ai_response: string;
  recipe?: Recipe;
}

// Chat request model
export interface ChatRequest {
  message: string;
  user_id: string;
}
