<script lang="ts">
  import { onMount } from 'svelte';
  import { notesStore } from '../stores/notesStore';
  import { aiModelStore } from '../stores/aiModelStore';
  import { recipeStore } from '../stores/recipeStore';
  import { inventoryStore } from '../stores/inventoryStore';
  import { groceryStore } from '../stores/groceryStore';
  import { aiService } from '../services/aiService';
  import { createIcon } from '../utils/icons';
  import type { AIModelConfig, AIResponse, ChatRequest, Recipe, InventoryItem, GroceryList, GroceryItem } from '../services/types';
  
  // Props
  export let user_id: string = 'default-user';
  
  // State for chat interface
  let messages: { text: string; sender: 'user' | 'ai'; timestamp: Date; recipe?: Recipe }[] = [];
  let newMessage = '';
  let chatContainer: HTMLElement;
  let isLoading = false;
  let modelConfig: AIModelConfig;

  // Add these types at the top of the script
  interface ConfirmationState {
    isWaiting: boolean;
    options: string[];
    context: string;
  }

  // Recipe form state
  interface RecipeFormState {
    isVisible: boolean;
    originalQuery: string;
    flavors: {[key: string]: boolean};
    cookingMethods: {[key: string]: boolean};
    dishTypes: {[key: string]: boolean};
    difficulty: string;
  }
  
  // Track queries that have already been asked for specifications
  const askedQueries = new Set<string>();

  // Ingredient check modal state
  interface IngredientCheckState {
    isVisible: boolean;
    recipe: Recipe | null;
    hasAllIngredients: boolean;
    missingIngredients: { name: string; amount: string; unit?: string }[];
    availableIngredients: { name: string; amount: string; unit?: string }[];
  }

  // Add these to the component state
  let confirmationState: ConfirmationState = {
    isWaiting: false,
    options: [],
    context: ''
  };

  // Initialize recipe form state
  let recipeFormState: RecipeFormState = {
    isVisible: false,
    originalQuery: '',
    flavors: {
      'sweet': false,
      'sour': false,
      'spicy': false,
      'savory': false,
      'bitter': false,
      'umami': false
    },
    cookingMethods: {
      'fried': false,
      'boiled': false,
      'baked': false,
      'grilled': false,
      'steamed': false,
      'roasted': false,
      'stir-fried': false
    },
    dishTypes: {
      'main course': false,
      'appetizer': false,
      'side dish': false,
      'dessert': false,
      'breakfast': false,
      'soup': false,
      'salad': false,
      'snack': false
    },
    difficulty: 'medium'
  };

  let ingredientCheckState: IngredientCheckState = {
    isVisible: false,
    recipe: null,
    hasAllIngredients: false,
    missingIngredients: [],
    availableIngredients: []
  };

  // Function to clear chat history
  function clearChat() {
    messages = [
      { 
        text: "👋 Hi there! I'm your AI cooking assistant. Ask me about recipes, inventory management, or anything food-related!", 
        sender: 'ai',
        timestamp: new Date()
      }
    ];
    localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
  }
  
  // Subscribe to the AI model store
  const unsubscribe = aiModelStore.subscribe(value => {
    modelConfig = value;
  });
  
  // Clean up subscription on component destruction
  onMount(() => {
    // Try to load chat history from localStorage
    const savedMessages = localStorage.getItem('platesai_chat_history');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        messages = parsedMessages.map((msg: { text: string; sender: 'user' | 'ai'; timestamp: string; recipe?: Recipe }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (error) {
        console.error('Error loading chat history:', error);
        // If there's an error, use the default welcome message
        messages = [
          { 
            text: "👋 Hi there! I'm your AI cooking assistant. Ask me about recipes, inventory management, or anything food-related!", 
            sender: 'ai',
            timestamp: new Date()
          }
        ];
      }
    } else {
      // If no saved messages, use the default welcome message
      messages = [
        { 
          text: "👋 Hi there! I'm your AI cooking assistant. Ask me about recipes, inventory management, or anything food-related!", 
          sender: 'ai',
          timestamp: new Date()
        }
      ];
    }
    
    return () => {
      unsubscribe();
    };
  });
  
  // Sample quick actions
  const quickActions = [
    { text: "What can I cook with chicken?", action: () => sendQuickMessage("What can I cook with chicken?") },
    { text: "Show me vegetarian recipes", action: () => sendQuickMessage("Show me vegetarian recipes") },
    { text: "Update my inventory", action: () => sendQuickMessage("Update my inventory") },
    { text: "Create a grocery list", action: () => sendQuickMessage("Create a grocery list") }
  ];
  
  // Function to extract inventory items from natural language
  function extractInventoryItems(text: string): InventoryItem[] {
    const items: InventoryItem[] = [];
    
    // Number word mapping
    const numberWords: Record<string, string> = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
    };
    
    // Patterns for inventory statements
    const inventoryPatterns = [
      // "I have 2 apples"
      /I have (\d+|one|two|three|four|five|six|seven|eight|nine|ten) ([a-zA-Z\s]+)/i,
      // "Save three eggs to my inventory"
      /Save (\d+|one|two|three|four|five|six|seven|eight|nine|ten) ([a-zA-Z\s]+) to (?:my|the) inventory/i,
      // "Add 3 chicken thighs to my inventory"
      /Add (\d+|one|two|three|four|five|six|seven|eight|nine|ten) ([a-zA-Z\s]+) to (?:my|the) inventory/i
    ];
    
    // Check each pattern
    for (const pattern of inventoryPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = match[1].toLowerCase();
        // Convert word numbers to digits
        if (numberWords[amount]) {
          amount = numberWords[amount];
        }
        
        const name = match[2].trim();
        
        // Create inventory item
        items.push({
          user_id,
          ingredient_name: name,
          amount,
          category: getCategoryForIngredient(name)
        });
      }
    }
    
    return items;
  }
  
  // Function to extract grocery items from natural language
  function extractGroceryItems(text: string): GroceryItem[] {
    const items: GroceryItem[] = [];
    
    // Number word mapping
    const numberWords: Record<string, string> = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
    };
    
    // Date mapping for relative dates
    function getDateFromRelative(relativeDate: string): string | undefined {
      const today = new Date();
      
      if (relativeDate.toLowerCase() === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      } else if (relativeDate.toLowerCase() === 'next week') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString().split('T')[0];
      } else if (relativeDate.toLowerCase().includes('day')) {
        // Handle "on Monday", "on Tuesday", etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = dayNames.findIndex(day => relativeDate.toLowerCase().includes(day));
        
        if (targetDay !== -1) {
          const date = new Date(today);
          const currentDay = date.getDay();
          let daysToAdd = targetDay - currentDay;
          
          // If the day has already passed this week, go to next week
          if (daysToAdd <= 0) {
            daysToAdd += 7;
          }
          
          date.setDate(date.getDate() + daysToAdd);
          return date.toISOString().split('T')[0];
        }
      }
      
      return undefined;
    }
    
  // Patterns for grocery statements
  const groceryPatterns = [
    // "Remind me to buy honey tomorrow"
    /Remind me to buy ([a-zA-Z\s]+) (tomorrow|next week|on \w+)/i,
    // "Put 3 chicken thighs to my grocery list"
    /Put (\d+|one|two|three|four|five|six|seven|eight|nine|ten) ([a-zA-Z\s]+) (?:on|to|in) (?:my|the) grocery list/i,
    // "Add 2 chocolate to my grocery list" - Pattern for quantity + item
    /Add (\d+|one|two|three|four|five|six|seven|eight|nine|ten) ([a-zA-Z\s]+) to (?:my|the) grocery(?:\s+list)?/i,
    // "Add honey to my grocery list" - Pattern for item without explicit quantity
    /Add ([a-zA-Z\s]+) to (?:my|the) grocery(?:\s+list)?/i
  ];
    
    // Check each pattern
    for (const pattern of groceryPatterns) {
      const match = text.match(pattern);
      if (match) {
        let name, amount = '1';
        let scheduledDate: string | undefined;
        
        // Handle different pattern matches
        if (pattern.toString().includes('Remind me')) {
          name = match[1].trim();
          
          // Handle date
          const dateText = match[2].toLowerCase();
          scheduledDate = getDateFromRelative(dateText);
        } else if (pattern.toString().includes('Put')) {
          amount = match[1].toLowerCase();
          // Convert word numbers to digits
          if (numberWords[amount]) {
            amount = numberWords[amount];
          }
          name = match[2].trim();
        } else if (pattern.toString().includes('Add') && pattern.toString().includes('\\d+|one|two|three|four|five|six|seven|eight|nine|ten')) {
          // This is the "Add 2 chocolate to my grocery" pattern
          amount = match[1].toLowerCase();
          // Convert word numbers to digits
          if (numberWords[amount]) {
            amount = numberWords[amount];
          }
          name = match[2].trim();
        } else {
          // This is the "Add honey to my grocery list" pattern
          name = match[1].trim();
        }
        
        // Create grocery item
        items.push({
          user_id,
          name,
          amount,
          category: getCategoryForIngredient(name),
          scheduled_date: scheduledDate,
          is_checked: false,
          checked: false
        });
      }
    }
    
    return items;
  }
  
  // Enhanced function to handle generic recipe requests with form
  async function handleGenericRecipeRequest(userMessage: string): Promise<boolean> {
    // Check if we've already asked for specifications for this query
    if (askedQueries.has(userMessage.toLowerCase())) {
      return false;
    }
    
    const genericTerms = ['recipe', 'dish', 'meal', 'cook', 'make'];
    const isGenericRequest = genericTerms.some(term => userMessage.toLowerCase().includes(term));
    
    if (isGenericRequest && !userMessage.includes('specific')) {
      // Extract keywords from the user message
      const commonWords = ['a', 'the', 'recipe', 'dish', 'meal', 'cook', 'make', 'me', 'for', 'with', 'and', 'or', 'some', 'please', 'can', 'you', 'i', 'want', 'would', 'like'];
      const keywords = userMessage.toLowerCase()
        .split(' ')
        .filter(word => !commonWords.includes(word));
      
      // Only skip the form if there are more than 3 keywords or if it contains specific phrases
      const keywordCount = keywords.length;
      
      if (keywordCount > 3) {
        // If there are more than 3 keywords or specific phrases, process the query directly
        return false;
      }
      
      // Add user message to chat
      messages = [...messages, { 
        text: userMessage, 
        sender: 'user',
        timestamp: new Date()
      }];
      
      // Save chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      // Clear input and scroll to bottom
      newMessage = '';
      scrollToBottom();
      
      // Add this query to the set of asked queries
      askedQueries.add(userMessage.toLowerCase());
      
      // Reset recipe form state
      recipeFormState = {
        isVisible: true,
        originalQuery: userMessage,
        flavors: {
          'sweet': false,
          'sour': false,
          'spicy': false,
          'savory': false,
          'bitter': false,
          'umami': false
        },
        cookingMethods: {
          'fried': false,
          'boiled': false,
          'baked': false,
          'grilled': false,
          'steamed': false,
          'roasted': false,
          'stir-fried': false
        },
        dishTypes: {
          'main course': false,
          'appetizer': false,
          'side dish': false,
          'dessert': false,
          'breakfast': false,
          'soup': false,
          'salad': false,
          'snack': false
        },
        difficulty: 'medium'
      };
      
      // Add a response message
      messages = [...messages, { 
        text: "I'd be happy to help you find a recipe! Please specify your preferences:", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      // Scroll to bottom
      scrollToBottom();
      
      return true;
    }
    
    return false;
  }
  
  // Function to submit recipe form
  async function submitRecipeForm() {
    // Collect selected flavors
    const selectedFlavors = Object.entries(recipeFormState.flavors)
      .filter(([_, selected]) => selected)
      .map(([flavor, _]) => flavor);
    
    // Collect selected cooking methods
    const selectedMethods = Object.entries(recipeFormState.cookingMethods)
      .filter(([_, selected]) => selected)
      .map(([method, _]) => method);
    
    // Collect selected dish types
    const selectedDishTypes = Object.entries(recipeFormState.dishTypes)
      .filter(([_, selected]) => selected)
      .map(([dishType, _]) => dishType);
    
    // Build enhanced query
    let enhancedQuery = recipeFormState.originalQuery;
    
    if (selectedFlavors.length > 0) {
      enhancedQuery += ` with ${selectedFlavors.join(' and ')} flavors`;
    }
    
    if (selectedMethods.length > 0) {
      enhancedQuery += ` that is ${selectedMethods.join(' and ')}`;
    }
    
    if (selectedDishTypes.length > 0) {
      enhancedQuery += ` as a ${selectedDishTypes.join(' or ')}`;
    }
    
    enhancedQuery += ` with ${recipeFormState.difficulty} difficulty`;
    
    // Hide the form
    recipeFormState.isVisible = false;
    
    // Add user message to chat
    messages = [...messages, { 
      text: enhancedQuery, 
      sender: 'user',
      timestamp: new Date()
    }];
    
    // Save chat history to localStorage
    localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
    
    // Clear input and scroll to bottom
    newMessage = '';
    scrollToBottom();
    
    // Show loading state
    isLoading = true;
    
    try {
      // Create chat request with model config
      const request: ChatRequest = {
        message: enhancedQuery,
        user_id: user_id,
        modelConfig: modelConfig
      };
      
      // Get AI response directly, bypassing handleGenericRecipeRequest
      const response = await aiService.generateResponse(request);
      
      // Process the response similar to sendMessage but without triggering handleGenericRecipeRequest
      let displayText = response.ai_response;
      
      // If the response contains a recipe, clean up the display text to remove any JSON
      if (response.recipe) {
        // Check if the response contains JSON
        if (displayText.includes('{') && displayText.includes('"recipe":')) {
          // Try to extract just the conversational part before the JSON
          const textMatch = displayText.match(/^(.*?)(?:\{|\[)/);
          if (textMatch && textMatch[1]) {
            displayText = textMatch[1].trim();
          } else {
            // If we can't extract it, use a generic message
            displayText = `Here's a ${response.recipe.title} recipe for you!`;
          }
        }
        
        // Add the initial response
        messages = [...messages, { 
          text: displayText, 
          sender: 'ai',
          timestamp: new Date()
        }];
        
        // Add a separate message with the recipe
        messages = [...messages, { 
          text: '', 
          sender: 'ai',
          timestamp: new Date(),
          recipe: response.recipe
        }];
      } else {
        // Add just the text response if no recipe
        messages = [...messages, { 
          text: displayText, 
          sender: 'ai',
          timestamp: new Date()
        }];
      }
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      // Process the response based on its content
      processAIResponse(response);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message
      messages = [...messages, { 
        text: "Sorry, I encountered an error while processing your request. Please try again later.", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
    } finally {
      // Hide loading state and scroll to bottom
      isLoading = false;
      scrollToBottom();
    }
  }
  
  // Function to continue with original query
  async function continueWithOriginalQuery() {
    // Hide the form
    recipeFormState.isVisible = false;
    
    // Add user message to chat
    messages = [...messages, { 
      text: recipeFormState.originalQuery, 
      sender: 'user',
      timestamp: new Date()
    }];
    
    // Save chat history to localStorage
    localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
    
    // Clear input and scroll to bottom
    newMessage = '';
    scrollToBottom();
    
    // Show loading state
    isLoading = true;
    
    try {
      // Create chat request with model config
      const request: ChatRequest = {
        message: recipeFormState.originalQuery,
        user_id: user_id,
        modelConfig: modelConfig
      };
      
      // Get AI response directly, bypassing handleGenericRecipeRequest
      const response = await aiService.generateResponse(request);
      
      // Process the response similar to sendMessage but without triggering handleGenericRecipeRequest
      let displayText = response.ai_response;
      
      // If the response contains a recipe, clean up the display text to remove any JSON
      if (response.recipe) {
        // Check if the response contains JSON
        if (displayText.includes('{') && displayText.includes('"recipe":')) {
          // Try to extract just the conversational part before the JSON
          const textMatch = displayText.match(/^(.*?)(?:\{|\[)/);
          if (textMatch && textMatch[1]) {
            displayText = textMatch[1].trim();
          } else {
            // If we can't extract it, use a generic message
            displayText = `Here's a ${response.recipe.title} recipe for you!`;
          }
        }
        
        // Add the initial response
        messages = [...messages, { 
          text: displayText, 
          sender: 'ai',
          timestamp: new Date()
        }];
        
        // Add a separate message with the recipe
        messages = [...messages, { 
          text: '', 
          sender: 'ai',
          timestamp: new Date(),
          recipe: response.recipe
        }];
      } else {
        // Add just the text response if no recipe
        messages = [...messages, { 
          text: displayText, 
          sender: 'ai',
          timestamp: new Date()
        }];
      }
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      // Process the response based on its content
      processAIResponse(response);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message
      messages = [...messages, { 
        text: "Sorry, I encountered an error while processing your request. Please try again later.", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
    } finally {
      // Hide loading state and scroll to bottom
      isLoading = false;
      scrollToBottom();
    }
  }
  
  // Modify the sendMessage function
  async function sendMessage(): Promise<AIResponse | undefined> {
    if (!newMessage.trim()) return undefined;
    
    // If we're in confirmation state, append the selection to the original context
    const messageToSend = confirmationState.isWaiting 
      ? `${confirmationState.context} (Specifically: ${newMessage})`
      : newMessage;
    
    // Reset confirmation state
    confirmationState = { isWaiting: false, options: [], context: '' };
    
    // Check if this is a generic recipe request
    if (!messageToSend.includes('Specifically:') && await handleGenericRecipeRequest(messageToSend)) {
      // If it's generic, we've set up the confirmation state and should return
      return undefined;
    }
    
    // Check if this is an inventory statement
    const inventoryItems = extractInventoryItems(messageToSend);
    if (inventoryItems.length > 0) {
      // Add user message
      messages = [...messages, { 
        text: messageToSend, 
        sender: 'user',
        timestamp: new Date()
      }];
      
      // Clear input and scroll to bottom
      newMessage = '';
      scrollToBottom();
      
      // Update inventory
      inventoryStore.updateInventory(inventoryItems, user_id);
      
      // Format inventory for sticky note (but don't create it automatically)
      // const inventoryText = formatInventoryForNote(inventoryItems);
      // notesStore.addNote(inventoryText, window.innerWidth - 400, 300);
      
      // Add AI confirmation message
      messages = [...messages, { 
        text: `I've added ${inventoryItems.length} item(s) to your inventory.`, 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      scrollToBottom();
      
      return {
        intent: 'save_inventory',
        ai_response: `I've added ${inventoryItems.length} item(s) to your inventory.`,
        inventory_items: inventoryItems
      };
    }
    
  // Check if this is a grocery statement
  const groceryItems = extractGroceryItems(messageToSend);
  if (groceryItems.length > 0) {
    // Add user message
    messages = [...messages, { 
      text: messageToSend, 
      sender: 'user',
      timestamp: new Date()
    }];
    
    // Clear input and scroll to bottom
    newMessage = '';
    scrollToBottom();
    
    try {
      console.log('Creating grocery list with items:', groceryItems);
      
      // Create a grocery list with a more descriptive name
      const listName = `Shopping List (${new Date().toLocaleDateString()})`;
      
      // Create the list through the dataService to ensure it's properly saved to the database
      const groceryList = await groceryStore.createList(listName, user_id);
      console.log('Created grocery list:', groceryList);
      
      // Ensure the list has a valid ID
      if (!groceryList || !groceryList.id) {
        throw new Error('Failed to create grocery list with valid ID');
      }
      
      // Add items to the list one by one to ensure they're properly saved
      const savedItems = [];
      for (const item of groceryItems) {
        console.log('Adding grocery item to list:', item);
        
        // Ensure the item has all required fields
        const itemWithListId = {
          ...item,
          id: Date.now() + Math.floor(Math.random() * 1000), // Ensure unique ID
          list_id: groceryList.id,
          user_id: user_id,
          name: item.name || '',
          amount: item.amount || '1',
          checked: false,
          is_checked: false,
          category: item.category || getCategoryForIngredient(item.name || '')
        };
        
        // Save the item to the grocery store
        try {
          const result = await groceryStore.addItem(itemWithListId, user_id);
          console.log('Grocery item added, result:', result);
          savedItems.push(itemWithListId);
          
          // Small delay to prevent race conditions
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (itemError) {
          console.error('Error adding grocery item:', itemError);
          // Continue with other items even if one fails
        }
      }
      
      // Force a refresh of the grocery store to ensure items are loaded
      await groceryStore.loadGroceryItems(user_id);
      
      // Format grocery list for sticky note
      const groceryText = formatGroceryListForNote({
        id: groceryList.id,
        user_id: user_id,
        name: listName,
        created_at: new Date().toISOString(),
        items: savedItems,
        is_completed: false
      });
      
      // Add the note to the store for visual feedback
      notesStore.addNote(groceryText, window.innerWidth - 400, 500, user_id);
      
      // Add AI confirmation message
      messages = [...messages, { 
        text: `I've added ${groceryItems.length} item(s) to your grocery list "${listName}".`, 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      scrollToBottom();
      
      return {
        intent: 'create_grocery_list',
        ai_response: `I've added ${groceryItems.length} item(s) to your grocery list.`,
        grocery_list: {
          ...groceryList,
          items: savedItems
        }
      };
    } catch (error) {
      console.error('Error creating grocery list:', error);
      
      // Add error message
      messages = [...messages, { 
        text: "Sorry, I encountered an error while creating your grocery list. Please try again.", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      scrollToBottom();
      
      return {
        intent: 'error',
        ai_response: "Sorry, I encountered an error while creating your grocery list. Please try again."
      };
    }
  }
    
    // Add user message for non-inventory, non-grocery messages
    messages = [...messages, { 
      text: messageToSend, 
      sender: 'user',
      timestamp: new Date()
    }];
    
    // Save chat history to localStorage
    localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
    
    // Clear input and scroll to bottom
    const userMessage = messageToSend;
    newMessage = '';
    scrollToBottom();
    
    // Show loading state
    isLoading = true;
    
    let response: AIResponse | undefined;
    try {
      // Create chat request with model config
      const request: ChatRequest = {
        message: userMessage,
        user_id: user_id,
        modelConfig: modelConfig
      };
      
      // Get AI response
      response = await aiService.generateResponse(request);
      
      // Extract the conversational part of the response
      let displayText = response.ai_response;
      let shouldExtractRecipe = false;
      
      // If the response contains a recipe, clean up the display text to remove any JSON
      if (response.recipe) {
        // Check if the response contains JSON
        if (displayText.includes('{') && displayText.includes('"recipe":')) {
          // Try to extract just the conversational part before the JSON
          const textMatch = displayText.match(/^(.*?)(?:\{|\[)/);
          if (textMatch && textMatch[1]) {
            displayText = textMatch[1].trim();
          } else {
            // If we can't extract it, use a generic message
            displayText = `Here's a ${response.recipe.title} recipe for you!`;
          }
        }
        
        // Add the initial response
        messages = [...messages, { 
          text: displayText, 
          sender: 'ai',
          timestamp: new Date()
        }];
        
        // Add a separate message with the recipe
        messages = [...messages, { 
          text: '', 
          sender: 'ai',
          timestamp: new Date(),
          recipe: response.recipe
        }];
      } else {
        // Add just the text response if no recipe
        messages = [...messages, { 
          text: displayText, 
          sender: 'ai',
          timestamp: new Date()
        }];
      }
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      // Process the response based on its content
      processAIResponse(response);
      
      return undefined;
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message
      messages = [...messages, { 
        text: "Sorry, I encountered an error while processing your request. Please try again later.", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
    } finally {
      // Hide loading state and scroll to bottom
      isLoading = false;
      scrollToBottom();
      
      return response;
    }
  }
  
  // Function to format recipe for sticky note
  function formatRecipeForNote(recipe: Recipe): string {
    let text = `<b>${recipe.title}</b><br><br>`;
    
    if (recipe.description) {
      text += `${recipe.description}<br><br>`;
    }
    
    if (recipe.prep_time || recipe.cook_time) {
      text += '<b>Time:</b> ';
      if (recipe.prep_time) text += `Prep: ${recipe.prep_time} `;
      if (recipe.cook_time) text += `Cook: ${recipe.cook_time} `;
      text += '<br>';
    }
    
    if (recipe.servings) {
      text += `<b>Servings:</b> ${recipe.servings}<br>`;
    }
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      text += '<br><b>Ingredients:</b><br><ul>';
      recipe.ingredients.forEach((ingredient) => {
        let ingredientText = '';
        if (ingredient.amount) ingredientText += ingredient.amount + ' ';
        if (ingredient.unit) ingredientText += ingredient.unit + ' ';
        ingredientText += ingredient.name;
        if (ingredient.preparation) ingredientText += `, ${ingredient.preparation}`;
        text += `<li>${ingredientText}</li>`;
      });
      text += '</ul>';
    }
    
    if (recipe.steps && recipe.steps.length > 0) {
      text += '<br><b>Instructions:</b><br><ol>';
      recipe.steps.forEach((step) => {
        text += `<li>${typeof step === 'string' ? step : step.instruction}</li>`;
      });
      text += '</ol>';
    }
    
    if (recipe.tools && recipe.tools.length > 0) {
      text += '<br><b>Tools:</b><br><ul>';
      recipe.tools.forEach((tool) => {
        text += `<li>${tool}</li>`;
      });
      text += '</ul>';
    }
    
    if (recipe.methods && recipe.methods.length > 0) {
      text += '<br><b>Methods:</b><br><ul>';
      recipe.methods.forEach((method) => {
        text += `<li>${method}</li>`;
      });
      text += '</ul>';
    }
    
    if (recipe.keywords) {
      text += '<br><b>Keywords:</b> ' + recipe.keywords;
    }
    
    return text;
  }
  
  // Process AI response and save data to appropriate stores
  function processAIResponse(response: AIResponse) {
    console.log('Processing AI response:', response);
    
    // If the response includes a recipe
    if (response.recipe) {
      // Don't automatically save recipe to the recipe store
      // The user will save it explicitly by clicking the "Save recipe" button
      
      // No need to create a sticky note automatically
      // The user can choose to save it to a sticky note using the action buttons
    }
    
    // If the response includes inventory items
    if (response.inventory_items && response.inventory_items.length > 0) {
      console.log('Updating inventory with items:', response.inventory_items);
      
      // Ensure all inventory items have the correct user_id
      const itemsWithUserId = response.inventory_items.map(item => ({
        ...item,
        user_id: item.user_id || user_id
      }));
      
      // Save inventory items to the inventory store
      inventoryStore.updateInventory(itemsWithUserId, user_id);
      
      // Format inventory for sticky note
      const inventoryText = formatInventoryForNote(itemsWithUserId);
      
      // Add the note to the store for visual feedback
      notesStore.addNote(inventoryText, window.innerWidth - 400, 300);
      
      // Add confirmation message to chat
      messages = [...messages, { 
        text: `I've updated your inventory with ${itemsWithUserId.length} item(s).`, 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      scrollToBottom();
    }
    
    // If the response includes a grocery list
    if (response.grocery_list) {
      // Ensure the grocery list has the correct user ID
      const groceryList: GroceryList = {
        ...response.grocery_list,
        user_id: user_id
      };
      
      // Add items to the grocery store
      if (groceryList.items && groceryList.items.length > 0) {
        groceryList.items.forEach(item => {
          groceryStore.addItem({
            ...item,
            user_id: user_id
          }, user_id);
        });
        
        // Format grocery list for sticky note
        const groceryText = formatGroceryListForNote(groceryList);
        
        // Add the note to the store for visual feedback
        notesStore.addNote(groceryText, window.innerWidth - 400, 500);
      }
    }
  }
  
  // Function to format inventory for sticky note
  function formatInventoryForNote(items: InventoryItem[]): string {
    let text = `<b>Inventory Update</b><br><br>`;
    
    text += '<ul>';
    items.forEach(item => {
      let itemText = '';
      if (item.amount) itemText += item.amount + ' ';
      if (item.unit) itemText += item.unit + ' ';
      itemText += item.ingredient_name;
      if (item.expires_at) {
        const expiryDate = new Date(item.expires_at);
        itemText += ` (Expires: ${expiryDate.toLocaleDateString()})`;
      }
      text += `<li>${itemText}</li>`;
    });
    text += '</ul>';
    
    return text;
  }
  
  // Helper function to categorize ingredients
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
  
  // Function to format grocery list for sticky note
  function formatGroceryListForNote(groceryList: GroceryList): string {
    let text = `<b>Grocery List: ${groceryList.name}</b><br><br>`;
    
    if (groceryList.items && groceryList.items.length > 0) {
      text += '<ul>';
      groceryList.items.forEach(item => {
        let itemText = '';
        if (item.amount) itemText += item.amount + ' ';
        if (item.unit) itemText += item.unit + ' ';
        itemText += item.name;
        if (item.notes) itemText += ` (${item.notes})`;
        text += `<li>${itemText}</li>`;
      });
      text += '</ul>';
    } else {
      text += '<p>No items in this list.</p>';
    }
    
    return text;
  }
  
  // Function to send a quick message
  function sendQuickMessage(text: string) {
    newMessage = text;
    sendMessage();
  }
  
  // Function to scroll chat to bottom
  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 0);
  }
  
  // Function to extract and save recipe from message
  async function extractAndSaveRecipe(text: string): Promise<AIResponse | undefined> {
    try {
      // Create chat request to extract recipe
      const request: ChatRequest = {
        message: `Extract a structured recipe from this text: ${text}`,
        user_id: user_id,
        modelConfig: modelConfig
      };
      
      // Get AI response
      const response: AIResponse = await aiService.generateResponse(request);
      
      // If the response includes a recipe
      if (response.recipe) {
        // Save recipe to the recipe store
        const recipe: Recipe = {
          ...response.recipe,
          user_id: user_id
        };
        recipeStore.addRecipe(recipe);
        
        // Format recipe for sticky note
        const recipeText = formatRecipeForNote(recipe);
        
        // Add the note to the store for visual feedback
        notesStore.addNote(recipeText, window.innerWidth - 400, 100);
        
        // Add success message
        messages = [...messages, { 
          text: "I've extracted and saved the recipe for you!", 
          sender: 'ai',
          timestamp: new Date()
        }];
        
        // Save updated chat history to localStorage
        localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
        
        scrollToBottom();
        
        // Return the response
        return response;
      } else {
        // Add error message
        messages = [...messages, { 
          text: "I couldn't extract a recipe from that message. Please try with a more detailed recipe description.", 
          sender: 'ai',
          timestamp: new Date()
        }];
        
        // Save updated chat history to localStorage
        localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
        
      scrollToBottom();
      
      // Return undefined
      return undefined;
    }
    } catch (error) {
      console.error('Error extracting recipe:', error);
      
      // Add error message
      messages = [...messages, { 
        text: "Sorry, I encountered an error while extracting the recipe. Please try again later.", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      scrollToBottom();
      
      // Return undefined
      return undefined;
    }
  }
  
  // Function to extract ingredients using regex
  function extractIngredientsWithRegex(text: string): Recipe {
    // Create a basic recipe structure
    const recipe: Recipe = {
      id: Date.now(),
      user_id: user_id,
      title: 'Untitled Recipe',
      description: text,
      servings: '1-2 servings',
      ingredients: [],
      steps: [],
      tools: [],
      methods: [],
      keywords: '',
      created_at: new Date().toISOString()
    };
    
    // Extract ingredients using regex
    // Look for patterns like:
    // - 2 cups flour
    // - 1/2 teaspoon salt
    // - 3 large eggs
    const ingredientRegex = /(?:^|\n)(?:[-•*]\s*)?(\d+(?:\/\d+)?(?:\s*-\s*\d+(?:\/\d+)?)?\s*(?:cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters|pinch|dash|handful|clove|cloves|piece|pieces|slice|slices|bunch|bunches|sprig|sprigs|stalk|stalks|head|heads|can|cans|package|packages|bottle|bottles|jar|jars|box|boxes|bag|bags|container|containers|unit|units|inch|inches|cm|centimeter|centimeters|mm|millimeter|millimeters)?\s+(?:of\s+)?([a-zA-Z\s]+)(?:,\s*([a-zA-Z\s]+))?)/gi;
    
    let match;
    while ((match = ingredientRegex.exec(text)) !== null) {
      const amount = match[1] ? match[1].trim() : '';
      const name = match[2] ? match[2].trim() : '';
      const preparation = match[3] ? match[3].trim() : undefined;
      
      if (name) {
        recipe.ingredients.push({
          name,
          amount,
          preparation
        });
      }
    }
    
    // If no ingredients were found with the structured regex, try a simpler approach
    if (recipe.ingredients.length === 0) {
      // Look for lines that might be ingredients (contain measurements or food items)
      const lines = text.split('\n');
      const foodKeywords = ['flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'egg', 'milk', 'water', 'cheese', 'chicken', 'beef', 'pork', 'fish', 'rice', 'pasta', 'potato', 'tomato', 'onion', 'garlic', 'carrot', 'celery', 'pepper', 'spice', 'herb', 'sauce', 'broth', 'stock', 'wine', 'vinegar'];
      
      for (const line of lines) {
        // Skip very short lines or lines that look like instructions
        if (line.length < 3 || /^(step|[0-9]+\.)/.test(line)) continue;
        
        // Check if line contains food keywords or measurements
        const containsFoodKeyword = foodKeywords.some(keyword => line.toLowerCase().includes(keyword));
        const containsMeasurement = /\d+\s*(?:cup|tbsp|tsp|oz|g|lb|ml|l)/i.test(line);
        
        if (containsFoodKeyword || containsMeasurement) {
          // Try to extract amount and name
          const parts = line.trim().split(/\s+/);
          let amount = '';
          let name = '';
          
          // If first part looks like a number or fraction, it's probably the amount
          if (/^\d+(?:\/\d+)?$/.test(parts[0]) || /^\d+(?:\.\d+)?$/.test(parts[0])) {
            amount = parts[0];
            if (parts[1] && /^(?:cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kg|ml|l)s?$/i.test(parts[1])) {
              amount += ' ' + parts[1];
              name = parts.slice(2).join(' ');
            } else {
              name = parts.slice(1).join(' ');
            }
          } else {
            // No clear amount, treat the whole line as the ingredient name
            name = line.trim();
          }
          
          if (name) {
            recipe.ingredients.push({
              name,
              amount
            });
          }
        }
      }
    }
    
    return recipe;
  }
  
  // Function to extract food items from text
  function extractFoodItems(text: string): { name: string; amount: string; unit?: string }[] {
    const foodItems: { name: string; amount: string; unit?: string }[] = [];
    
    // Expanded list of common food items
    const commonFoodItems = [
      'apple', 'banana', 'orange', 'lemon', 'lime', 'strawberry', 'blueberry', 'raspberry',
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp',
      'flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'milk', 'cream', 'cheese',
      'egg', 'bread', 'rice', 'pasta', 'noodle', 'potato', 'tomato', 'onion', 'garlic',
      'carrot', 'celery', 'lettuce', 'spinach', 'kale', 'broccoli', 'cauliflower',
      'bean', 'lentil', 'chickpea', 'tofu', 'nut', 'seed', 'almond', 'walnut',
      'spice', 'herb', 'basil', 'oregano', 'thyme', 'rosemary', 'cinnamon', 'cumin',
      'sauce', 'ketchup', 'mustard', 'mayonnaise', 'vinegar', 'soy sauce', 'olive oil',
      'water', 'broth', 'stock', 'wine', 'beer', 'juice', 'coffee', 'tea'
    ];
    
    // Split text into words and look for food items
    const words = text.toLowerCase().split(/\s+/);
    
    for (const foodItem of commonFoodItems) {
      if (text.toLowerCase().includes(foodItem)) {
        // Try to find amount near the food item
        const foodIndex = words.findIndex(word => word.includes(foodItem));
        let amount = "1";
        let unit = undefined;
        
        // Check if there's a number before the food item
        if (foodIndex > 0) {
          const prevWord = words[foodIndex - 1];
          // Check if previous word is a number or contains a number
          if (/\d/.test(prevWord)) {
            amount = prevWord;
            
            // Check if there's a unit between the number and food item
            if (foodIndex > 1) {
              const possibleUnit = words[foodIndex - 1];
              const unitPattern = /cup|tablespoon|tbsp|teaspoon|tsp|pound|lb|ounce|oz|gram|g|kg|ml|l/i;
              if (unitPattern.test(possibleUnit)) {
                unit = possibleUnit;
                // Adjust amount to be the word before the unit
                if (foodIndex > 2 && /\d/.test(words[foodIndex - 2])) {
                  amount = words[foodIndex - 2];
                }
              }
            }
          }
        }
        
        foodItems.push({
          name: foodItem,
          amount,
          unit
        });
      }
    }
    
    return foodItems;
  }
  
  // Function to extract ingredients using a simpler approach
  function extractIngredientsSimple(text: string): { name: string; amount: string; unit?: string }[] {
    const ingredients: { name: string; amount: string; unit?: string }[] = [];
    
    // Split text into lines
    const lines = text.split('\n');
    
    // Common food-related words to identify ingredient lines
    const foodKeywords = [
      'flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'egg', 'milk', 'water', 
      'cheese', 'chicken', 'beef', 'pork', 'fish', 'rice', 'pasta', 'potato', 
      'tomato', 'onion', 'garlic', 'carrot', 'celery', 'pepper', 'spice', 'herb', 
      'sauce', 'broth', 'stock', 'wine', 'vinegar'
    ];
    
    // Common measurement units
    const unitPattern = /cup|tablespoon|tbsp|teaspoon|tsp|pound|lb|ounce|oz|gram|g|kg|ml|l/i;
    
    for (const line of lines) {
      // Skip very short lines or lines that look like instructions
      if (line.length < 3 || /^(step|[0-9]+\.)/.test(line)) continue;
      
      // Check if line contains food keywords or measurements
      const containsFoodKeyword = foodKeywords.some(keyword => line.toLowerCase().includes(keyword));
      const containsMeasurement = /\d+\s*(?:cup|tbsp|tsp|oz|g|lb|ml|l)/i.test(line);
      
      if (containsFoodKeyword || containsMeasurement) {
        // Try to extract amount, unit, and name
        const parts = line.trim().split(/\s+/);
        let amount = '1'; // Default amount
        let unit: string | undefined = undefined;
        let name = line.trim(); // Default to full line
        
        // If first part looks like a number or fraction, it's probably the amount
        if (parts.length > 1 && (/^\d+(?:\/\d+)?$/.test(parts[0]) || /^\d+(?:\.\d+)?$/.test(parts[0]))) {
          amount = parts[0];
          
          // Check if second part is a unit
          if (parts.length > 2 && unitPattern.test(parts[1])) {
            unit = parts[1];
            name = parts.slice(2).join(' ');
          } else {
            name = parts.slice(1).join(' ');
          }
        }
        
        // Add to ingredients if we have a name
        if (name) {
          ingredients.push({
            name,
            amount,
            unit
          });
        }
      }
    }
    
    return ingredients;
  }
  
  // Function to check recipe against inventory
  async function checkRecipeAgainstInventory(text: string, recipe?: Recipe): Promise<AIResponse | undefined> {
    try {
      let recipeToCheck: Recipe;

      console.log(recipe)
      
      if (recipe) {
        // Use the provided recipe directly
        recipeToCheck = {
          ...recipe,
          user_id: user_id
        };
      } else {
        // Try multiple approaches to extract ingredients
        let extractedRecipe: Recipe | null = null;
        
        // First try AI-based extraction if not in direct mode
        if (modelConfig.ingredientCheckMethod !== 'direct') {
          try {
            const request: ChatRequest = {
              message: `Extract a structured recipe from this text: ${text}`,
              user_id: user_id,
              modelConfig: modelConfig
            };
            
            // Get AI response
            const response = await aiService.generateResponse(request);
            
            if (response.recipe && response.recipe.ingredients && response.recipe.ingredients.length > 0) {
              extractedRecipe = {
                ...response.recipe,
                user_id: user_id
              };
            }
          } catch (error) {
            console.error('Error in AI-based recipe extraction:', error);
            // Continue to fallback methods
          }
        }
        
        // If AI extraction failed or wasn't used, try regex extraction
        if (!extractedRecipe) {
          extractedRecipe = extractIngredientsWithRegex(text);
        }
        
        // If we still don't have ingredients, try a simpler approach
        if (!extractedRecipe || !extractedRecipe.ingredients || extractedRecipe.ingredients.length === 0) {
          // Create a basic recipe with ingredients extracted from common patterns
          extractedRecipe = {
            id: Date.now(),
            user_id: user_id,
            title: 'Recipe Check',
            description: text,
            servings: '1-2 servings',
            ingredients: extractIngredientsSimple(text),
            steps: [],
            tools: [],
            methods: [],
            keywords: '',
            created_at: new Date().toISOString()
          };
        }
        
        recipeToCheck = extractedRecipe;
      }
      
      // Filter out any generic "Ingredient X" entries
      if (recipeToCheck.ingredients) {
        recipeToCheck.ingredients = recipeToCheck.ingredients.filter(
          ingredient => !(/^ingredient\s+\d+$/i.test(ingredient.name))
        );
      }
      
      // If no valid ingredients remain after filtering
      if (!recipeToCheck.ingredients || recipeToCheck.ingredients.length === 0) {
        // Try one more approach - look for food items in the text
        const foodItems = extractFoodItems(text);
        
        if (foodItems.length > 0) {
          recipeToCheck.ingredients = foodItems;
        } else {
          // Add error message
          messages = [...messages, { 
            text: "I couldn't identify any specific ingredients in this text. Please try with a more detailed recipe description or list the ingredients explicitly.", 
            sender: 'ai',
            timestamp: new Date()
          }];
          
          // Save updated chat history to localStorage
          localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
          
          scrollToBottom();
          
          // Return empty response
          return {
            intent: 'unknown',
            ai_response: 'No ingredients found'
          };
        }
      }
      
      // Check recipe against inventory
      const result = await inventoryStore.checkRecipeIngredients(recipeToCheck, user_id);
      
      // Update ingredient check state to show modal
      ingredientCheckState = {
        isVisible: true,
        recipe: recipeToCheck,
        hasAllIngredients: result.hasAllIngredients,
        missingIngredients: result.missingIngredients,
        availableIngredients: result.availableIngredients
      };
      
      // Add success message to chat
      messages = [...messages, { 
        text: result.hasAllIngredients 
          ? "Good news! You have all the ingredients needed for this recipe." 
          : "You're missing some ingredients for this recipe. I've created a note with the details.", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      scrollToBottom();
      
      return {
        intent: 'check_ingredients',
        ai_response: result.hasAllIngredients 
          ? "Good news! You have all the ingredients needed for this recipe." 
          : "You're missing some ingredients for this recipe. I've created a note with the details."
      };
    } catch (error) {
      console.error('Error checking recipe against inventory:', error);
      
      // Add error message
      messages = [...messages, { 
        text: "Sorry, I encountered an error while checking the recipe ingredients. Please try again later.", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      // Save updated chat history to localStorage
      localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
      
      scrollToBottom();
      
      return {
        intent: 'unknown',
        ai_response: 'Error checking recipe against inventory'
      };
    }
  }
  
  // Function to add missing ingredients to grocery list
  async function addMissingToGrocery(text: string) {
    try {
      // First extract the recipe
      const request: ChatRequest = {
        message: `Extract a structured recipe from this text: ${text}`,
        user_id: user_id,
        modelConfig: modelConfig
      };
      
      // Get AI response
      const response = await aiService.generateResponse(request);
      
      // If the response includes a recipe
      if (response.recipe) {
        const recipe: Recipe = {
          ...response.recipe,
          user_id: user_id
        };
        
        // Check recipe against inventory
        const result = await inventoryStore.checkRecipeIngredients(recipe, user_id);
        
        if (result.missingIngredients.length > 0) {
          // Create a new grocery list
          const groceryList = await groceryStore.createList(`Shopping for ${recipe.title}`, user_id);
          
          // Add each missing ingredient as an item
          const groceryItems = result.missingIngredients.map((ingredient, index) => {
            const item = {
              id: 0, // Will be assigned by the store
              list_id: groceryList.id,
              user_id: user_id,
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
              category: getCategoryForIngredient(ingredient.name),
              checked: false,
              is_checked: false,
              notes: `For ${recipe.title}`
            };
            
            // Add to store
            groceryStore.addItem(item, user_id);
            
            return item;
          });
          
          // Format grocery list for sticky note
          const groceryText = formatGroceryListForNote({
            id: groceryList.id,
            user_id: user_id,
            name: `Shopping for ${recipe.title}`,
            created_at: new Date().toISOString(),
            items: groceryItems,
            is_completed: false
          });
          
          // Add the note to the store for visual feedback
          notesStore.addNote(groceryText, window.innerWidth - 400, 500);
          
          // Add success message
          messages = [...messages, { 
            text: `I've added the missing ingredients for "${recipe.title}" to your grocery list.`, 
            sender: 'ai',
            timestamp: new Date()
          }];
        } else {
          // Add message that no ingredients are missing
          messages = [...messages, { 
            text: "Good news! You already have all the ingredients needed for this recipe.", 
            sender: 'ai',
            timestamp: new Date()
          }];
        }
        
        scrollToBottom();
      
      // Return the response
      return response;
      } else {
        // Add error message
        messages = [...messages, { 
          text: "I couldn't extract a recipe from that message. Please try with a more detailed recipe description.", 
          sender: 'ai',
          timestamp: new Date()
        }];
        
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error adding missing ingredients to grocery list:', error);
      
      // Add error message
      messages = [...messages, { 
        text: "Sorry, I encountered an error while adding the missing ingredients to your grocery list. Please try again later.", 
        sender: 'ai',
        timestamp: new Date()
      }];
      
      scrollToBottom();
      
      // Return empty response
      return {
        intent: 'unknown',
        ai_response: 'Error checking recipe against inventory'
      };
    }
  }

  // Add this function to format recipe display
  function formatRecipe(recipe: Recipe): string {
    console.log('Formatting recipe:', recipe);
    let formattedRecipe = `
      <div class="recipe-card">
        <div class="recipe-title">
          <h3>${recipe.title}</h3>
          <div class="save-indicator">i</div>
        </div>
        
        <p class="recipe-description">${recipe.description || ''}</p>
        
        <div class="recipe-section">
          <h4>🥘 Ingredients</h4>
          <ul>
            ${recipe.ingredients.map(ing => `
              <li>
                <strong>${ing.name}:</strong> ${ing.amount} ${ing.unit || ''}
              </li>
            `).join('')}
          </ul>
        </div>
        
        <div class="recipe-section">
          <h4>📝 Steps</h4>
          <ol>
            ${recipe.steps.map(step => `<li>${step.instruction}</li>`).join('')}
          </ol>
        </div>

        ${recipe.tools && recipe.tools.length > 0 ? `
          <div class="recipe-section">
            <h4>🔧 Tools</h4>
            <ul>
              ${recipe.tools.map(tool => `<li>${tool}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${recipe.methods && recipe.methods.length > 0 ? `
          <div class="recipe-section">
            <h4>📋 Methods</h4>
            <ul>
              ${recipe.methods.map(method => `<li>${method}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${recipe.keywords ? `
          <div class="recipe-section">
            <h4>🏷️ Keywords</h4>
            <div class="keyword-tags">
              ${recipe.keywords.split(',').map(keyword => 
                `<span class="keyword-tag">${keyword.trim()}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}

        <div class="recipe-actions">
          <button 
            class="action-button check-ingredients" 
            on:click={() => checkRecipeAgainstInventory(recipe)}
          >
            🧾 Check ingredients
          </button>
          <button 
            class="action-button save-note" 
            on:click={() => notesStore.addNote(formatRecipeForNote(recipe), window.innerWidth - 400, 100)}
          >
            📌 Save to sticky note
          </button>
          <button 
            class="action-button save-recipe" 
            on:click={() => {
              if (recipe) {
                const recipeToSave: Recipe = {
                  id: recipe.id || Date.now(),
                  user_id,
                  title: recipe.title || 'Untitled Recipe',
                  description: recipe.description || '',
                  servings: recipe.servings || '1-2 servings',
                  ingredients: recipe.ingredients || [],
                  steps: recipe.steps || [],
                  tools: recipe.tools || [],
                  methods: recipe.methods || [],
                  keywords: recipe.keywords || '',
                  created_at: recipe.created_at || new Date().toISOString()
                };
                recipeStore.addRecipe(recipeToSave);
              }
            }}
          >
            💾 Save recipe
          </button>
        </div>
      </div>
    `;
    
    return formattedRecipe;
  }

  // Add this function to save recipe
  function saveRecipe(recipe: Recipe) {
    recipeStore.addRecipe({
      ...recipe,
      user_id: user_id
    });
    
    // Add success message
    messages = [...messages, { 
      text: `Recipe "${recipe.title}" has been saved to your collection!`, 
      sender: 'ai',
      timestamp: new Date()
    }];
    
    scrollToBottom();
  }
</script>

<div class="chat-area">
  <div class="chat-container">
    <div class="chat-header">
      <h2>Ask PlatesAI</h2>
      <p style="color: var(--white)">Get recipes, cooking tips, and more</p>
    </div>
    
    <div class="chat-messages" bind:this={chatContainer}>
      {#each messages as message, index}
        <div class="message {message.sender}">
          <div class="message-content">
            <div class="message-actions">
              <button 
                class="action-icon" 
                title="Save to sticky note"
                on:click={() => {
                  if (message.recipe) {
                    notesStore.addNote(formatRecipeForNote(message.recipe), window.innerWidth - 400, 100);
                  } else {
                    notesStore.addNote(message.text, window.innerWidth - 400, 300);
                  }
                }}
              >
                {@html createIcon('notes', 16)}
              </button>
            </div>
            {#if message.recipe}
              <div class="recipe-card">
                <div class="recipe-title">
                  <h3>{message.recipe.title}</h3>
                  <div class="save-indicator">i</div>
                </div>
                
                <p class="recipe-description">{message.recipe.description || ''}</p>
                
                <div class="recipe-section">
                  <h4>📝 Ingredients</h4>
                  <ul>
                    {#each message.recipe.ingredients as ingredient}
                      <li>
                        <strong>{ingredient.name}:</strong> {ingredient.amount} {ingredient.unit || ''}
                      </li>
                    {/each}
                  </ul>
                </div>
                
                <div class="recipe-section">
                  <h4>📋 Steps</h4>
                  <ol>
                    {#each message.recipe.steps as step}
                      <li>{typeof step === 'string' ? step : step.instruction}</li>
                    {/each}
                  </ol>
                </div>

                {#if message.recipe.tools && message.recipe.tools.length > 0}
                  <div class="recipe-section">
                    <h4>🔧 Tools</h4>
                    <ul>
                      {#each message.recipe.tools as tool}
                        <li>{tool}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if message.recipe.methods && message.recipe.methods.length > 0}
                  <div class="recipe-section">
                    <h4>📋 Methods</h4>
                    <ul>
                      {#each message.recipe.methods as method}
                        <li>{method}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if message.recipe.keywords}
                  <div class="recipe-section">
                    <h4>🏷️ Keywords</h4>
                    <div class="keyword-tags">
                      {#each message.recipe.keywords.split(',') as keyword}
                        <span class="keyword-tag">{keyword.trim()}</span>
                      {/each}
                    </div>
                  </div>
                {/if}

                <div class="recipe-actions">
                  <button 
                    class="action-button check-ingredients" 
                    on:click={() => checkRecipeAgainstInventory(message.text, message.recipe)}
                  >
                    🧾 Check ingredients
                  </button>
                  <button 
                    class="action-button save-note" 
                    on:click={() => message.recipe && notesStore.addNote(formatRecipeForNote(message.recipe), window.innerWidth - 400, 100)}
                  >
                    📌 Save to sticky note
                  </button>
                  <button 
                    class="action-button save-recipe" 
                    on:click={() => {
                      if (message.recipe) {
                        const recipeToSave: Recipe = {
                          id: message.recipe.id || Date.now(),
                          user_id,
                          title: message.recipe.title || 'Untitled Recipe',
                          description: message.recipe.description || '',
                          servings: message.recipe.servings || '1-2 servings',
                          ingredients: message.recipe.ingredients || [],
                          steps: message.recipe.steps || [],
                          tools: message.recipe.tools || [],
                          methods: message.recipe.methods || [],
                          keywords: message.recipe.keywords || '',
                          created_at: message.recipe.created_at || new Date().toISOString()
                        };
                        recipeStore.addRecipe(recipeToSave);
                      }
                    }}
                  >
                    💾 Save recipe
                  </button>
                </div>
              </div>
            {:else}
              <p>{message.text}</p>
            {/if}
          </div>
          <span class="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      {/each}
      
      {#if confirmationState.isWaiting}
        <div class="message ai">
          <div class="message-content">
            <p>Could you be more specific? Here are some options:</p>
            <div class="confirmation-options">
              {#each confirmationState.options as option}
                <button 
                  class="confirmation-option" 
                  on:click={() => {
                    newMessage = option;
                    sendMessage();
                  }}
                >
                  {option}
                </button>
              {/each}
              <button 
                class="confirmation-option custom" 
                on:click={() => {
                  newMessage = '';
                  confirmationState = { isWaiting: false, options: [], context: '' };
                }}
              >
                Something else...
              </button>
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Recipe Form -->
      {#if recipeFormState.isVisible}
        <div class="message ai">
          <div class="message-content">
            <div class="recipe-form">
              <h4>Recipe Preferences</h4>
              
              <div class="form-section">
                <h5>Flavor Profile</h5>
                <div class="checkbox-group">
                  {#each Object.keys(recipeFormState.flavors) as flavor}
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        bind:checked={recipeFormState.flavors[flavor]} 
                      />
                      <span class="checkbox-text">{flavor}</span>
                    </label>
                  {/each}
                </div>
              </div>
              
              <div class="form-section">
                <h5>Cooking Method</h5>
                <div class="checkbox-group">
                  {#each Object.keys(recipeFormState.cookingMethods) as method}
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        bind:checked={recipeFormState.cookingMethods[method]} 
                      />
                      <span class="checkbox-text">{method}</span>
                    </label>
                  {/each}
                </div>
              </div>
              
              <div class="form-section">
                <h5>Dish Type</h5>
                <div class="checkbox-group">
                  {#each Object.keys(recipeFormState.dishTypes) as dishType}
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        bind:checked={recipeFormState.dishTypes[dishType]} 
                      />
                      <span class="checkbox-text">{dishType}</span>
                    </label>
                  {/each}
                </div>
              </div>
              
              <div class="form-section">
                <h5>Difficulty</h5>
                <div class="radio-group">
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value="easy" 
                      bind:group={recipeFormState.difficulty} 
                    />
                    <span class="radio-text">Easy</span>
                  </label>
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value="medium" 
                      bind:group={recipeFormState.difficulty} 
                    />
                    <span class="radio-text">Medium</span>
                  </label>
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value="hard" 
                      bind:group={recipeFormState.difficulty} 
                    />
                    <span class="radio-text">Hard</span>
                  </label>
                </div>
              </div>
              
              <div class="form-actions">
                <button 
                  class="form-button continue" 
                  on:click={continueWithOriginalQuery}
                >
                  Continue with original query
                </button>
                <button 
                  class="form-button submit" 
                  on:click={submitRecipeForm}
                >
                  Submit with preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}
      
      {#if isLoading}
        <div class="message ai loading">
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      {/if}
    </div>
    
    <div class="chat-input">
      <input 
        type="text" 
        bind:value={newMessage} 
        placeholder="Ask about recipes, ingredients, or cooking tips..." 
        on:keydown={(e) => e.key === 'Enter' && sendMessage()}
      />
      <div class="chat-buttons">
        <button class="clear-button" on:click={clearChat} disabled={isLoading}>
          {@html createIcon('delete', 16)}
        </button>
        <button class="send-button" on:click={sendMessage} disabled={!newMessage.trim() || isLoading}>
          Send
        </button>
      </div>
    </div>
  </div>
  
  <div class="quick-actions">
    <h3>Quick Actions</h3>
    <div class="quick-actions-grid">
      {#each quickActions as action}
        <button class="quick-action-button" on:click={action.action} disabled={isLoading}>
          {action.text}
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Ingredient Check Modal -->
  {#if ingredientCheckState.isVisible && ingredientCheckState.recipe}
    <div class="modal-overlay">
      <div class="ingredient-check-modal">
        <div class="modal-header">
          <h4>Ingredient Check for {ingredientCheckState.recipe.title}</h4>
          <button class="close-modal" on:click={() => ingredientCheckState.isVisible = false}>
            &times;
          </button>
        </div>
        
        <div class="modal-content">
          {#if ingredientCheckState.hasAllIngredients}
            <div class="success-message">
              <span class="icon">✅</span>
              <span>You have all the ingredients needed!</span>
            </div>
            
            <div class="ingredient-list">
              <h5>Available Ingredients:</h5>
              <ul>
                {#each ingredientCheckState.availableIngredients as ingredient}
                  <li><strong>{ingredient.name}:</strong> {ingredient.amount} {ingredient.unit || ''}</li>
                {/each}
              </ul>
            </div>
            
            <button 
              class="make-recipe-btn"
              on:click={() => {
                // Subtract ingredients from inventory
                if (ingredientCheckState.recipe) {
                  inventoryStore.subtractRecipeIngredients(ingredientCheckState.recipe, user_id);
                  // Add confirmation message
                  messages = [...messages, { 
                    text: `I've updated your inventory after making ${ingredientCheckState.recipe.title}. The ingredients have been subtracted from your inventory.`, 
                    sender: 'ai',
                    timestamp: new Date()
                  }];
                  // Save updated chat history to localStorage
                  localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
                  // Close modal
                  ingredientCheckState.isVisible = false;
                  // Scroll to bottom
                  scrollToBottom();
                }
              }}
            >
              I made this recipe!
            </button>
          {:else}
            <div class="warning-message">
              <span class="icon">❌</span>
              <span>You're missing some ingredients.</span>
            </div>
            
            {#if ingredientCheckState.availableIngredients.length > 0}
              <div class="ingredient-list">
                <h5>Available Ingredients:</h5>
                <ul>
                  {#each ingredientCheckState.availableIngredients as ingredient}
                    <li><strong>{ingredient.name}:</strong> {ingredient.amount} {ingredient.unit || ''}</li>
                  {/each}
                </ul>
              </div>
            {/if}
            
            <div class="ingredient-list missing">
              <h5>Missing Ingredients:</h5>
              <ul>
                {#each ingredientCheckState.missingIngredients as ingredient}
                  <li><strong>{ingredient.name}:</strong> {ingredient.amount} {ingredient.unit || ''}</li>
                {/each}
              </ul>
            </div>
            
            <div class="grocery-list-actions">
              <button 
                class="grocery-list-btn"
                on:click={async () => {
                  if (ingredientCheckState.recipe) {
                    // Use the createGroceryListFromMissingIngredients method to create the grocery list
                    await groceryStore.createGroceryListFromMissingIngredients(
                      ingredientCheckState.recipe.title,
                      ingredientCheckState.missingIngredients,
                      user_id
                    );
                    
                    // Add confirmation message
                    messages = [...messages, { 
                      text: `I've added the missing ingredients for "${ingredientCheckState.recipe.title}" to your grocery list.`, 
                      sender: 'ai',
                      timestamp: new Date()
                    }];
                    // Save updated chat history to localStorage
                    localStorage.setItem('platesai_chat_history', JSON.stringify(messages));
                    // Close modal
                    ingredientCheckState.isVisible = false;
                    // Scroll to bottom
                    scrollToBottom();
                  }
                }}
              >
                Add to Grocery List
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-area {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: var(--space-xl);
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }
  
  .chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    margin-bottom: var(--space-xl);
  }
  
  .chat-header {
    padding: var(--space-md);
    background-color: var(--accent-light);
    color: var(--dark);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    position: relative;
    overflow: hidden;
    border-bottom: 2px dashed var(--primary-light);
  }
  
  .chat-header::before {
    content: "";
    position: absolute;
    top: -10px;
    right: -10px;
    width: 80px;
    height: 80px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
  
  .chat-header::after {
    content: "🍳";
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 24px;
    opacity: 0.8;
  }
  
  .chat-header h2 {
    margin-bottom: var(--space-xs);
    color: var(--white);
    font-family: var(--font-accent);
    font-size: 1.8rem;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.1);
  }
  
  .chat-header p {
    margin-bottom: 0;
    opacity: 0.9;
    font-size: var(--text-sm);
    max-width: 80%;
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-height: 200px;
  }
  
  .message {
    display: flex;
    flex-direction: column;
    max-width: 80%;
  }
  
  .message.user {
    align-self: flex-end;
  }
  
  .message.ai {
    align-self: flex-start;
  }
  
  .message-content {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    position: relative;
    background-color: var(--white);
  }
  
  .message.user .message-content {
    background: var(--accent-light);
    color: var(--white);
    border-bottom-right-radius: var(--radius-sm);
    box-shadow: var(--shadow-fun);
  }
  
  .message.user .message-content::before {
    content: "";
    position: absolute;
    bottom: -8px;
    right: 0;
    width: 16px;
    height: 16px;
    background: var(--accent-light);
    clip-path: polygon(0 0, 100% 0, 100% 100%);
  }
  
  .message.ai .message-content {
    background-color: var(--white);
    color: var(--dark);
    border: 1px solid var(--light-gray);
    border-bottom-left-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
  }
  
  .message.ai .message-content::before {
    content: "🍽️";
    position: absolute;
    top: -10px;
    left: 10px;
    font-size: 14px;
    opacity: 0.7;
    background-color: var(--white);
    padding: 2px;
    border-radius: 50%;
  }
  
  .message-time {
    font-size: var(--text-xs);
    color: var(--medium-gray);
    margin-top: var(--space-xs);
    align-self: flex-end;
  }
  
  .message.user .message-time {
    align-self: flex-end;
  }
  
  .message.ai .message-time {
    align-self: flex-start;
  }
  
  /* Message Actions */
  .message-actions {
    display: flex;
    gap: var(--space-xs);
    position: absolute;
    bottom: -15px;
    right: 5px;
    opacity: 0;
    transition: opacity var(--transition-fast);
    z-index: 10;
  }
  
  .message-content:hover .message-actions {
    opacity: 1;
  }
  
  .action-icon {
    background: var(--white);
    border: none;
    border-radius: var(--radius-full);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    color: var(--primary);
    transition: all var(--transition-fast);
  }
  
  .action-icon:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    background-color: var(--primary);
    color: var(--white);
  }
  
  /* For mobile devices, always show the actions */
  @media (max-width: 768px) {
    .message-actions {
      opacity: 0.8;
    }
  }
  
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: var(--space-xs) 0;
  }
  
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background-color: var(--medium-gray);
    border-radius: var(--radius-full);
    display: inline-block;
    animation: typing 1.4s infinite ease-in-out both;
  }
  
  .typing-indicator span:nth-child(1) {
    animation-delay: 0s;
  }
  
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes typing {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }
  
  .chat-input {
    display: flex;
    padding: var(--space-md);
    border-top: 1px solid var(--light-gray);
    background-color: var(--white);
    gap: var(--space-sm);
    position: relative;
  }

  .clear-button {
    position: absolute;
    right: var(--space-md);
    top: -40px;
    padding: var(--space-sm);
    background-color: var(--white);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--medium-gray);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .clear-button:hover:not(:disabled) {
    background-color: var(--light-gray);
    color: var(--primary);
  }

  .clear-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-buttons {
    display: flex;
    gap: var(--space-sm);
  }

  .clear-button {
    padding: var(--space-sm);
    background-color: var(--white);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--medium-gray);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-button:hover:not(:disabled) {
    background-color: var(--light-gray);
    color: var(--primary);
  }

  .clear-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .chat-input input {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
  }
  
  .send-button {
    margin-left: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background-color: var(--primary);
    color: var(--white);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .send-button:hover {
    background-color: var(--primary-dark);
  }
  
  .send-button:disabled {
    background-color: var(--medium-gray);
    cursor: not-allowed;
  }
  
  /* Quick Actions */
  .quick-actions {
    margin-bottom: var(--space-xl);
  }
  
  .quick-actions h3 {
    margin-bottom: var(--space-md);
    font-family: var(--font-accent);
    font-size: 1.5rem;
    color: var(--primary-dark);
    position: relative;
    display: inline-block;
  }
  
  .quick-actions h3::after {
    content: "🍴";
    position: absolute;
    right: -30px;
    top: 0;
  }
  
  .quick-actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-md);
  }
  
  .quick-action-button {
    padding: var(--space-md);
    background-color: var(--white);
    border: 2px solid var(--light-gray);
    border-radius: var(--radius-fun);
    text-align: left;
    font-weight: 500;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-fun);
    color: var(--dark);
    position: relative;
    overflow: hidden;
  }
  
  .quick-action-button:nth-child(1)::after { content: "🍗"; }
  .quick-action-button:nth-child(2)::after { content: "🥗"; }
  .quick-action-button:nth-child(3)::after { content: "🧅"; }
  .quick-action-button:nth-child(4)::after { content: "🛒"; }
  
  .quick-action-button::after {
    position: absolute;
    right: 10px;
    bottom: 10px;
    font-size: 20px;
    opacity: 0.7;
    transition: all var(--transition-fast);
  }
  
  .quick-action-button:hover:not(:disabled) {
    background-color: var(--light-gray);
    transform: translateY(-4px) rotate(1deg);
    box-shadow: var(--shadow-pop);
    color: var(--primary);
    border-color: var(--primary-light);
  }
  
  .quick-action-button:hover::after {
    transform: scale(1.3) rotate(10deg);
    opacity: 1;
  }
  
  .quick-action-button::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background-color: var(--primary);
    transform: scaleY(0);
    transition: transform var(--transition-fast);
    transform-origin: bottom;
  }
  
  .quick-action-button:hover::before {
    transform: scaleY(1);
  }
  
  .quick-action-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  /* Recipe Display Styles */
  .recipe-display {
    margin-top: var(--space-md);
    padding: var(--space-lg);
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    border-left: 4px solid var(--primary);
    max-width: 100%;
    overflow: hidden;
  }
  
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .recipe-header h3 {
    margin: 0;
    color: var(--dark);
    font-size: 1.4rem;
    font-weight: 700;
    font-family: var(--font-secondary);
  }
  
  .recipe-servings {
    background-color: var(--primary-light);
    color: var(--white);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-xl);
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .recipe-description {
    font-style: italic;
    color: var(--dark-gray);
    margin-bottom: var(--space-md);
    line-height: 1.6;
  }
  
  .recipe-times {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    padding: var(--space-sm);
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
  }
  
  .recipe-times span {
    font-size: 0.9rem;
  }
  
  .recipe-section {
    margin-bottom: var(--space-lg);
  }
  
  .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
  }
  
  .section-header :global(svg) {
    color: var(--primary);
  }
  
  .section-header h4 {
    margin: 0;
    color: var(--primary);
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .recipe-ingredients {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-md);
  }
  
  .recipe-ingredients li {
    margin-bottom: var(--space-xs);
    line-height: 1.5;
  }
  
  .recipe-steps {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-md);
  }
  
  .recipe-steps li {
    margin-bottom: var(--space-sm);
    line-height: 1.6;
    position: relative;
  }
  
  .step-duration {
    font-size: 0.85rem;
    color: var(--primary);
    font-weight: 500;
    margin-left: var(--space-xs);
  }
  
  .recipe-tools,
  .recipe-methods {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-md);
  }
  
  .recipe-tools li,
  .recipe-methods li {
    margin-bottom: var(--space-xs);
    line-height: 1.5;
  }
  
  .recipe-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .keyword-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .keyword-tag {
    background-color: var(--accent-light);
    color: var(--accent-dark);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-xl);
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .recipe-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  
  .recipe-action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .check-ingredients-btn {
    background-color: var(--accent-light);
    color: var(--accent-dark);
  }
  
  .check-ingredients-btn:hover {
    background-color: var(--accent);
    color: var(--white);
    transform: translateY(-2px);
  }
  
  .add-grocery-btn {
    background-color: var(--primary-light);
    color: var(--white);
  }
  
  .add-grocery-btn:hover {
    background-color: var(--primary);
    transform: translateY(-2px);
  }
  
  .save-note-btn {
    background-color: var(--light-gray);
    color: var(--dark);
  }
  
  .save-note-btn:hover {
    background-color: var(--medium-gray);
    transform: translateY(-2px);
  }
  
  /* Responsive Styles */
  @media (max-width: 768px) {
    .chat-messages {
      min-height: 300px;
    }
    
    .message {
      max-width: 90%;
    }
    
    .recipe-display {
      padding: var(--space-md);
    }
    
    .recipe-header h3 {
      font-size: 1.2rem;
    }
    
    .recipe-actions {
      flex-direction: column;
    }
    
    .recipe-action-btn {
      width: 100%;
    }
    
    .quick-actions-grid {
      grid-template-columns: 1fr;
    }
  }

  .recipe-card {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    margin: var(--space-sm) 0;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--light-gray);
  }

  .recipe-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-md);
  }

  .recipe-title h3 {
    color: var(--dark);
    font-size: 1.4rem;
    margin: 0;
    font-weight: 600;
  }

  .save-indicator {
    background-color: var(--primary-light);
    color: var(--white);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-style: italic;
    font-weight: bold;
  }

  .recipe-description {
    font-style: italic;
    color: var(--dark-gray);
    margin-bottom: var(--space-lg);
  }

  .recipe-section {
    margin-bottom: var(--space-lg);
  }

  .recipe-section h4 {
    color: var(--primary);
    font-size: 1.1rem;
    margin-bottom: var(--space-md);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .recipe-section ul, 
  .recipe-section ol {
    padding-left: var(--space-lg);
    margin: 0;
    list-style-position: outside;
  }

  .recipe-section li {
    margin-bottom: var(--space-sm);
    line-height: 1.5;
  }

  .keyword-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .keyword-tag {
    background-color: var(--accent-light);
    color: var(--accent-dark);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-full);
    font-size: 0.9rem;
  }

  .recipe-actions {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
  }

  .action-button {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    transition: all var(--transition-fast);
    background-color: var(--white);
    border: 1px solid var(--light-gray);
  }

  .action-button.check-ingredients {
    background-color: var(--accent-light);
    color: var(--accent-dark);
  }

  .action-button.save-note {
    background-color: var(--primary-light);
    color: var(--white);
  }

  .action-button.save-recipe {
    background-color: var(--success-light);
    color: var(--success-dark);
  }

  .action-button:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  @media (max-width: 768px) {
    .recipe-card {
      padding: var(--space-md);
    }

    .recipe-title h3 {
      font-size: 1.2rem;
    }

    .recipe-actions {
      flex-direction: column;
    }

    .action-button {
      width: 100%;
    }
  }
  
  /* Ingredient Check Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
    backdrop-filter: blur(3px);
  }
  
  .ingredient-check-modal {
    background: #FFFFFF;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease;
    border: 2px solid var(--primary);
  }
  
  .modal-header {
    background: #FFFFFF;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .modal-header h4 {
    margin: 0;
    color: var(--primary);
    font-size: 1.2rem;
    font-weight: 600;
  }
  
  .close-modal {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--dark-gray);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);
  }
  
  .close-modal:hover {
    background-color: var(--light-gray);
    color: var(--primary);
  }
  
  .modal-content {
    background: #FFFFFF;
    padding: var(--space-md);
  }
  
  .success-message,
  .warning-message {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }
  
  .success-message {
    background-color: var(--success-light);
    color: var(--success-dark);
  }
  
  .warning-message {
    background-color: var(--error-light);
    color: var(--error-dark);
  }
  
  .icon {
    font-size: 1.2rem;
  }
  
  .ingredient-list {
    margin-bottom: var(--space-md);
  }
  
  .ingredient-list h5 {
    margin-top: 0;
    margin-bottom: var(--space-sm);
    color: var(--dark);
    font-size: 1rem;
  }
  
  .ingredient-list ul {
    padding-left: var(--space-lg);
    margin: 0;
  }
  
  .ingredient-list li {
    margin-bottom: var(--space-xs);
    line-height: 1.5;
  }
  
  .ingredient-list.missing h5 {
    color: var(--error);
  }
  
  .make-recipe-btn {
    display: block;
    width: 100%;
    padding: var(--space-md);
    background-color: var(--success);
    color: var(--white);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    margin-top: var(--space-md);
  }
  
  .make-recipe-btn:hover {
    background-color: var(--success-dark);
    transform: translateY(-2px);
  }
  
  .grocery-list-actions {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  
  .grocery-list-btn {
    flex: 1;
    padding: var(--space-md);
    background-color: var(--primary);
    color: var(--white);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
  }
  
  .grocery-list-btn:hover {
    background-color: var(--primary-dark);
    transform: translateY(-2px);
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @media (max-width: 768px) {
    .ingredient-check-modal {
      width: 95%;
      max-height: 90vh;
    }
    
    .grocery-list-actions {
      flex-direction: column;
    }
    
    .grocery-list-btn {
      width: 100%;
    }
  }

  .confirmation-dialog {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    margin: var(--space-md) 0;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--light-gray);
  }

  .confirmation-dialog p {
    margin: 0 0 var(--space-md);
    color: var(--dark);
    font-weight: 500;
  }

  .confirmation-options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .confirmation-option {
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--accent-light);
    color: var(--accent-dark);
    cursor: pointer;
    font-size: 0.9rem;
    transition: all var(--transition-fast);
  }

  .confirmation-option:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  .confirmation-option.custom {
    background-color: var(--primary-light);
    color: var(--white);
  }
  
  /* Recipe Form Styles */
  .recipe-form {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    margin: var(--space-sm) 0;
    border: 1px solid var(--light-gray);
  }
  
  .recipe-form h4 {
    margin-top: 0;
    margin-bottom: var(--space-md);
    color: var(--primary);
    font-size: 1.2rem;
    font-weight: 600;
    text-align: center;
    border-bottom: 1px solid var(--light-gray);
    padding-bottom: var(--space-sm);
  }
  
  .form-section {
    margin-bottom: var(--space-md);
  }
  
  .form-section h5 {
    margin-top: 0;
    margin-bottom: var(--space-sm);
    color: var(--dark);
    font-size: 1rem;
    font-weight: 600;
  }
  
  .checkbox-group, .radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }
  
  .checkbox-label, .radio-label {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .checkbox-label:hover, .radio-label:hover {
    background-color: var(--primary-light);
    color: var(--white);
  }
  
  .checkbox-text, .radio-text {
    font-size: 0.9rem;
  }
  
  .form-actions {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
  }
  
  .form-button {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .form-button.continue {
    background-color: var(--light-gray);
    color: var(--dark);
  }
  
  .form-button.submit {
    background-color: var(--primary);
    color: var(--white);
  }
  
  .form-button:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }
  
  @media (max-width: 768px) {
    .checkbox-group, .radio-group {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .form-actions {
      flex-direction: column;
    }
    
    .form-button {
      width: 100%;
    }
  }
</style>
