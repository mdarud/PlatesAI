import type { 
  AIResponse, 
  ChatRequest, 
  InventoryItem, 
  Recipe,
  RecipeParserResult,
  AIModelConfig,
  AIModelType,
  GeminiModelVersion
} from './types';

// Default model configuration
const DEFAULT_MODEL_CONFIG: AIModelConfig = {
  type: 'gemini', // Default to gemini for development
  apiKey: '', // Will be populated from settings if available
  temperature: 0.7,
  maxTokens: 4096,
  model: 'gemini-pro' as GeminiModelVersion,
  ingredientCheckMethod: 'ai' // Default to AI-based ingredient checking
};

// System instruction for the AI
const SYSTEM_INSTRUCTION = `You are PlatesAI, an AI cooking assistant that helps users with recipes, inventory management, and cooking guidance.

1. Classify the user request into one of these intents:
   - \`search_recipe\` - When the user is looking for a recipe
   - \`save_recipe\` - When the user is sharing a recipe to save
   - \`save_inventory\` - When the user wants to update their inventory
   - \`remove_inventory\` - When the user wants to remove items from inventory
   - \`search_with_inventory\` - When the user wants recipes based on their inventory
   - \`create_grocery_list\` - When the user wants to create a shopping list
   - \`cooking_question\` - When the user has a cooking-related question
   - \`unit_conversion\` - When the user wants to convert between measurement units
   - \`out_of_topic\` - When the query is not food-related
   - \`unknown\` - Default fallback intent

1a. **Important Recipe Response Behavior:**
   - When the intent is \`search_recipe\` or \`search_with_inventory\`, immediately provide a complete recipe without asking clarifying questions
   - Make reasonable assumptions about what the user might want based on their query
   - Deliver a high-quality, detailed recipe that matches their request
   - Only ask clarifying questions if the request is extremely vague (e.g., just "give me a recipe" with no context)

1b. **Important Inventory Management Behavior:**
   - When the user asks to add items to inventory (e.g., "add 2 eggs to my inventory"), ALWAYS set the intent to \`save_inventory\`
   - For \`save_inventory\` intent, ALWAYS include an \`inventory_items\` array in your response with the items to add
   - Each inventory item MUST have \`ingredient_name\`, \`amount\`, and optionally \`unit\` properties
   - Example: If user says "add 2 eggs", respond with intent \`save_inventory\` and inventory_items array containing an item with ingredient_name "eggs" and amount "2"
   - When the user asks to remove items from inventory, set the intent to \`remove_inventory\` and include the items to remove in the inventory_items array with amount "-1"

2. **Recipe Object Requirements:**
   - The \`recipe\` object must include all properties (\`title\`, \`description\`, \`ingredients\`, \`steps\`, \`servings\`, etc.)
   - For ingredients, include \`name\`, \`amount\`, \`unit\` (if applicable), and \`preparation\` (if applicable)
   - For steps, include \`instruction\` and \`order\`, plus \`duration\` if there's a timing element
   - Add \`calories_per_serving\` when possible
   - Include \`prep_time\`, \`cook_time\`, and \`total_time\` when available
   - Add \`difficulty\` as "easy", "medium", or "hard"
   - Include \`keywords\` for searchability
   - Always provide complete, well-formatted recipes with detailed instructions
   - Include tools and methods sections for a comprehensive recipe

3. **Inventory Management:**
   - For \`save_inventory\` intent, ALWAYS include an \`inventory_items\` array in your response
   - Each inventory item MUST have these properties:
     * \`ingredient_name\`: The name of the ingredient (e.g., "eggs", "milk", "flour")
     * \`amount\`: The quantity as a string (e.g., "2", "1", "500")
     * \`unit\`: The unit of measurement if applicable (e.g., "cups", "tablespoons", "grams")
     * \`category\`: Optional category (e.g., "Dairy", "Produce", "Meat")
   - For \`remove_inventory\`, identify items to remove and include them in inventory_items with amount "-1"
   - When the intent is \`search_with_inventory\`, prioritize recipes using available ingredients

4. **Unit Conversion:**
   - For \`unit_conversion\`, provide accurate conversions between measurement systems
   - Support volume, weight, and temperature conversions

5. **Recipe Parsing:**
   - When given unstructured recipe text, extract and structure it into the recipe format
   - Identify title, ingredients, steps, and other metadata
   - Assign confidence score based on how complete and accurate the parsing is

6. **Cooking Guidance:**
   - Provide clear, step-by-step instructions
   - Include tips for techniques when relevant
   - Suggest substitutions for ingredients when appropriate

7. **Out-of-Topic Handling:**
   - If the request is not culinary-related, respond conversationally and redirect to food topics
   - If the user persists with off-topic queries, acknowledge but guide back to cooking

8. **Response Format:**
   - Always respond in the specified JSON format
   - Include the appropriate intent
   - Provide a conversational \`ai_response\`
   - Include structured data objects as needed (\`recipe\`, \`inventory_items\`, etc.)`;

// AI Provider Factory
class AIProviderFactory {
  static getProvider(modelConfig: AIModelConfig = DEFAULT_MODEL_CONFIG) {
    switch (modelConfig.type) {
      case 'default':
        // Use Gemini provider with the API key from environment variables
        return new GeminiProvider(modelConfig);
      case 'gemini':
        return new GeminiProvider(modelConfig);
      case 'openai':
        return new OpenAIProvider(modelConfig);
      case 'claude':
        return new ClaudeProvider(modelConfig);
      case 'mock':
      default:
        return new MockProvider(modelConfig);
    }
  }
}

// Base AI Provider class
abstract class AIProvider {
  protected config: AIModelConfig;
  
  constructor(config: AIModelConfig) {
    this.config = config;
  }
  
  abstract generateResponse(request: ChatRequest): Promise<AIResponse>;
}

// Mock Provider implementation
class MockProvider extends AIProvider {
  async generateResponse(request: ChatRequest): Promise<AIResponse> {
    // Check for recipe-related keywords
    const isRecipeRequest = /recipe|pasta|cook|food|dish|meal|breakfast|lunch|dinner/i.test(request.message);
    const isInventoryRequest = /inventory|ingredients|grocery|shopping|add|remove|update/i.test(request.message);
    const isUnitConversion = /convert|cups|tablespoon|teaspoon|grams|ounces|pounds|kilograms/i.test(request.message);
    
    if (isUnitConversion) {
      return {
        intent: 'unit_conversion',
        ai_response: `Here's the conversion you requested. One cup is approximately 236 milliliters, and 1 tablespoon is about 15 milliliters. For more precise conversions, let me know the specific units you're working with.`
      };
    } else if (isRecipeRequest) {
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
          prep_time: '10 minutes',
          cook_time: '15 minutes',
          total_time: '25 minutes',
          difficulty: 'easy',
          calories_per_serving: 380,
          ingredients: [
            { name: 'Spaghetti', amount: '1', unit: 'pound' },
            { name: 'Olive oil', amount: '1/2', unit: 'cup' },
            { name: 'Garlic', amount: '6', unit: 'cloves', preparation: 'thinly sliced' },
            { name: 'Red pepper flakes', amount: '1/2', unit: 'teaspoon' },
            { name: 'Fresh parsley', amount: '1/4', unit: 'cup', preparation: 'chopped' },
            { name: 'Parmesan cheese', amount: '1/4', unit: 'cup', preparation: 'grated' },
            { name: 'Salt', amount: 'To taste' },
            { name: 'Black pepper', amount: 'To taste' }
          ],
          steps: [
            { 
              order: 1, 
              instruction: 'Bring a large pot of salted water to a boil and cook the spaghetti according to package instructions until al dente.',
              duration: { minutes: 10, seconds: 0 }
            },
            { 
              order: 2, 
              instruction: 'While the pasta is cooking, heat the olive oil in a large skillet over medium heat.'
            },
            { 
              order: 3, 
              instruction: 'Add the sliced garlic and red pepper flakes to the oil and cook until the garlic is lightly golden.',
              duration: { minutes: 2, seconds: 0 },
              tip: 'Be careful not to burn the garlic as it will become bitter.'
            },
            { 
              order: 4, 
              instruction: 'Drain the pasta, reserving 1/4 cup of the pasta water.'
            },
            { 
              order: 5, 
              instruction: 'Add the pasta and reserved water to the skillet and toss to coat with the garlic oil.'
            },
            { 
              order: 6, 
              instruction: 'Stir in the chopped parsley and season with salt and black pepper to taste.'
            },
            { 
              order: 7, 
              instruction: 'Serve immediately with grated Parmesan cheese on top.'
            }
          ],
          servings: '4 servings',
          tools: ['Large pot', 'Skillet', 'Colander', 'Tongs'],
          methods: ['Boiling', 'Sautéing'],
          keywords: 'pasta, Italian, quick, vegetarian, garlic',
          cuisine_type: 'Italian',
          meal_type: 'dinner'
        }
      };
    } else if (isInventoryRequest) {
      // Check if it's a remove request
      if (/remove|delete|take out/i.test(request.message)) {
        return {
          intent: 'remove_inventory',
          ai_response: 'I\'ve removed these items from your inventory.',
          inventory_items: [
            { 
              user_id: request.user_id || 'default-user',
              ingredient_name: 'Milk',
              amount: '-1' // Special marker for removal
            }
          ]
        };
      }
      
      // Return a mock inventory response
      return {
        intent: 'save_inventory',
        ai_response: 'I\'ve updated your inventory with these items.',
        inventory_items: [
          { 
            user_id: request.user_id || 'default-user',
            ingredient_name: 'Milk',
            amount: '1',
            unit: 'gallon',
            category: 'Dairy',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
          },
          { 
            user_id: request.user_id || 'default-user',
            ingredient_name: 'Eggs',
            amount: '12',
            category: 'Dairy',
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
          },
          { 
            user_id: request.user_id || 'default-user',
            ingredient_name: 'Bread',
            amount: '1',
            unit: 'loaf',
            category: 'Bakery',
            expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
          }
        ]
      };
    } else {
      // Generic response for other queries
      return {
        intent: 'cooking_question',
        ai_response: `That's a great cooking question! When cooking pasta, it's best to use a large pot with plenty of water and salt. The general rule is 4-6 quarts of water per pound of pasta, and about 1-2 tablespoons of salt. This ensures the pasta has enough room to cook evenly and the salt helps flavor the pasta from the inside out.`
      };
    }
  }
}

// Import the Google Generative AI SDK
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Gemini Provider implementation
class GeminiProvider extends AIProvider {
  constructor(config: AIModelConfig) {
    super(config);
    
      // If the model type is 'default', try to get the API key from environment variables
      if (config.type === 'default') {
        // Get the API key from environment variables
        const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (envApiKey) {
          this.config = {
            ...config,
            apiKey: envApiKey,
            model: 'gemini-2.5-flash' as GeminiModelVersion
          };
        }
      }
  }
  
  // Validate and complete recipe data
  validateAndCompleteRecipe(recipe: any): any {
    if (!recipe) return null;
    
    // Default recipe template for missing sections
    const defaultIngredients = [
      { name: 'Ingredient 1', amount: '1', unit: 'unit' },
      { name: 'Ingredient 2', amount: 'to taste', unit: null }
    ];
    
    const defaultSteps = [
      { order: 1, instruction: 'Prepare the ingredients' },
      { order: 2, instruction: 'Cook according to your preference' },
      { order: 3, instruction: 'Serve and enjoy!' }
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
      prep_time: recipe.prep_time || '15 minutes',
      cook_time: recipe.cook_time || '30 minutes',
      total_time: recipe.total_time || '45 minutes',
      difficulty: recipe.difficulty || 'medium',
      tools: Array.isArray(recipe.tools) && recipe.tools.length > 0 
        ? recipe.tools 
        : ['Bowl', 'Spoon', 'Pan'],
      methods: Array.isArray(recipe.methods) && recipe.methods.length > 0 
        ? recipe.methods 
        : ['Mixing', 'Cooking'],
      keywords: recipe.keywords || 'homemade, easy'
    };
    
    return completeRecipe;
  }
  async generateResponse(request: ChatRequest): Promise<AIResponse> {
    try {
      // Check if API key is provided
      if (!this.config.apiKey) {
        throw new Error('Gemini API key is missing. Please provide an API key in the settings.');
      }
      
      // Initialize the Google Generative AI with the API key
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      
      // Get the model - use a default if the specified one isn't available
      // Default to 'gemini-1.5-flash' if the specified model isn't available
      const modelVersion = this.config.model || 'gemini-1.5-flash';
      const model = genAI.getGenerativeModel({ model: modelVersion });
      
      // Configure generation parameters
      const generationConfig = {
        temperature: this.config.temperature,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: this.config.maxTokens,
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
      
      // Define a response schema to guide the AI
      const RESPONSE_SCHEMA = {
        type: "OBJECT",
        properties: {
          intent: { type: "STRING" },
          ai_response: { type: "STRING" },
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
                    amount: { type: "STRING" },
                    unit: { type: "STRING" },
                    preparation: { type: "STRING" }
                  }
                }
              },
              steps: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    order: { type: "NUMBER" },
                    instruction: { type: "STRING" },
                    duration: {
                      type: "OBJECT",
                      properties: {
                        minutes: { type: "NUMBER" },
                        seconds: { type: "NUMBER" }
                      }
                    }
                  }
                }
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
          }
        }
      };
      
      // Send the user's message with a request for JSON format
      const result = await chat.sendMessage([
        {
          text: `USER REQUEST: ${request.message}\n\nPlease respond in JSON format according to the following schema:\n${JSON.stringify(RESPONSE_SCHEMA, null, 2)}`
        }
      ]);
      
      // Get the response text
      const responseText = result.response.text();
      
      let aiResponseJson: AIResponse;
      
      try {
        // First try to extract JSON from code blocks
        let jsonContent = '';
        const codeBlockMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
        
        if (codeBlockMatch && codeBlockMatch[1]) {
          jsonContent = codeBlockMatch[1];
        } else {
          // Try to find JSON object in the text
          const jsonObjectMatch = responseText.match(/(\{[\s\S]*\})/);
          if (jsonObjectMatch && jsonObjectMatch[1]) {
            jsonContent = jsonObjectMatch[1];
          }
        }
        
        // If we found JSON content, try to parse it
        if (jsonContent) {
          try {
            // Clean up the JSON content
            // Remove any trailing commas in arrays or objects which can cause JSON.parse to fail
            jsonContent = jsonContent.replace(/,(\s*[\]}])/g, '$1');
            
            const parsedJson = JSON.parse(jsonContent);
            
            // Create a properly structured AIResponse
            aiResponseJson = {
              intent: parsedJson.intent || 'cooking_question',
              ai_response: parsedJson.ai_response || ''
            };
            
            // Add recipe if present
            if (parsedJson.recipe) {
              aiResponseJson.recipe = this.validateAndCompleteRecipe(parsedJson.recipe);
            }
            
            // Add inventory items if present
            if (parsedJson.inventory_items) {
              aiResponseJson.inventory_items = parsedJson.inventory_items;
            }
            
            // Add grocery list if present
            if (parsedJson.grocery_list) {
              aiResponseJson.grocery_list = parsedJson.grocery_list;
            }
            
            // Ensure the response doesn't contain raw JSON
            if (aiResponseJson.ai_response) {
              if (aiResponseJson.ai_response.includes('{') && 
                  (aiResponseJson.ai_response.includes('"intent":') || 
                   aiResponseJson.ai_response.includes('"recipe":'))) {
                
                const textMatch = aiResponseJson.ai_response.match(/^(.*?)(?:\{|\[)/);
                if (textMatch && textMatch[1]) {
                  aiResponseJson.ai_response = textMatch[1].trim();
                } else if (aiResponseJson.recipe) {
                  // If we can't extract it but have a recipe, use a generic message
                  aiResponseJson.ai_response = `Here's a ${aiResponseJson.recipe.title} recipe for you!`;
                }
              }
            }
          } catch (parseError) {
            // Fall back to default response
            aiResponseJson = {
              intent: 'cooking_question',
              ai_response: responseText.replace(/```(?:json)?\n[\s\S]*?\n```/, '').trim()
            };
          }
        } else {
          // No JSON found, use the text as is
          aiResponseJson = {
            intent: 'cooking_question',
            ai_response: responseText
          };
        }
      } catch (error) {
        // Create a default response
        aiResponseJson = {
          intent: 'cooking_question',
          ai_response: responseText
        };
      }
      
      return aiResponseJson;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        intent: 'unknown',
        ai_response: `Sorry, I encountered an error while processing your request with Gemini: ${errorMessage}`
      };
    }
  }
}

// OpenAI Provider implementation
class OpenAIProvider extends AIProvider {
  async generateResponse(request: ChatRequest): Promise<AIResponse> {
    try {
      // TODO: Implement real API call to OpenAI API
      // For now, use mock response
      const mockProvider = new MockProvider(this.config);
      return await mockProvider.generateResponse(request);
    } catch (error) {
      return {
        intent: 'unknown',
        ai_response: 'Sorry, I encountered an error while processing your request with OpenAI. Please try again later.'
      };
    }
  }
}

// Claude Provider implementation
class ClaudeProvider extends AIProvider {
  async generateResponse(request: ChatRequest): Promise<AIResponse> {
    try {
      // TODO: Implement real API call to Claude API
      // For now, use mock response
      const mockProvider = new MockProvider(this.config);
      return await mockProvider.generateResponse(request);
    } catch (error) {
      return {
        intent: 'unknown',
        ai_response: 'Sorry, I encountered an error while processing your request with Claude. Please try again later.'
      };
    }
  }
}

// AI Service
export const aiService = {
  // Generate a response from the AI
  generateResponse: async (request: ChatRequest): Promise<AIResponse> => {
    try {
      // Get the appropriate provider based on the model config
      const modelConfig = request.modelConfig || 
                          request.context?.preferences?.ai_model || 
                          DEFAULT_MODEL_CONFIG;
      
      const provider = AIProviderFactory.getProvider(modelConfig);
      return await provider.generateResponse(request);
    } catch (error) {
      return {
        intent: 'unknown',
        ai_response: 'Sorry, I encountered an error while processing your request. Please try again later.'
      };
    }
  },
  
  // Generate a response with inventory context
  generateResponseWithInventory: async (request: ChatRequest, inventory: InventoryItem[]): Promise<AIResponse> => {
    try {
      // Modify the request to include inventory context
      const messageWithInventory = `${request.message}. My Inventory: ${JSON.stringify(inventory.map(item => ({
        name: item.ingredient_name,
        amount: item.amount,
        unit: item.unit
      })))}`;
      
      // Create a new request with the modified message
      const newRequest: ChatRequest = {
        ...request,
        message: messageWithInventory
      };
      
      // Use the standard generateResponse method
      return await aiService.generateResponse(newRequest);
    } catch (error) {
      return {
        intent: 'unknown',
        ai_response: 'Sorry, I encountered an error while processing your request with your inventory. Please try again later.'
      };
    }
  },
  
  // Parse unstructured recipe text into structured format
  parseRecipeText: async (recipeText: string, userId: string = '', modelConfig?: AIModelConfig): Promise<RecipeParserResult> => {
    try {
      // If we have a model config, use AI to parse the recipe
      if (modelConfig && modelConfig.type !== 'mock') {
        return await aiService.parseRecipeWithAI(recipeText, userId, modelConfig);
      }
      
      // Enhanced regex-based parsing as fallback
      // Step 1: Split text into sections
      const lines = recipeText.split('\n').filter(line => line.trim() !== '');
      
      // Step 2: Extract title (using multiple strategies)
      let title = '';
      // Strategy 1: Look for lines with "Recipe" or "Title" keywords
      const titleLine = lines.find(line => /recipe(\s+for)?|title/i.test(line));
      if (titleLine) {
        title = titleLine.replace(/recipe(\s+for)?|recipe:|title:/i, '').trim();
      } 
      // Strategy 2: If no title found, use the first line if it's short enough to be a title
      else if (lines[0] && lines[0].length < 60) {
        title = lines[0].trim();
      }
      // Strategy 3: If still no title, look for a short line at the beginning
      else {
        const potentialTitleLines = lines.slice(0, 3).filter(line => line.length < 60);
        if (potentialTitleLines.length > 0) {
          title = potentialTitleLines[0].trim();
        }
      }
      
      // Step 3: Extract description
      let description = '';
      // Look for lines that might be a description (not ingredients or steps)
      const descriptionLines = lines.slice(
        lines.indexOf(titleLine || lines[0]) + 1, 
        Math.min(lines.length, lines.indexOf(titleLine || lines[0]) + 5)
      ).filter(line => 
        !line.match(/^\s*\d+[\.\)]\s+/) && // Not a numbered step
        !line.match(/ingredient|you need|you'll need/i) && // Not an ingredient header
        !line.match(/\d+\s+(cup|tablespoon|teaspoon|pound|ounce|gram|ml|g|oz|lb|tbsp|tsp)/i) // Not an ingredient line
      );
      
      if (descriptionLines.length > 0) {
        description = descriptionLines.join(' ').trim();
      }
      
      // Step 4: Extract servings
      let servings = '4 servings'; // Default
      const servingsLine = lines.find(line => 
        /serv(ing|es)|yield|make|portion/i.test(line) && 
        /\d+/.test(line)
      );
      
      if (servingsLine) {
        const servingsMatch = servingsLine.match(/(\d+[\-\d]*)\s*(serv(ing|es)|portion)/i);
        if (servingsMatch) {
          servings = `${servingsMatch[1]} servings`;
        }
      }
      
      // Step 5: Extract times
      let prepTime, cookTime, totalTime;
      
      const prepTimeLine = lines.find(line => /prep(aration)?\s+time/i.test(line));
      if (prepTimeLine) {
        const timeMatch = prepTimeLine.match(/(\d+)\s*(minute|hour|min|hr)/i);
        if (timeMatch) {
          prepTime = `${timeMatch[1]} ${timeMatch[2]}${timeMatch[1] !== '1' ? 's' : ''}`;
        }
      }
      
      const cookTimeLine = lines.find(line => /cook(ing)?\s+time/i.test(line));
      if (cookTimeLine) {
        const timeMatch = cookTimeLine.match(/(\d+)\s*(minute|hour|min|hr)/i);
        if (timeMatch) {
          cookTime = `${timeMatch[1]} ${timeMatch[2]}${timeMatch[1] !== '1' ? 's' : ''}`;
        }
      }
      
      const totalTimeLine = lines.find(line => /total\s+time/i.test(line));
      if (totalTimeLine) {
        const timeMatch = totalTimeLine.match(/(\d+)\s*(minute|hour|min|hr)/i);
        if (timeMatch) {
          totalTime = `${timeMatch[1]} ${timeMatch[2]}${timeMatch[1] !== '1' ? 's' : ''}`;
        }
      }
      
      // Step 6: Extract ingredients with improved pattern matching
      // First, find the ingredients section
      const ingredientSectionIndex = lines.findIndex(line => 
        /ingredient|you need|you'll need/i.test(line) && 
        !line.includes('instruction') && 
        !line.includes('direction')
      );
      
      // Find the instructions section to know where ingredients end
      const instructionSectionIndex = lines.findIndex(line => 
        /instruction|direction|method|preparation|steps/i.test(line) && 
        !line.includes('ingredient')
      );
      
      let ingredientLines: string[] = [];
      
      if (ingredientSectionIndex !== -1) {
        // If we found an ingredients section header
        const endIndex = instructionSectionIndex !== -1 ? 
          instructionSectionIndex : 
          lines.length;
        
        ingredientLines = lines.slice(ingredientSectionIndex + 1, endIndex)
          .filter(line => line.trim() !== '');
      } else {
        // Try to identify ingredients by common patterns
        ingredientLines = lines.filter(line => 
          /^\s*[\-\•\*]/.test(line) || // Bullet points
          /^\s*\d+[\d\/\.\s]*\s+(cup|tablespoon|teaspoon|pound|ounce|gram|ml|g|oz|lb|tbsp|tsp)/i.test(line) || // Measurements
          /^\s*\d+[\d\/\.\s]*\s+[a-zA-Z]+\s+of\s+/i.test(line) || // "X of Y" pattern
          /^\s*[a-zA-Z]+\s+to\s+taste/i.test(line) // "X to taste" pattern
        );
      }
      
      // Parse ingredients with more sophisticated pattern matching
      const ingredients = ingredientLines.map(line => {
        // Remove bullet points or leading symbols
        line = line.replace(/^\s*[\-\•\*]\s*/, '').trim();
        
        // Try different patterns for ingredient parsing
        
        // Pattern 1: Amount + Unit + Ingredient (+ Preparation)
        const pattern1 = /^(\d+[\d\/\.\s]*)\s+([a-zA-Z]+)\s+(.+?)(?:\s*,\s*(.+))?$/i;
        const match1 = line.match(pattern1);
        
        if (match1) {
          return {
            name: match1[3].trim(),
            amount: match1[1].trim(),
            unit: match1[2].trim(),
            preparation: match1[4] ? match1[4].trim() : undefined
          };
        }
        
        // Pattern 2: Amount + Ingredient (no unit)
        const pattern2 = /^(\d+[\d\/\.\s]*)\s+(.+?)(?:\s*,\s*(.+))?$/i;
        const match2 = line.match(pattern2);
        
        if (match2) {
          return {
            name: match2[2].trim(),
            amount: match2[1].trim(),
            preparation: match2[3] ? match2[3].trim() : undefined
          };
        }
        
        // Pattern 3: Ingredient to taste
        const pattern3 = /^(.+)\s+to\s+taste$/i;
        const match3 = line.match(pattern3);
        
        if (match3) {
          return {
            name: match3[1].trim(),
            amount: 'to taste'
          };
        }
        
        // Default: Just use the whole line as the ingredient name
        return {
          name: line.trim(),
          amount: 'as needed'
        };
      });
      
      // Step 7: Extract steps with improved pattern matching
      // First, find the instructions section
      let stepLines: string[] = [];
      
      if (instructionSectionIndex !== -1) {
        // If we found an instructions section header
        stepLines = lines.slice(instructionSectionIndex + 1)
          .filter(line => line.trim() !== '');
      } else {
        // Try to identify steps by common patterns
        stepLines = lines.filter(line => 
          /^\s*\d+[\.\)]\s+/.test(line) || // Numbered steps
          /^\s*step\s+\d+/i.test(line) // "Step X" pattern
        );
        
        // If we still don't have steps, look for paragraphs after ingredients
        if (stepLines.length === 0 && ingredientLines.length > 0) {
          const lastIngredientIndex = lines.indexOf(ingredientLines[ingredientLines.length - 1]);
          if (lastIngredientIndex !== -1 && lastIngredientIndex < lines.length - 1) {
            stepLines = lines.slice(lastIngredientIndex + 1)
              .filter(line => line.trim().length > 20); // Longer lines are likely instructions
          }
        }
      }
      
      // Parse steps
      const steps = stepLines.map((line, index) => {
        // Remove leading numbers or "Step X" text
        let instruction = line
          .replace(/^\s*\d+[\.\)]\s+/, '')
          .replace(/^\s*step\s+\d+[\:\.\)]\s*/i, '')
          .trim();
        
        // Look for timing information in the step
        let duration;
        const timeMatch = instruction.match(/(\d+)(?:-(\d+))?\s*(minute|hour|min|hr)/i);
        
        if (timeMatch) {
          const minutes = timeMatch[2] ? 
            Math.floor((parseInt(timeMatch[1]) + parseInt(timeMatch[2])) / 2) : // Use average if range
            parseInt(timeMatch[1]);
          
          const isHours = /hour|hr/i.test(timeMatch[3]);
          
          duration = {
            minutes: isHours ? minutes * 60 : minutes,
            seconds: 0
          };
        }
        
        return {
          order: index + 1,
          instruction,
          duration
        };
      });
      
      // Step 8: Try to extract tools and methods
      const toolsAndMethods = {
        tools: [] as string[],
        methods: [] as string[]
      };
      
      // Common cooking tools
      const commonTools = [
        'pan', 'pot', 'bowl', 'knife', 'cutting board', 'spoon', 'fork', 'whisk', 
        'blender', 'food processor', 'mixer', 'oven', 'stove', 'grill', 'microwave',
        'baking sheet', 'baking dish', 'skillet', 'spatula', 'tongs', 'colander',
        'strainer', 'measuring cup', 'measuring spoon', 'thermometer'
      ];
      
      // Common cooking methods
      const commonMethods = [
        'bake', 'boil', 'broil', 'fry', 'grill', 'poach', 'roast', 'sauté', 'simmer',
        'steam', 'stir-fry', 'toast', 'whip', 'blend', 'chop', 'dice', 'mince', 'slice',
        'mix', 'stir', 'whisk', 'knead', 'marinate', 'braise', 'caramelize'
      ];
      
      // Extract tools and methods from steps
      steps.forEach(step => {
        // Look for tools
        commonTools.forEach(tool => {
          const toolRegex = new RegExp(`\\b${tool}\\b`, 'i');
          if (toolRegex.test(step.instruction) && !toolsAndMethods.tools.includes(tool)) {
            toolsAndMethods.tools.push(tool);
          }
        });
        
        // Look for methods
        commonMethods.forEach(method => {
          const methodRegex = new RegExp(`\\b${method}\\w*\\b`, 'i'); // Match variations (e.g., bake, baking)
          if (methodRegex.test(step.instruction) && !toolsAndMethods.methods.includes(method)) {
            toolsAndMethods.methods.push(method);
          }
        });
      });
      
      // Step 9: Generate keywords
      let keywords = '';
      
      // Add main ingredients to keywords
      if (ingredients.length > 0) {
        const mainIngredients = ingredients
          .slice(0, Math.min(5, ingredients.length))
          .map(ing => ing.name.split(',')[0].trim().toLowerCase())
          .filter(name => name.length > 2); // Filter out short names
        
        if (mainIngredients.length > 0) {
          keywords = mainIngredients.join(', ');
        }
      }
      
      // Add methods to keywords
      if (toolsAndMethods.methods.length > 0) {
        const mainMethods = toolsAndMethods.methods.slice(0, Math.min(3, toolsAndMethods.methods.length));
        if (keywords) {
          keywords += ', ';
        }
        keywords += mainMethods.join(', ');
      }
      
      // Step 10: Determine difficulty
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium'; // Default
      
      if (steps.length <= 5 && ingredients.length <= 7) {
        difficulty = 'easy';
      } else if (steps.length > 10 || ingredients.length > 12) {
        difficulty = 'hard';
      }
      
      // Step 11: Create structured recipe
      const recipe: Recipe = {
        id: 0,
        user_id: userId,
        title: title || 'Untitled Recipe',
        description: description || 'A delicious recipe',
        servings,
        prep_time: prepTime,
        cook_time: cookTime,
        total_time: totalTime,
        difficulty,
        ingredients,
        steps,
        tools: toolsAndMethods.tools,
        methods: toolsAndMethods.methods,
        keywords,
        created_at: new Date().toISOString()
      };
      
      // Step 12: Calculate confidence based on how complete the recipe is
      const hasTitle = !!recipe.title && recipe.title !== 'Untitled Recipe';
      const hasDescription = !!recipe.description && recipe.description !== 'A delicious recipe';
      const hasIngredients = recipe.ingredients.length > 0;
      const hasSteps = recipe.steps.length > 0;
      const hasTools = recipe.tools.length > 0;
      const hasMethods = recipe.methods.length > 0;
      
      const confidence = 
        (hasTitle ? 0.2 : 0) + 
        (hasDescription ? 0.1 : 0) +
        (hasIngredients ? 0.3 : 0) + 
        (hasSteps ? 0.3 : 0) +
        (hasTools ? 0.05 : 0) +
        (hasMethods ? 0.05 : 0);
      
      return {
        success: confidence > 0.5,
        recipe,
        confidence
      };
    } catch (error) {
      return {
        success: false,
        error: 'An error occurred while parsing the recipe.',
        confidence: 0
      };
    }
  },
  
  // Parse recipe using AI
  parseRecipeWithAI: async (recipeText: string, userId: string = '', modelConfig: AIModelConfig): Promise<RecipeParserResult> => {
    try {
      // Create a specialized prompt for recipe parsing
      const message = `Parse this recipe into a structured format:
      
${recipeText}

Please extract the following information:
- Title
- Description
- Servings
- Preparation time
- Cooking time
- Total time
- Difficulty (easy, medium, hard)
- Ingredients (with amounts, units, and preparation instructions)
- Steps (with order and any timing information)
- Tools needed
- Cooking methods used
- Keywords for searchability`;

      // Create a request for the AI
      const request: ChatRequest = {
        message,
        user_id: userId,
        modelConfig
      };
      
      // Get the appropriate provider based on the model config
      const provider = AIProviderFactory.getProvider(modelConfig);
      const response = await provider.generateResponse(request);
      
      // Check if the response contains a recipe
      if (response.recipe) {
        // Add user_id if not present
        if (!response.recipe.user_id && userId) {
          response.recipe.user_id = userId;
        }
        
        // Add created_at if not present
        if (!response.recipe.created_at) {
          response.recipe.created_at = new Date().toISOString();
        }
        
        // Calculate confidence based on completeness
        const hasTitle = !!response.recipe.title && response.recipe.title !== 'Untitled Recipe';
        const hasDescription = !!response.recipe.description;
        const hasIngredients = response.recipe.ingredients.length > 0;
        const hasSteps = response.recipe.steps.length > 0;
        
        const confidence = 
          (hasTitle ? 0.2 : 0) + 
          (hasDescription ? 0.1 : 0) +
          (hasIngredients ? 0.3 : 0) + 
          (hasSteps ? 0.3 : 0) +
          0.1; // Extra confidence for AI parsing
        
        return {
          success: true,
          recipe: response.recipe,
          confidence
        };
      }
      
      // If no recipe in response, fall back to regex parsing
      return aiService.parseRecipeText(recipeText, userId);
    } catch (error) {
      // Fall back to regex parsing
      return aiService.parseRecipeText(recipeText, userId);
    }
  },
  
  // Convert between measurement units
  convertUnits: async (
    value: number, 
    fromUnit: string, 
    toUnit: string
  ): Promise<{ success: boolean; result?: number; error?: string }> => {
    try {
      // Define conversion factors for common cooking units
      const conversionFactors: Record<string, Record<string, number>> = {
        // Volume conversions
        'cup': {
          'tablespoon': 16,
          'teaspoon': 48,
          'fluid ounce': 8,
          'milliliter': 236.588,
          'liter': 0.236588
        },
        'tablespoon': {
          'cup': 0.0625,
          'teaspoon': 3,
          'fluid ounce': 0.5,
          'milliliter': 14.7868,
          'liter': 0.0147868
        },
        'teaspoon': {
          'cup': 0.0208333,
          'tablespoon': 0.333333,
          'fluid ounce': 0.166667,
          'milliliter': 4.92892,
          'liter': 0.00492892
        },
        'fluid ounce': {
          'cup': 0.125,
          'tablespoon': 2,
          'teaspoon': 6,
          'milliliter': 29.5735,
          'liter': 0.0295735
        },
        'milliliter': {
          'cup': 0.00422675,
          'tablespoon': 0.067628,
          'teaspoon': 0.202884,
          'fluid ounce': 0.033814,
          'liter': 0.001
        },
        'liter': {
          'cup': 4.22675,
          'tablespoon': 67.628,
          'teaspoon': 202.884,
          'fluid ounce': 33.814,
          'milliliter': 1000
        },
        
        // Weight conversions
        'pound': {
          'ounce': 16,
          'gram': 453.592,
          'kilogram': 0.453592
        },
        'ounce': {
          'pound': 0.0625,
          'gram': 28.3495,
          'kilogram': 0.0283495
        },
        'gram': {
          'pound': 0.00220462,
          'ounce': 0.035274,
          'kilogram': 0.001
        },
        'kilogram': {
          'pound': 2.20462,
          'ounce': 35.274,
          'gram': 1000
        }
      };
      
      // Normalize units to lowercase
      const from = fromUnit.toLowerCase();
      const to = toUnit.toLowerCase();
      
      // Check if we have conversion factors for these units
      if (!conversionFactors[from] || !conversionFactors[from][to]) {
        return {
          success: false,
          error: `Conversion from ${fromUnit} to ${toUnit} is not supported.`
        };
      }
      
      // Perform the conversion
      const result = value * conversionFactors[from][to];
      
      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: 'An error occurred during unit conversion.'
      };
    }
  }
};
