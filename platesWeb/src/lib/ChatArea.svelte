<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { aiService } from "./services/aiService";
  import { chatHistoryService, inventoryService, userService } from "./services/storageService";
  import type { ChatRequest, Recipe } from "./services/types";
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import {
    faPaperPlane,
    faTrashAlt,
    faCheck,
    faSave,
    faUtensils,
    faListOl,
    faTools,
    faBook,
    faTags,
    faSpinner,
    faTimes,
    faLightbulb,
    faShoppingBasket
  } from "@fortawesome/free-solid-svg-icons";
  
  // Mobile detection
  let isMobile = false; // Will be set on mount based on screen size
  
  // Tutorial popup state
  let showTutorial = false;
  
  // Check if device is mobile
  function checkMobile() {
    isMobile = window.innerWidth <= 768;
  }
  
  // Close tutorial function
  function closeTutorial() {
    showTutorial = false;
    localStorage.setItem("hasSeenTutorial", "true");
  }

  let newMessage = "";
  export let messages: { text: string; sender: string; recipe?: Recipe; showSaveOption?: boolean }[] = [];
  export let user_id: string;
  const dispatch = createEventDispatcher();
  let chatMessages: HTMLDivElement | null = null;
  let lastAIResponse = ""; // Store the last AI response for question handling
  let pendingRecipe: Recipe | null = null; // Store recipe waiting for save confirmation
  let savedRecipeId: number | null = null; // Track which recipe was just saved
  let showSaveConfirmation = false; // Control visibility of save confirmation
  let showIngredientCheck = false; // Control visibility of ingredient check
  let currentRecipeCheck: { 
    recipe: Recipe; 
    hasAllIngredients: boolean;
    missingIngredients: { name: string; amount: string }[];
    availableIngredients: { name: string; amount: string }[];
  } | null = null;
  
  // Function to handle saving recipe to sticky note
  function saveRecipe(event: Event, recipe: Recipe) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      // Dispatch the recipe to create a sticky note
      dispatch("addNote", recipe);
      
      // Update the message to show a collapsed version instead of hiding it
      messages = messages.map(msg => {
        if (msg.recipe && msg.recipe.id === recipe.id) {
          return { 
            ...msg, 
            showSaveOption: false,
            recipe: {
              ...msg.recipe,
              saved: true // Mark as saved to show snippet instead
            }
          };
        }
        return msg;
      });
      
      // Show save confirmation
      savedRecipeId = recipe.id;
      showSaveConfirmation = true;
      
      // Hide confirmation after 3 seconds
      setTimeout(() => {
        showSaveConfirmation = false;
      }, 3000);
    }
  }

  async function sendMessage() {
    if (newMessage.trim()) {
      const userMessage = newMessage;
      messages = [...messages, { text: userMessage, sender: "You" }];
      newMessage = "";
      scrollToBottom();

      try {
        // Ensure user exists in local storage
        userService.getOrCreateUser(user_id);
        
        // Create chat request
        const request: ChatRequest = {
          user_id,
          message: userMessage
        };
        
        // Check if this is a response to a question
        let data;
        const lastMessage = messages.filter(m => m.sender === "AI").pop();
        
        if (lastMessage && lastAIResponse) {
          // Handle as a question-answer flow
          data = await aiService.handleQuestion(userMessage, lastAIResponse, user_id);
        } else {
          // Get inventory for context if needed
          const inventory = inventoryService.getInventory(user_id);
          
          // Check if we should include inventory context
          if (userMessage.toLowerCase().includes("inventory") || 
              userMessage.toLowerCase().includes("ingredients") ||
              userMessage.toLowerCase().includes("what can i make")) {
            data = await aiService.generateResponseWithInventory(request, inventory);
          } else {
            data = await aiService.generateResponse(request);
          }
        }

        // Save the AI response for potential question handling
        lastAIResponse = data.ai_response;
        
        // Save chat message to history
        if (data.intent !== "unknown" && data.intent !== "question") {
          chatHistoryService.saveChatMessage(userMessage, data.ai_response, user_id);
        }

        try {
          // Handle different intents
          if ((data.intent === "search_recipe" || data.intent === "search_with_inventory" || data.intent === "save_recipe") && data.recipe) {
            // Ensure recipe has all required properties to prevent errors
            const safeRecipe = {
              ...data.recipe,
              id: data.recipe.id || Date.now(),
              user_id: data.recipe.user_id || user_id,
              created_at: data.recipe.created_at || new Date().toISOString(),
              title: data.recipe.title || 'Untitled Recipe',
              description: data.recipe.description || '',
              ingredients: data.recipe.ingredients || [],
              steps: data.recipe.steps || [],
              tools: data.recipe.tools || [],
              methods: data.recipe.methods || [],
              keywords: data.recipe.keywords || ''
            };
            
            // Store the recipe in the message for display and add save option
            messages = [...messages, { 
              text: data.ai_response, 
              sender: "AI", 
              recipe: safeRecipe,
              showSaveOption: true 
            }];
            
            // Store the pending recipe for potential saving
            pendingRecipe = safeRecipe;
          } else if (data.intent === "save_inventory" && data.recipe && data.recipe.ingredients) {
            // Update inventory in localStorage
            const items = data.recipe.ingredients.map(ing => ({
              user_id,
              ingredient_name: ing.name || 'Unknown ingredient',
              amount: ing.amount || 'Unknown amount'
            }));
            
            inventoryService.updateInventory(items, user_id);
            dispatch("fetchInventory");
            
            // Add the response message
            messages = [...messages, { text: data.ai_response, sender: "AI" }];
          } else if (data.intent === "remove_inventory" && data.recipe && data.recipe.ingredients) {
            // Remove items from inventory
            const items = data.recipe.ingredients.map(ing => ({
              user_id,
              ingredient_name: ing.name || 'Unknown ingredient',
              amount: "-1" // Mark for removal
            }));
            
            inventoryService.updateInventory(items, user_id);
            dispatch("fetchInventory");
            
            // Add the response message
            messages = [...messages, { text: data.ai_response, sender: "AI" }];
          } else {
            // Regular message without recipe
            messages = [...messages, { text: data.ai_response, sender: "AI" }];
          }
          scrollToBottom();
        } catch (error) {
          console.error("Error processing AI response:", error);
          messages = [...messages, { 
            text: "I received a response but had trouble processing it. Please try again or rephrase your question.", 
            sender: "System" 
          }];
          scrollToBottom();
        }
      } catch (error) {
        console.error("Error sending message:", error);
        messages = [...messages, { text: "Error: Unable to get a response.", sender: "System" }];
        scrollToBottom();
      }
    }
  }

  function clearMessages() {
    messages = [];
    chatHistoryService.clearChatHistory(user_id);
    showTutorial = true; // Show tutorial when chat is cleared
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 0);
  }

  onMount(() => {
    // Check if device is mobile
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Load chat history from localStorage
    const history = chatHistoryService.getChatHistory(user_id);
    
    if (history.length > 0 && messages.length === 0) {
      // Convert chat history to messages format
      const loadedMessages: { text: string; sender: string }[] = [];
      
      history.forEach(chat => {
        loadedMessages.push({ text: chat.message, sender: "You" });
        loadedMessages.push({ text: chat.response, sender: "AI" });
        
        // Update last AI response
        lastAIResponse = chat.response;
      });
      
      messages = loadedMessages;
    }
    
    // Check if user has seen tutorial
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    showTutorial = !hasSeenTutorial || messages.length === 0;
    
    scrollToBottom();
    
    // Clean up event listeners on component destruction
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });
</script>

<div class="chat-area">
  {#if showTutorial}
    <div class="tutorial-popup">
      <div class="tutorial-content">
        <div class="tutorial-header">
          <FontAwesomeIcon icon={faLightbulb} />
          <h4>PlatesAI Tips</h4>
        </div>
        <p>Try asking:</p>
        <ul>
          <li>"What can I make with chicken and pasta?"</li>
          <li>"Show me a vegetarian dinner recipe"</li>
          <li>"Update my inventory with tomatoes, onions, and garlic"</li>
          <li>"What can I cook with my current inventory?"</li>
        </ul>
      </div>
      <button class="close-tutorial" on:click={closeTutorial} aria-label="Close tutorial">
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  {/if}
  
  {#if showSaveConfirmation}
    <div class="save-confirmation">
      <span class="confirmation-icon">
        <FontAwesomeIcon icon={faCheck} />
      </span>
      <span>Recipe saved to sticky note!</span>
    </div>
  {/if}
  
  <div class="chat-messages" id="chat-container" bind:this={chatMessages}>
    {#each messages as message}
      <div class="message {message.sender === 'You' ? 'user' : 'ai'}">
        {message.text}
        
        {#if message.recipe && (message.showSaveOption || message.recipe.saved)}
          <div class="recipe-display {message.recipe.saved ? 'saved-recipe' : ''}">
            <div class="recipe-header">
              <h3>{message.recipe.title}</h3>
              <div class="recipe-servings">{message.recipe.servings}</div>
            </div>
            <p class="recipe-description">{message.recipe.description}</p>
            
            <div class="recipe-section">
              <div class="section-header">
                <FontAwesomeIcon icon={faUtensils} />
                <h4>Ingredients</h4>
              </div>
              <ul class="recipe-ingredients">
                {#each message.recipe.ingredients as ingredient}
                  <li><strong>{ingredient.name}:</strong> {ingredient.amount}</li>
                {/each}
              </ul>
            </div>
            
            <div class="recipe-section">
              <div class="section-header">
                <FontAwesomeIcon icon={faListOl} />
                <h4>Steps</h4>
              </div>
              <ol class="recipe-steps">
                {#each message.recipe.steps as step}
                  <li>{step}</li>
                {/each}
              </ol>
            </div>
            
            {#if message.recipe.tools && message.recipe.tools.length > 0}
              <div class="recipe-section">
                <div class="section-header">
                  <FontAwesomeIcon icon={faTools} />
                  <h4>Tools</h4>
                </div>
                <ul class="recipe-tools">
                  {#each message.recipe.tools as tool}
                    <li>{tool}</li>
                  {/each}
                </ul>
              </div>
            {/if}
            
            {#if message.recipe.methods && message.recipe.methods.length > 0}
              <div class="recipe-section">
                <div class="section-header">
                  <FontAwesomeIcon icon={faBook} />
                  <h4>Methods</h4>
                </div>
                <ul class="recipe-methods">
                  {#each message.recipe.methods as method}
                    <li>{method}</li>
                  {/each}
                </ul>
              </div>
            {/if}
            
            {#if message.recipe.keywords}
              <div class="recipe-section">
                <div class="section-header">
                  <FontAwesomeIcon icon={faTags} />
                  <h4>Keywords</h4>
                </div>
                <div class="recipe-keywords">
                  <div class="keyword-tags">
                    {#each message.recipe.keywords.split(',') as keyword}
                      <span class="keyword-tag">{keyword.trim()}</span>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
            
            <div class="recipe-actions">
              <!-- Ingredient Check Button -->
              <button 
                class="check-ingredients-btn"
                on:click={() => {
                  // Check if user has all ingredients
                  const result = inventoryService.checkRecipeIngredients(message.recipe as Recipe, user_id);
                  currentRecipeCheck = {
                    recipe: message.recipe as Recipe,
                    ...result
                  };
                  showIngredientCheck = true;
                }}
              >
                <FontAwesomeIcon icon={faUtensils} />
                <span>Check Ingredients</span>
              </button>
              
              <!-- Save Recipe Button -->
              <label class="save-label">
                <input type="checkbox" on:change={(e) => saveRecipe(e, message.recipe as Recipe)} />
                <span class="save-icon">
                  <FontAwesomeIcon icon={faSave} />
                </span>
                <span>Save to sticky note</span>
              </label>
            </div>
            
            <!-- Ingredient Check Modal -->
            {#if showIngredientCheck && currentRecipeCheck && currentRecipeCheck.recipe.id === message.recipe.id}
              <div class="ingredient-check-modal">
                <div class="modal-header">
                  <h4>Ingredient Check for {currentRecipeCheck.recipe.title}</h4>
                  <button class="close-modal" on:click={() => showIngredientCheck = false}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
                
                <div class="modal-content">
                  {#if currentRecipeCheck && currentRecipeCheck.hasAllIngredients}
                    <div class="success-message">
                      <FontAwesomeIcon icon={faCheck} />
                      <span>You have all the ingredients needed!</span>
                    </div>
                    
                    <div class="ingredient-list">
                      <h5>Available Ingredients:</h5>
                      <ul>
                        {#each currentRecipeCheck?.availableIngredients || [] as ingredient}
                          <li><strong>{ingredient.name}:</strong> {ingredient.amount}</li>
                        {/each}
                      </ul>
                    </div>
                    
                    <button 
                      class="make-recipe-btn"
                      on:click={() => {
                        // Subtract ingredients from inventory
                        if (currentRecipeCheck) {
                          inventoryService.subtractRecipeIngredients(currentRecipeCheck.recipe, user_id);
                          // Update inventory display
                          dispatch("fetchInventory");
                          // Show confirmation
                          messages = [...messages, { 
                            text: `I've updated your inventory after making ${currentRecipeCheck.recipe.title}. The ingredients have been subtracted from your inventory.`, 
                            sender: "AI" 
                          }];
                        }
                        // Close modal
                        showIngredientCheck = false;
                        // Scroll to bottom
                        scrollToBottom();
                      }}
                    >
                      I made this recipe!
                    </button>
                  {:else}
                    <div class="warning-message">
                      <FontAwesomeIcon icon={faTimes} />
                      <span>You're missing some ingredients.</span>
                    </div>
                    
                    {#if currentRecipeCheck && currentRecipeCheck.availableIngredients.length > 0}
                      <div class="ingredient-list">
                        <h5>Available Ingredients:</h5>
                        <ul>
                          {#each currentRecipeCheck.availableIngredients as ingredient}
                            <li><strong>{ingredient.name}:</strong> {ingredient.amount}</li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
                    
                    <div class="ingredient-list missing">
                      <h5>Missing Ingredients:</h5>
                      <ul>
                        {#each currentRecipeCheck && currentRecipeCheck.missingIngredients || [] as ingredient}
                          <li><strong>{ingredient.name}:</strong> {ingredient.amount}</li>
                        {/each}
                      </ul>
                    </div>
                    
                    <div class="grocery-list-actions">
                      <button 
                        class="grocery-list-btn"
                        on:click={() => {
                          // Add missing ingredients to chat as a grocery list
                          if (currentRecipeCheck) {
                            let groceryListText = `Here's your grocery list for ${currentRecipeCheck.recipe.title}:\n\n`;
                            currentRecipeCheck.missingIngredients.forEach(ingredient => {
                              groceryListText += `• ${ingredient.name}: ${ingredient.amount}\n`;
                            });
                            
                            messages = [...messages, { 
                              text: groceryListText, 
                              sender: "AI" 
                            }];
                          }
                          
                          // Close modal
                          showIngredientCheck = false;
                          // Scroll to bottom
                          scrollToBottom();
                        }}
                      >
                        Show in Chat
                      </button>
                      
                      <button 
                        class="grocery-list-sticky-btn"
                        on:click={() => {
                          // Create a grocery list sticky note
                          if (currentRecipeCheck) {
                            let groceryListTitle = `Grocery List for ${currentRecipeCheck.recipe.title}`;
                            let groceryListContent = `<b>${groceryListTitle}</b><br><br><ul>`;
                            
                            currentRecipeCheck.missingIngredients.forEach(ingredient => {
                              groceryListContent += `<li><b>${ingredient.name}:</b> ${ingredient.amount}</li>`;
                            });
                            
                            groceryListContent += `</ul>`;
                            
                            // Dispatch event to create sticky note
                            dispatch("addGroceryList", groceryListContent);
                          }
                          
                          // Close modal
                          showIngredientCheck = false;
                        }}
                      >
                        <FontAwesomeIcon icon={faShoppingBasket} />
                        <span>Save to Sticky Note</span>
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="input-container">
    <input
      type="text"
      bind:value={newMessage}
      on:keydown={(e) => e.key === "Enter" ? sendMessage() : null}
      placeholder="Type your message..."
      class="chat-input"
    />
    <button on:click={sendMessage} class="send-btn" aria-label="Send message">
      <FontAwesomeIcon icon={faPaperPlane} />
    </button>
    <button on:click={clearMessages} class="clear-btn" aria-label="Clear chat history">
      <FontAwesomeIcon icon={faTrashAlt} />
    </button>
  </div>
</div>

<style>
  .chat-area {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
  }
  
  .tutorial-popup {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background-color: var(--accent-light);
    border-bottom: 2px solid var(--accent);
    padding: var(--space-sm) var(--space-md);
    z-index: 20;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    box-shadow: var(--shadow-md);
    animation: slideDown var(--transition-normal);
  }
  
  .tutorial-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-bottom: var(--space-xs);
    color: var(--primary-dark);
  }
  
  .tutorial-header h4 {
    margin: 0;
    font-weight: 600;
  }
  
  .tutorial-content {
    font-size: 0.9rem;
  }
  
  .tutorial-content p {
    margin-bottom: var(--space-xs);
  }
  
  .tutorial-content ul {
    margin-bottom: var(--space-xs);
    padding-left: var(--space-lg);
  }
  
  .tutorial-content li {
    margin-bottom: var(--space-xs);
    font-style: italic;
  }
  
  .close-tutorial {
    position: absolute;
    top: var(--space-xs);
    right: var(--space-xs);
    font-size: 1.2rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--dark);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-round);
    transition: all var(--transition-fast);
  }
  
  .close-tutorial:hover {
    background-color: rgba(0, 0, 0, 0.1);
    transform: scale(1.1);
  }
  
  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    max-height: calc(100% - 80px);
    min-height: 200px;
  }

  /* Custom Scrollbar */
  .chat-messages::-webkit-scrollbar {
    width: 6px;
  }
  
  .chat-messages::-webkit-scrollbar-track {
    background: var(--light-gray);
    border-radius: var(--radius-md);
  }
  
  .chat-messages::-webkit-scrollbar-thumb {
    background: var(--medium-gray);
    border-radius: var(--radius-md);
  }
  
  .chat-messages::-webkit-scrollbar-thumb:hover {
    background: var(--dark-gray);
  }

  .message {
    margin: var(--space-xs) 0;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-lg);
    max-width: 80%;
    word-wrap: break-word;
    box-shadow: var(--shadow-sm);
    animation: fadeIn var(--transition-normal);
    line-height: 1.5;
  }

  .user {
    background-color: var(--primary);
    color: var(--white);
    align-self: flex-end;
    text-align: right;
    border-bottom-right-radius: var(--radius-sm);
  }

  .ai {
    background-color: var(--light-gray);
    color: var(--dark);
    align-self: flex-start;
    text-align: left;
    border-bottom-left-radius: var(--radius-sm);
  }

  .input-container {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
    padding: var(--space-md);
  }

  .chat-input {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-xl);
    border: 1px solid var(--light-gray);
    box-sizing: border-box;
    font-size: 1rem;
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
    font-family: var(--font-primary);
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.2);
  }

  .send-btn, .clear-btn {
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-round);
    transition: all var(--transition-fast);
    color: var(--dark-gray);
  }

  .send-btn {
    color: var(--primary);
    background-color: var(--primary-light);
    color: var(--white);
  }

  .clear-btn {
    color: var(--error);
  }

  .send-btn:hover, .clear-btn:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-sm);
  }

  .send-btn:active, .clear-btn:active {
    transform: scale(0.95);
  }
  
  /* Recipe display styling */
  .recipe-display {
    margin-top: var(--space-md);
    padding: var(--space-lg);
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    transition: all var(--transition-normal);
    border-left: 4px solid var(--primary);
    overflow: hidden;
  }
  
  /* Saved recipe styling (more compact) */
  .recipe-display.saved-recipe {
    padding: var(--space-md);
    background-color: rgba(255, 255, 255, 0.8);
    border-left: 4px solid var(--accent);
  }
  
  .saved-recipe .recipe-section:not(:first-child) {
    display: none; /* Hide all sections except the first one (ingredients) */
  }
  
  .saved-recipe .recipe-description {
    display: none; /* Hide description in saved recipes */
  }
  
  .saved-recipe .recipe-ingredients li {
    margin-bottom: 2px; /* Reduce spacing between ingredients */
  }
  
  .saved-recipe .recipe-header {
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-xs);
  }
  
  .saved-recipe .recipe-header h3 {
    font-size: 1.1rem;
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
    margin-bottom: var(--space-lg);
    line-height: 1.6;
    font-size: 0.95rem;
  }
  
  .recipe-section {
    margin-bottom: var(--space-lg);
    animation: fadeIn var(--transition-normal);
  }
  
  .section-header {
    display: flex;
    align-items: center;
    margin-bottom: var(--space-sm);
    gap: var(--space-xs);
  }
  
  .section-header :global(svg) {
    color: var(--primary);
  }
  
  .section-header h4 {
    color: var(--primary);
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    font-family: var(--font-secondary);
  }
  
  .recipe-ingredients {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-xs);
  }
  
  .recipe-ingredients li {
    margin-bottom: var(--space-xs);
    line-height: 1.5;
    position: relative;
  }
  
  .recipe-ingredients li strong {
    color: var(--dark);
    font-weight: 600;
  }
  
  .recipe-steps {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-xs);
    counter-reset: step-counter;
  }
  
  .recipe-steps li {
    margin-bottom: var(--space-sm);
    line-height: 1.6;
    position: relative;
    padding-left: var(--space-xs);
  }
  
  .recipe-tools,
  .recipe-methods {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-xs);
  }
  
  .recipe-tools li,
  .recipe-methods li {
    margin-bottom: var(--space-xs);
    line-height: 1.5;
  }
  
  /* Recipe keywords styling */
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
  
  /* Recipe actions styling */
  .recipe-actions {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-md);
    flex-wrap: wrap;
  }
  
  .check-ingredients-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
    background-color: var(--accent-light);
    color: var(--accent-dark);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .check-ingredients-btn:hover {
    background-color: var(--accent);
    color: var(--white);
    transform: translateY(-2px);
  }
  
  .save-label {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
    background-color: var(--primary-light);
    color: var(--white);
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .save-label:hover {
    background-color: var(--primary);
    transform: translateY(-2px);
  }
  
  .save-label input[type="checkbox"] {
    display: none;
  }
  
  /* Ingredient check modal styling */
  .ingredient-check-modal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    padding: var(--space-lg);
    width: 90%;
    max-width: 500px;
    max-height: 80%;
    overflow-y: auto;
    z-index: 100;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .modal-header h4 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--dark);
  }
  
  .close-modal {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--dark-gray);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-round);
    transition: all var(--transition-fast);
  }
  
  .close-modal:hover {
    background-color: rgba(0, 0, 0, 0.1);
    transform: scale(1.1);
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
    background-color: rgba(0, 200, 83, 0.1);
    color: #00c853;
  }
  
  .warning-message {
    background-color: rgba(255, 87, 34, 0.1);
    color: #ff5722;
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
  }
  
  .ingredient-list li {
    margin-bottom: var(--space-xs);
  }
  
  .ingredient-list.missing h5 {
    color: #ff5722;
  }
  
  .make-recipe-btn {
    display: block;
    width: 100%;
    padding: var(--space-sm);
    background-color: var(--accent);
    color: var(--white);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    margin-top: var(--space-md);
  }
  
  .make-recipe-btn:hover {
    background-color: var(--accent-dark);
    transform: translateY(-2px);
  }
  
  .grocery-list-actions {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    flex-wrap: wrap;
  }
  
  .grocery-list-btn,
  .grocery-list-sticky-btn {
    flex: 1;
    padding: var(--space-sm);
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
  
  .grocery-list-btn {
    background-color: var(--light-gray);
    color: var(--dark);
  }
  
  .grocery-list-sticky-btn {
    background-color: var(--primary);
    color: var(--white);
  }
  
  .grocery-list-btn:hover,
  .grocery-list-sticky-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }
  
  .save-confirmation {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--accent);
    color: var(--white);
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    animation: fadeInUp var(--transition-normal);
  }
  
  .confirmation-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-round);
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeInUp {
    from { 
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to { 
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
  
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .message {
      max-width: 90%;
    }
    
    .recipe-display {
      padding: var(--space-md);
    }
    
    .recipe-header h3 {
      font-size: 1.2rem;
    }
    
    .section-header h4 {
      font-size: 1rem;
    }
    
    .recipe-actions {
      flex-direction: column;
      gap: var(--space-sm);
    }
    
    .check-ingredients-btn, .save-label {
      width: 100%;
      justify-content: center;
    }
    
    .ingredient-check-modal {
      width: 95%;
      padding: var(--space-md);
    }
  }
</style>
