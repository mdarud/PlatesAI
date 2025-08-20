import type { AIResponse, ChatRequest, InventoryItem } from './types';
import { inventoryService } from './storageService';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Gemini API configuration
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash'; // Using Gemini 2.5 Preview model

// Initialize the Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// Mock response for development (since direct API calls may have CORS issues)
const MOCK_ENABLED = false; // Set to false to use the real Gemini API

// System instruction for the AI
const SYSTEM_INSTRUCTION = `1. Classify the user request into one of these intents:
   - \`search_recipe\`
   - \`save_recipe\`
   - \`save_inventory\`
   - \`remove_inventory\`
   - \`search_with_inventory\`
   - \`out_of_topic\`
   - \`unknown\`

2. **Handling Intent Cases:**
   - If the user sending a recipe then make the intent as \`save_recipe\` and process the user created recipe to the recipe object, if there are some properties not mentioned then you can fill it that make sense with the recipe.
   - If intent includes \`search_recipe\` or \`search_with_inventory\`, generate a **complete recipe** inside the \`recipe\` object.
   - If intent includes \`save_inventory\`, **do not generate a full recipe**, extract ingredients and store them inside recipe.ingredients only.
   - If intent includes \`remove_inventory\`, identify the ingredients to remove and store them inside recipe.ingredients with "-1" as the amount.
   - If intent is \`search_with_inventory\`, use the stored inventory to find relevant recipes.
   - If intent is \`out_of_topic\`, **do not generate a recipe**. Just set \`"intent": "out_of_topic"\`.
   - Differentiate if user \`search_with_inventory\`or \`save_inventory', if there's no word that leads to search a recipe just \`save_inventory'.
   - If the user asks to remove or delete something from inventory (e.g., "remove eggs from my inventory"), classify as \`remove_inventory\`.

3. **Recipe Object Requirements (When Searching for a Recipe):**
   - The \`recipe\` object must include **all properties** (\`title\`, \`description\`, \`ingredients\`, \`steps\`, \`servings\`, \`tools\`, \`methods\`, \`keywords\`).
   - Provide an AI-generated **description, keywords, and additional details**.
   - If searching with inventory, prioritize **recipes using stored ingredients**.

4. **Out-of-Topic Handling:**
   - If the request is not culinary-related, **do not generate a recipe**.
   - Instead, respond conversationally and redirect to food topics with the recipe from the media, character, film, series, actor they are asking.
   - If the user keeps going off-topic, just acknowledge the request and provide friendly guidance back to cooking.

5. **Film or series related recipe:**
    - Don't need to say "There's no offical recipe for..." if its recipe from media or film, just make references to it and give the user the recipe`;

// Response schema for the AI
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    intent: { type: "STRING" },
    recipe: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        description: { type: "STRING" },
        ingredients: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              amount: { type: "STRING" }
            }
          }
        },
        steps: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        servings: { type: "STRING" },
        tools: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        methods: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        keywords: { type: "STRING" }
      }
    },
    ai_response: { type: "STRING" }
  }
};

// AI Service
export const aiService = {
  // Generate a mock response based on the request
  generateMockResponse: (request: ChatRequest): AIResponse => {
    console.log('Using mock response for:', request.message);
    
    // Check for recipe-related keywords
    const isRecipeRequest = /recipe|pasta|cook|food|dish|meal|breakfast|lunch|dinner/i.test(request.message);
    
    if (isRecipeRequest) {
      // Return a mock recipe response
      return {
        intent: 'search_recipe',
        ai_response: `Here's a simple pasta recipe you might enjoy!`,
        recipe: {
          id: 1,
          user_id: request.user_id || 'default-user',
          created_at: new Date().toISOString(),
          title: 'Simple Spaghetti Aglio e Olio',
          description: 'A classic Italian pasta dish that\'s simple yet flavorful, featuring garlic-infused olive oil and a hint of chili flakes.',
          ingredients: [
            { name: 'Spaghetti', amount: '1 pound' },
            { name: 'Olive oil', amount: '1/2 cup' },
            { name: 'Garlic', amount: '6 cloves, thinly sliced' },
            { name: 'Red pepper flakes', amount: '1/2 teaspoon' },
            { name: 'Fresh parsley', amount: '1/4 cup, chopped' },
            { name: 'Parmesan cheese', amount: '1/4 cup, grated' },
            { name: 'Salt', amount: 'To taste' },
            { name: 'Black pepper', amount: 'To taste' }
          ],
          steps: [
            'Bring a large pot of salted water to a boil and cook the spaghetti according to package instructions until al dente.',
            'While the pasta is cooking, heat the olive oil in a large skillet over medium heat.',
            'Add the sliced garlic and red pepper flakes to the oil and cook until the garlic is lightly golden, about 2 minutes.',
            'Drain the pasta, reserving 1/4 cup of the pasta water.',
            'Add the pasta and reserved water to the skillet and toss to coat with the garlic oil.',
            'Stir in the chopped parsley and season with salt and black pepper to taste.',
            'Serve immediately with grated Parmesan cheese on top.'
          ],
          servings: '4 servings',
          tools: ['Large pot', 'Skillet', 'Colander', 'Tongs'],
          methods: ['Boiling', 'Sautéing'],
          keywords: 'pasta, Italian, quick, vegetarian, garlic'
        }
      };
    } else if (/inventory|ingredients|grocery|shopping/i.test(request.message)) {
      // Return a mock inventory response
      return {
        intent: 'save_inventory',
        ai_response: 'I\'ve updated your inventory with these items.',
        recipe: {
          id: 2,
          user_id: request.user_id || 'default-user',
          created_at: new Date().toISOString(),
          title: '',
          description: '',
          ingredients: [
            { name: 'Milk', amount: '1 gallon' },
            { name: 'Eggs', amount: '12' },
            { name: 'Bread', amount: '1 loaf' }
          ],
          steps: [],
          servings: '',
          tools: [],
          methods: [],
          keywords: ''
        }
      };
    } else {
      // Generic response for other queries
      return {
        intent: 'out_of_topic',
        ai_response: `I'd be happy to help with cooking-related questions. Would you like me to suggest a recipe or help with meal planning?`
      };
    }
  },
  
  // Validate and complete recipe data
  validateAndCompleteRecipe: (recipe: any): any => {
    if (!recipe) return null;
    
    // Default recipe template for missing sections
    const defaultIngredients = [
      { name: 'Ingredient 1', amount: 'to taste' },
      { name: 'Ingredient 2', amount: 'as needed' }
    ];
    
    const defaultSteps = [
      'Prepare the ingredients',
      'Cook according to your preference',
      'Serve and enjoy!'
    ];
    
    // Create a complete recipe with fallbacks for missing data
    const completeRecipe = {
      id: recipe.id || Date.now(),
      user_id: recipe.user_id || 'default-user',
      created_at: recipe.created_at || new Date().toISOString(),
      title: recipe.title || 'Untitled Recipe',
      description: recipe.description || 'A delicious homemade recipe.',
      ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 
        ? recipe.ingredients 
        : defaultIngredients,
      steps: Array.isArray(recipe.steps) && recipe.steps.length > 0 
        ? recipe.steps 
        : defaultSteps,
      servings: recipe.servings || '2-4 servings',
      tools: Array.isArray(recipe.tools) && recipe.tools.length > 0 
        ? recipe.tools 
        : ['Bowl', 'Spoon', 'Pan'],
      methods: Array.isArray(recipe.methods) && recipe.methods.length > 0 
        ? recipe.methods 
        : ['Mixing', 'Cooking'],
      keywords: recipe.keywords || 'homemade, easy'
    };
    
    return completeRecipe;
  },

  // Generate a response from the AI using Google Generative AI
  generateResponse: async (request: ChatRequest): Promise<AIResponse> => {
    try {
      // Use mock response for development (to avoid CORS issues)
      if (MOCK_ENABLED) {
        return aiService.generateMockResponse(request);
      }
      
      // Configure the generation parameters
      const generationConfig = {
        temperature: 1.0,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      };
      
      // Configure safety settings
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ];
      
      // Create a chat session
      const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [
          {
            role: "user",
            parts: [{ text: "I need help with cooking and recipes." }],
          },
          {
            role: "model",
            parts: [{ text: "I'd be happy to help with cooking and recipes! What would you like to know?" }],
          },
        ],
      });
      
      // Add system instruction
      const systemMessage = {
        role: "user",
        parts: [{ text: `SYSTEM INSTRUCTION: ${SYSTEM_INSTRUCTION}` }],
      };
      
      // Send the system instruction
      await chat.sendMessage(systemMessage.parts);
      
      // Send the user's message
      const result = await chat.sendMessage([
        {
          text: `USER REQUEST: ${request.message}\n\nPlease respond in JSON format according to the following schema:\n${JSON.stringify(RESPONSE_SCHEMA, null, 2)}`
        }
      ]);
      
      // Get the response text
      const responseText = result.response.text();
      
      // Extract the JSON from the response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) || 
                        responseText.match(/\{[\s\S]*\}/);
      
      let aiResponseJson: AIResponse;
      
      if (jsonMatch) {
        // Parse the JSON response
        try {
          aiResponseJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } catch (error) {
          console.error('Error parsing JSON response:', error);
          throw new Error('Failed to parse AI response as JSON');
        }
      } else {
        // If no JSON found, create a default response
        aiResponseJson = {
          intent: 'unknown',
          ai_response: responseText
        };
      }
      
      // Validate and complete recipe if present
      if (aiResponseJson.recipe) {
        aiResponseJson.recipe = aiService.validateAndCompleteRecipe(aiResponseJson.recipe);
      }
      
      return aiResponseJson as AIResponse;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        intent: 'unknown',
        ai_response: 'Sorry, I encountered an error while processing your request. Please try again later.'
      };
    }
  },
  
  // Generate a response with inventory context
  generateResponseWithInventory: async (request: ChatRequest, inventory: InventoryItem[]): Promise<AIResponse> => {
    try {
      // Convert inventory to JSON string
      const inventoryJson = JSON.stringify(inventory.map(item => ({
        id: item.id,
        name: item.ingredient_name,
        amount: item.amount
      })));
      
      // Append inventory to the message
      const messageWithInventory = `${request.message}. My Inventory: ${inventoryJson}`;
      
      // Use the standard generate response with the enhanced message
      return await aiService.generateResponse({
        message: messageWithInventory,
        user_id: request.user_id
      });
    } catch (error) {
      console.error('Error generating AI response with inventory:', error);
      return {
        intent: 'unknown',
        ai_response: 'Sorry, I encountered an error while processing your request with your inventory. Please try again later.'
      };
    }
  },
  
  // Compare inventory and update based on sticky note content
  compareInventory: async (userId: string, stickyNoteHtml: string): Promise<InventoryItem[]> => {
    try {
      // Get current inventory
      const currentInventory = inventoryService.getInventory(userId);
      
      // Parse inventory from sticky note HTML
      const parsedItems = inventoryService.parseInventoryFromHtml(stickyNoteHtml, userId);
      
      // Process each item from the sticky note
      const updatedItems: InventoryItem[] = [];
      
      for (const parsedItem of parsedItems) {
        // Skip items with empty or "0" amount
        if (parsedItem.amount === "0" || parsedItem.amount === "") {
          continue;
        }
        
        // Try to find a matching item in the current inventory
        const existingItem = currentInventory.find(item => 
          item.ingredient_name.toLowerCase() === parsedItem.ingredient_name.toLowerCase()
        );
        
        if (existingItem) {
          // Update existing item
          updatedItems.push({
            ...existingItem,
            amount: parsedItem.amount,
            expires_at: parsedItem.expires_at
          });
        } else {
          // Add new item
          updatedItems.push(parsedItem);
        }
      }
      
      // Items not in the parsed list are considered deleted
      // We don't need to add them with "-1" amount anymore
      
      // Update inventory in storage
      return inventoryService.updateInventory(updatedItems, userId);
    } catch (error) {
      console.error('Error comparing inventory:', error);
      return [];
    }
  },
  
  // Handle question-answer flow
  handleQuestion: async (userAnswer: string, previousQuestion: string, userId: string): Promise<AIResponse> => {
    try {
      const message = `AI question: ${previousQuestion}; User answer: ${userAnswer}`;
      
      return await aiService.generateResponse({
        message,
        user_id: userId
      });
    } catch (error) {
      console.error('Error handling question:', error);
      return {
        intent: 'unknown',
        ai_response: 'Sorry, I encountered an error while processing your answer. Please try again later.'
      };
    }
  }
};
