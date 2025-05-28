<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import {
    faAngleRight,
    faAngleLeft,
    faUtensils,
    faPlus,
    faEdit,
    faTrashAlt,
    faShoppingBasket,
    faExpand,
    faCompress
  } from "@fortawesome/free-solid-svg-icons";
  import { onMount } from "svelte";
  import StickyNote from "../lib/StickyNote.svelte";
  import ChatArea from "../lib/ChatArea.svelte";
  import { inventoryService, chatHistoryService, userService } from "../lib/services/storageService";
  import type { Recipe, Ingredient, InventoryItem } from "../lib/services/types";

  type Note = {
    id: number;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    minimized: boolean;
    zIndex: number;
  };

  let notes: Note[] = [];
  let nextId = 1;
  let selectedNoteIds: number[] = [];
  let editMode = false;
  let drawerMinimized = false; // State to track drawer minimization
  let inventoryData: InventoryItem[] = [];
  let messages: { text: string; sender: string }[] = [];
  const colorOptions = [
    "var(--note-red)",
    "var(--note-orange)",
    "var(--note-yellow)",
    "var(--note-green)",
    "var(--note-blue)",
    "var(--note-indigo)",
    "var(--note-violet)",
  ];
  $: sidebarWidth = drawerMinimized ? 70 : 250; // Adjusted sidebar width
  $: inventoryInit = false;
  $: isMobile = false; // Will be set on mount based on screen size

  let user_id: string; // Now a UUID
  
  // Chat container properties
  let chatMinimized = false;
  
  // Function to toggle chat minimize/maximize
  function toggleChatMinimize() {
    chatMinimized = !chatMinimized;
  }

  function getUserId() {
    if (typeof document !== "undefined") {
      // Ensure client-side execution
      const match = document.cookie.match(/user_id=([a-f0-9-]+)/);
      return match ? match[1] : generateUserId();
    }
    return "";
  }

  function generateUserId() {
    const newId = crypto.randomUUID(); // Generate a UUID
    document.cookie = `user_id=${newId}; path=/; max-age=31536000`; // 1-year expiration
    return newId;
  }

  function saveNotes() {
    localStorage.setItem("stickyNotes", JSON.stringify(notes));
  }

  function recipeToStickyNote(event: CustomEvent<Recipe>) {
    const recipe = event.detail;
    
    // Ensure all recipe properties exist to prevent undefined errors
    const safeRecipe = {
      ...recipe,
      title: recipe.title || 'Untitled Recipe',
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      tools: recipe.tools || [],
      methods: recipe.methods || [],
      keywords: recipe.keywords || ''
    };
    
    let html = `<b>${safeRecipe.title}</b><br><br>`;
    html += `<i>${safeRecipe.description}</i><br><br>`;

    // Ingredients
    html += `<b>Ingredients:</b><ul>`;
    safeRecipe.ingredients.forEach((ingredient) => {
      html += `<li><b>${ingredient.name || 'Ingredient'}:</b> ${ingredient.amount || 'to taste'}</li>`;
    });
    html += `</ul>`;

    // Steps
    html += `<b>Steps:</b><ul>`;
    safeRecipe.steps.forEach((step) => {
      html += `<li>${step}</li>`;
    });
    html += `</ul>`;

    // Only add tools section if there are tools
    if (safeRecipe.tools.length > 0) {
      html += `<b>Tools:</b><ul>`;
      safeRecipe.tools.forEach((tool) => {
        html += `<li>${tool}</li>`;
      });
      html += `</ul>`;
    }

    // Only add methods section if there are methods
    if (safeRecipe.methods.length > 0) {
      html += `<b>Methods:</b><ul>`;
      safeRecipe.methods.forEach((method) => {
        html += `<li>${method}</li>`;
      });
      html += `</ul>`;
    }

    // Keywords
    if (safeRecipe.keywords) {
      html += `<b>Keywords:</b> <i>${safeRecipe.keywords}</i>`;
    }

    addNote(html);
  }

  // Function to convert inventory to HTML - now using the service
  function inventoryToStickyNote(inv: InventoryItem[]) {
    return inventoryService.inventoryToHtml(inv);
  }

  // Function to bring the clicked note to the front
  function bringToFront(event: CustomEvent<Note>) {
    // Set the zIndex of the clicked note to be higher than others
    const updatedNote = event.detail;
    const unminimizedNotes = notes.filter((note) => !note.minimized);
    // Determine the maximum zIndex based on unminimized notes
    const maxZIndex = unminimizedNotes.length;

    // Update zIndex for the clicked note and reset others
    if (updatedNote.zIndex < maxZIndex) {
      notes = notes.map((note) => {
        if (note.id === updatedNote.id) {
          return { ...note, zIndex: maxZIndex }; // Bring clicked note to front
        } else if (!note.minimized) {
          return { ...note, zIndex: note.zIndex > 1 ? note.zIndex - 1 : 1 }; // Set others to back
        }
        return note; // Return minimized notes unchanged
      });
    }
    console.log(notes);
  }

  function addNote(text: string = "") {
    const unminimizedNotes = notes.filter((note) => !note.minimized);
    // Determine the maximum zIndex based on unminimized notes
    const maxZIndex = unminimizedNotes.length;
    const xPos = Math.random() * 500;
    notes = [
      ...notes,
      {
        id: nextId++,
        text: text,
        x: xPos < sidebarWidth ? sidebarWidth : xPos,
        y: Math.random() * 500,
        width: 200,
        height: 200,
        color: colorOptions[Math.floor(Math.random() * 7)],
        minimized: false,
        zIndex: maxZIndex + 1,
      },
    ];
    saveNotes();
  }

  function updateNote(event: CustomEvent<Note>) {
    const updatedNote = event.detail;
    notes = notes.map((note) =>
      note.id === updatedNote.id ? updatedNote : note
    );
    console.log(notes);
    saveNotes();
  }

  function toggleMinimize(noteId: number) {
    const unminimizedNotes = notes.filter((note) => !note.minimized);
    // Determine the maximum zIndex based on unminimized notes
    const maxZIndex = unminimizedNotes.length;
    notes = notes.map((note) =>
      note.id === noteId
        ? { ...note, minimized: !note.minimized, zIndex: maxZIndex + 1 }
        : note
    );
    saveNotes();
    console.log(notes);
  }

  function deleteSelectedNotes() {
    notes = notes.filter((note) => !selectedNoteIds.includes(note.id));
    selectedNoteIds = [];
    saveNotes();
  }

  function toggleEditMode() {
    editMode = !editMode;
    if (!editMode) {
      selectedNoteIds = [];
    }
  }

  function toggleSelection(noteId: number) {
    if (selectedNoteIds.includes(noteId)) {
      selectedNoteIds = selectedNoteIds.filter((id) => id !== noteId);
    } else {
      selectedNoteIds = [...selectedNoteIds, noteId];
    }
  }

  function extractPlainText(html: string): string {
    const tempElement = document.createElement("div");
    tempElement.innerHTML = html;
    return tempElement.innerText; // Get plain text
  }

  function toggleDrawer() {
    drawerMinimized = !drawerMinimized; // Toggle the drawer state
    const sidebarW = drawerMinimized ? 60 : 210;
    notes = notes.map((note) =>
      note.x < sidebarW ? { ...note, x: sidebarW } : note
    );
  }

  function fetchInventory() {
    if (!user_id) return;

    // Get inventory from localStorage
    inventoryData = inventoryService.getInventory(user_id);
    
    // Update the inventory sticky note
    notes = notes.map((note) =>
      note.id === -1
        ? { ...note, text: inventoryToStickyNote(inventoryData) }
        : note
    );
    
    saveNotes();
  }

  function fetchChatHistory() {
    if (!user_id) return;

    // Get chat history from localStorage
    const history = chatHistoryService.getChatHistory(user_id);
    
    // Convert to the format expected by ChatArea
    messages = [];
    history.forEach(chat => {
      messages.push({ text: chat.message, sender: "You" });
      messages.push({ text: chat.response, sender: "AI" });
    });
    
    console.log(messages);
  }

  // Check if device is mobile
  function checkMobile() {
    isMobile = window.innerWidth <= 768;
    // Auto-minimize drawer on mobile
    if (isMobile && !drawerMinimized) {
      drawerMinimized = true;
    }
  }

  onMount(() => {
    // Get or create user ID
    user_id = getUserId();
    
    // Ensure user exists in localStorage
    userService.getOrCreateUser(user_id);
    
    // Check if device is mobile
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Load saved notes
    const savedNotes = localStorage.getItem("stickyNotes");
    if (savedNotes) {
      notes = JSON.parse(savedNotes);
      nextId = Math.max(...notes.map((n) => n.id).filter(id => id > 0), 0) + 1;
      
      // Update note colors to use CSS variables if they're using hex values
      notes = notes.map(note => {
        // Only update if it's a hex color
        if (note.color.startsWith('#')) {
          const colorMap: {[key: string]: string} = {
            "#FFADAD": "var(--note-red)",
            "#FFD6A5": "var(--note-orange)",
            "#FDFFB6": "var(--note-yellow)",
            "#CAFFBF": "var(--note-green)",
            "#9BF6FF": "var(--note-blue)",
            "#A0C4FF": "var(--note-indigo)",
            "#BDB2FF": "var(--note-violet)"
          };
          return {
            ...note,
            color: colorMap[note.color.toUpperCase()] || note.color
          };
        }
        return note;
      });
      saveNotes();
    }
    
    // Check for inventory note
    const inventoryNote = notes.find((item: Note) => item.id == -1);
    if (!inventoryNote) {
      // Create inventory note if it doesn't exist
      const newNote: Note = {
        id: -1,
        text: "Inventory",
        x: 375,
        y: 239,
        width: 366,
        height: 332,
        color: "var(--note-red)",
        minimized: true,
        zIndex: 1,
      };
      notes.push(newNote);
      saveNotes();
    }
    
    // Load inventory and chat history from localStorage
    fetchInventory();
    fetchChatHistory();
    
    // Scroll chat to bottom
    setTimeout(() => {
      const chatContainer = document.getElementById("chat-container");
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
    
    // Clean up event listeners on component destruction
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });
</script>

<div class="app-container">
  <!-- Sidebar -->
  <div class="drawer {drawerMinimized ? 'minimized' : ''}">
    <div class="header">
      <button
        on:click={toggleDrawer}
        class="toggle-drawer-btn {drawerMinimized ? 'minimized' : ''}"
        aria-label="Toggle sidebar"
      >
        <FontAwesomeIcon icon={drawerMinimized ? faAngleRight : faAngleLeft} />
      </button>
      {#if !drawerMinimized}
        <div class="logo-container">
          <FontAwesomeIcon icon={faUtensils} class="logo-icon" />
          <span class="title">Plates</span>
        </div>
      {/if}
    </div>
    
    {#if !drawerMinimized}
      <div class="button-container">
        <button class="action-btn add-note-btn" on:click={() => addNote()}>
          <FontAwesomeIcon icon={faPlus} />
          <span>Add Note</span>
        </button>
        <button class="action-btn edit-notes-btn" on:click={toggleEditMode}>
          <FontAwesomeIcon icon={faEdit} />
          <span>{editMode ? "Done" : "Edit Notes"}</span>
        </button>
        {#if editMode}
          <button
            class="action-btn delete-notes-btn"
            on:click={deleteSelectedNotes}
            disabled={selectedNoteIds.length === 0}
          >
            <FontAwesomeIcon icon={faTrashAlt} />
            <span>Delete {selectedNoteIds.length ? `(${selectedNoteIds.length})` : ''}</span>
          </button>
        {/if}
      </div>
      
      <div class="drawer-section">
        <h3 class="section-title">My Notes</h3>
        <div class="minimized-grid">
          {#each notes.filter((n) => n.minimized && n.id != -1) as note}
            <div
              class="note-card {editMode ? 'wiggle' : ''} {selectedNoteIds.includes(
                note.id
              )
                ? 'selected'
                : ''}"
              on:click={() => {
                if (editMode) toggleSelection(note.id);
                else toggleMinimize(note.id);
              }}
              style="background-color: {note.color}"
            >
              <span class="note-preview">
                {extractPlainText(note.text).slice(0, 15) +
                  (extractPlainText(note.text).length > 15 ? "..." : "")}
              </span>
            </div>
          {/each}
          
          {#if notes.filter((n) => n.minimized && n.id != -1).length === 0}
            <div class="empty-state">
              <p>No saved notes yet</p>
            </div>
          {/if}
        </div>
      </div>
      
      {#each notes.filter((n) => n.minimized && n.id == -1) as note}
        <div class="inventory-card"
          on:click={() => toggleMinimize(note.id)}
          style="background-color: {note.color};"
        >
          <FontAwesomeIcon icon={faShoppingBasket} />
          <span>Inventory</span>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Main content area -->
  <div class="main-content" style="margin-left: {sidebarWidth}px;">
    <!-- Notes layer -->
    <div class="notes-layer">
      {#each notes as note}
        {#if !note.minimized}
          <StickyNote
            bind:note
            on:update={updateNote}
            on:bringToFront={bringToFront}
            {sidebarWidth}
            {user_id}
          />
        {/if}
      {/each}
    </div>
    
    <!-- Chat layer -->
    <div class="chat-layer {chatMinimized ? 'minimized' : ''}">
      <div class="chat-header">
        <span class="chat-title">Recipe Assistant</span>
        <button class="chat-control-btn" on:click={toggleChatMinimize} aria-label="Toggle chat">
          <FontAwesomeIcon icon={chatMinimized ? faExpand : faCompress} />
        </button>
      </div>
      
      {#if !chatMinimized}
        <div class="chat-content">
          <ChatArea
            on:addNote={recipeToStickyNote}
            on:fetchInventory={fetchInventory}
            on:addGroceryList={(event) => addNote(event.detail)}
            {messages}
            {user_id}
          />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }
  
  /* Drawer Styles */
  .drawer {
    width: 250px;
    height: 100vh;
    position: fixed;
    left: 0;
    top: 0;
    background: linear-gradient(to bottom, var(--dark), #1a1a1a);
    box-shadow: var(--shadow-lg);
    overflow-y: auto;
    padding: var(--space-md);
    z-index: 1000;
    transition: width var(--transition-normal);
    display: flex;
    flex-direction: column;
  }

  .drawer.minimized {
    width: 70px;
    padding: var(--space-sm);
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .logo-container {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .logo-icon {
    color: var(--primary);
    font-size: 1.5rem;
  }

  .title {
    font-size: 1.8rem;
    font-weight: bold;
    font-family: var(--font-accent);
    color: var(--white);
    white-space: nowrap;
  }

  .toggle-drawer-btn {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--white);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-xs);
    border-radius: var(--radius-round);
    width: 32px;
    height: 32px;
  }

  .toggle-drawer-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }

  .toggle-drawer-btn.minimized {
    transform: rotate(180deg);
  }

  .button-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .action-btn {
    padding: var(--space-sm) var(--space-md);
    border: none;
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--white);
    font-size: 0.9rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    transition: all var(--transition-fast);
  }

  .action-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .action-btn:active {
    transform: translateY(0);
  }

  .add-note-btn {
    background-color: var(--primary);
    color: var(--white);
  }

  .add-note-btn:hover {
    background-color: var(--primary-dark);
  }

  .delete-notes-btn {
    background-color: rgba(239, 71, 111, 0.2);
    color: var(--white);
  }

  .delete-notes-btn:hover {
    background-color: rgba(239, 71, 111, 0.3);
  }

  .delete-notes-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .drawer-section {
    margin-bottom: var(--space-lg);
    flex: 1;
  }

  .section-title {
    color: var(--medium-gray);
    font-size: 0.9rem;
    margin-bottom: var(--space-sm);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }

  .minimized-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    overflow-y: auto;
    max-height: calc(100vh - 300px);
    padding-right: var(--space-xs);
  }

  .minimized-grid::-webkit-scrollbar {
    width: 4px;
  }

  .minimized-grid::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
  }

  .note-card {
    display: flex;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    text-align: left;
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
    border: 1px solid rgba(0, 0, 0, 0.1);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    font-size: 0.9rem;
    color: var(--dark);
  }

  .note-preview {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .note-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .wiggle {
    animation: wiggle 0.3s ease infinite alternate;
  }

  @keyframes wiggle {
    0% {
      transform: rotate(-1deg);
    }
    100% {
      transform: rotate(1deg);
    }
  }

  .selected {
    border: 2px solid var(--primary);
    box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.3);
  }

  .inventory-card {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    background-color: var(--note-red);
    color: var(--dark);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
    margin-top: auto;
  }

  .inventory-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .empty-state {
    padding: var(--space-md);
    text-align: center;
    color: var(--medium-gray);
    font-style: italic;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
  }

  /* Main Content Area */
  .main-content {
    flex: 1;
    height: 100vh;
    position: relative;
    background-color: var(--off-white);
    background-image: 
      radial-gradient(circle at 25px 25px, rgba(0, 0, 0, 0.02) 2%, transparent 2%),
      radial-gradient(circle at 75px 75px, rgba(0, 0, 0, 0.02) 2%, transparent 2%);
    background-size: 100px 100px;
    transition: margin-left var(--transition-normal);
  }
  
  /* Notes Layer */
  .notes-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    pointer-events: none; /* Let clicks pass through to chat layer */
  }
  
  /* This ensures sticky notes are clickable */
  .notes-layer :global(.sticky-note) {
    pointer-events: auto;
  }
  
  /* Chat Layer */
  .chat-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    background-color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(5px);
  }
  
  .chat-layer.minimized {
    top: auto;
    height: 60px;
    background-color: transparent;
  }
  
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) var(--space-lg);
    background-color: var(--primary);
    color: var(--white);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-md);
  }
  
  .chat-layer.minimized .chat-header {
    background-color: rgba(255, 107, 107, 0.9);
    backdrop-filter: blur(5px);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: var(--shadow-lg);
    margin: 0 var(--space-md);
  }
  
  .chat-title {
    font-weight: 600;
    font-size: 1rem;
  }
  
  .chat-control-btn {
    background: transparent;
    border: none;
    color: var(--white);
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-round);
    transition: all var(--transition-fast);
  }
  
  .chat-control-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .chat-content {
    flex: 1;
    overflow: hidden;
    padding: var(--space-md);
  }
  
  /* Media Queries for Responsive Design */
  @media (max-width: 992px) {
    .drawer {
      width: 220px;
    }
    
    .drawer.minimized {
      width: 60px;
    }
  }
  
  @media (max-width: 768px) {
    .drawer {
      width: 200px;
    }
    
    .drawer.minimized {
      width: 50px;
      padding: var(--space-xs);
    }
    
    .title {
      font-size: 1.5rem;
    }
    
    .action-btn {
      font-size: 0.85rem;
      padding: var(--space-xs) var(--space-sm);
    }
    
    .toggle-drawer-btn {
      width: 28px;
      height: 28px;
    }
  }
  
  @media (max-width: 576px) {
    .drawer {
      width: 180px;
    }
    
    .drawer.minimized {
      width: 40px;
    }
    
    .title {
      font-size: 1.3rem;
    }
    
    .section-title {
      font-size: 0.8rem;
    }
    
    .note-card {
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.8rem;
    }
    
    .inventory-card {
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.8rem;
    }
    
    .chat-layer.minimized {
      height: 50px;
    }
  }
</style>
