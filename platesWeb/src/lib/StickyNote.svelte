<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { inventoryService, userService } from "./services/storageService";
  import { aiService } from "./services/aiService";
  import type { InventoryItem } from "./services/types";
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import { 
    faBold, 
    faItalic, 
    faUnderline, 
    faStrikethrough, 
    faList, 
    faMinimize,
    faMaximize,
    faShoppingBasket
  } from "@fortawesome/free-solid-svg-icons";

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

  const dispatch = createEventDispatcher();
  export let note: Note;
  export let sidebarWidth: number;
  export let user_id: string;

  let isResizing = false;
  let isDragging = false;
  let startX = 0,
    startY = 0,
    startWidth = 0,
    startHeight = 0,
    offsetX = 0,
    offsetY = 0;

  let showColors = false; // For toggling color options visibility
  let isEditing = false; // To track if the note is focused for editing
  let inventoryData: InventoryItem[] = [];
  let isRecipe = false; // To track if the note contains a recipe
  let isInventory = note.id === -1; // To track if the note is the inventory note
  let isMobile = false; // Will be set on mount based on screen size
  
  // Check if device is mobile
  function checkMobile() {
    isMobile = window.innerWidth <= 768;
  }
  
  // On mount, check if mobile and add resize listener
  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });

  // Define the color options
  const colorOptions = [
    "var(--note-red)",
    "var(--note-orange)",
    "var(--note-yellow)",
    "var(--note-green)",
    "var(--note-blue)",
    "var(--note-indigo)",
    "var(--note-violet)",
  ];

  function minimizeNote() {
    note = { ...note, minimized: !note.minimized, zIndex: 1 };
    dispatch("update", note);
  }

  // Function to convert inventory to HTML - now using the service
  function inventoryToStickyNote(inv: InventoryItem[]) {
    return inventoryService.inventoryToHtml(inv);
  }

  function startResize(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    // Disable resizing on mobile
    if (isMobile) return;
    
    isResizing = true;
    startX = event.clientX;
    startY = event.clientY;
    startWidth = note.width;
    startHeight = note.height;
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
  }

  function resize(event: MouseEvent) {
    if (!isResizing) return;
    note.width = Math.max(170, startWidth + (event.clientX - startX));
    note.height = Math.max(170, startHeight + (event.clientY - startY));
    dispatch("update", note);
  }

  function stopResize() {
    isResizing = false;
    window.removeEventListener("mousemove", resize);
    window.removeEventListener("mouseup", stopResize);
  }

  function startDrag(event: MouseEvent) {
    dispatch("bringToFront", note);
    const target = event.target as HTMLElement;
    if (target.tagName === "DIV" && target.isContentEditable) return;
    
    // Disable dragging on mobile
    if (isMobile) return;

    event.preventDefault();
    isDragging = true;
    offsetX = event.clientX - note.x;
    offsetY = event.clientY - note.y;
    window.addEventListener("mousemove", drag);
    window.addEventListener("mouseup", stopDrag);
  }

  function drag(event: MouseEvent) {
    if (!isDragging) return;

    // Calculate new positions
    let newX = event.clientX - offsetX;
    let newY = event.clientY - offsetY;

    // Prevent the note from going outside the window bounds
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    newX = Math.max(0, Math.min(newX, windowWidth - note.width));
    newY = Math.max(0, Math.min(newY, windowHeight - note.height));

    note.x = newX;
    note.y = newY;
    dispatch("update", note);
  }

  function stopDrag() {
    isDragging = false;
    window.removeEventListener("mousemove", drag);
    window.removeEventListener("mouseup", stopDrag);
  }

  function changeColor(newColor: string) {
    note.color = newColor;
    dispatch("update", note);
  }

  function applyStyle(style: string) {
    document.execCommand(style);
  }

  function toggleList() {
    document.execCommand("insertUnorderedList");
  }

  function focusNote() {
    isEditing = true;
  }

  async function blurNote() {
    isEditing = false;
    const contentElement = document.getElementById(
      `note-content-${note.id}`
    ) as HTMLElement;
    console.log(contentElement.innerHTML);
    if (note.id == -1 && note.text != contentElement.innerHTML) {
      await updateInventoryInDB(contentElement.innerHTML);
      contentElement.innerHTML = inventoryToStickyNote(inventoryData);
    } 
    note.text = contentElement.innerHTML;
    dispatch("update", note);
  }

  // Update inventory using our local service
  async function updateInventoryInDB(text: string) {
    try {
      // Ensure user exists
      userService.getOrCreateUser(user_id);
      
      // Use the AI service to compare and update inventory
      inventoryData = await aiService.compareInventory(user_id, text);
      
      // Update the note text with the formatted inventory
      note.text = inventoryToStickyNote(inventoryData);
      
      // Dispatch event to notify parent component
      dispatch("fetchInventory");
    } catch (error) {
      console.error("Error updating inventory:", error);
    }
  }

  function hexToRgb(hex: string) {
    // Remove the hash at the start if it's there
    hex = hex.replace(/^#/, "");

    // Parse the r, g, b values
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    return [r, g, b];
  }

  function rgbToHex(r: number, g: number, b: number) {
    return (
      "#" +
      ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    );
  }

  function getDarkerShade(hex: string, factor = 0.9) {
    const [r, g, b] = hexToRgb(hex);
    // Make the color darker
    const darkR = Math.round(r * factor);
    const darkG = Math.round(g * factor);
    const darkB = Math.round(b * factor);

    return rgbToHex(darkR, darkG, darkB);
  }

  // Create a new array with the selected color at the beginning
  $: dynamicColorOptions = [
    note.color,
    ...colorOptions.filter((color) => color !== note.color),
  ];
</script>

<div
  class="sticky-note {isMobile ? 'mobile' : ''}"
  style="background-color: {note.color}; left: {note.x}px; top: {note.y}px; width: {note.width}px; height: {note.height}px; z-index: {note.zIndex};"
  on:mousedown={startDrag}
>
  <div class="header" style="background-color: {getDarkerShade(note.color)}">
    {#if isInventory}
      <div class="note-title">
        <FontAwesomeIcon icon={faShoppingBasket} />
        <span>Inventory</span>
      </div>
    {:else}
      <div class="note-title">
        {#if note.text.includes('<b>') && note.text.includes('</b>')}
          {@html note.text.match(/<b>(.*?)<\/b>/)?.[0] || 'Note'}
        {:else}
          Note
        {/if}
      </div>
    {/if}
    <button class="minimize-button" on:click={minimizeNote} aria-label="Minimize note">
      <FontAwesomeIcon icon={faMinimize} />
    </button>
  </div>
  
  {#if !note.minimized}
    <div
      class="color-picker"
      on:mouseenter={() => (showColors = true)}
      on:mouseleave={() => (showColors = false)}
    >
      {#if !showColors}
        <div
          class="color-option"
          style="background-color: {note.color}"
          on:click={() => changeColor(note.color)}
          aria-label="Change note color"
        ></div>
      {/if}
      {#if showColors}
        {#each dynamicColorOptions as color}
          <div
            class="color-option {note.color === color ? 'selected' : ''}"
            style="background-color: {color}"
            on:click={() => changeColor(color)}
            aria-label="Select color"
          ></div>
        {/each}
      {/if}
    </div>
    
    <div
      id="note-content-{note.id}"
      class="note-content"
      contenteditable="true"
      on:mousedown|stopPropagation
      on:focus={focusNote}
      on:blur={blurNote}
    >
      {@html note.text}
    </div>
    
    {#if isEditing}
      <div class="toolbar">
        <button class="style-button" on:click={() => applyStyle("bold")} aria-label="Bold text">
          <FontAwesomeIcon icon={faBold} />
        </button>
        <button class="style-button" on:click={() => applyStyle("italic")} aria-label="Italic text">
          <FontAwesomeIcon icon={faItalic} />
        </button>
        <button class="style-button" on:click={() => applyStyle("underline")} aria-label="Underline text">
          <FontAwesomeIcon icon={faUnderline} />
        </button>
        <button class="style-button" on:click={() => applyStyle("strikeThrough")} aria-label="Strikethrough text">
          <FontAwesomeIcon icon={faStrikethrough} />
        </button>
        <button class="style-button" on:click={toggleList} aria-label="Create list">
          <FontAwesomeIcon icon={faList} />
        </button>
      </div>
    {/if}
    
    <div class="resize-handle" on:mousedown={startResize}></div>
  {:else}
    <button class="restore-button" on:click={minimizeNote} aria-label="Restore note">
      <FontAwesomeIcon icon={faMaximize} />
    </button>
  {/if}
</div>

<style>
  .sticky-note {
    position: absolute;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    cursor: grab;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all var(--transition-normal);
    overflow: hidden;
    background-color: var(--white);
    border: 1px solid rgba(0, 0, 0, 0.05);
    animation: fadeIn var(--transition-normal);
  }
  
  .sticky-note:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }
  
  .sticky-note:active {
    cursor: grabbing;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    width: 100%;
    font-weight: 600;
    color: var(--dark);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  .note-title {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80%;
  }
  
  .minimize-button {
    background: transparent;
    border: none;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-round);
    transition: all var(--transition-fast);
    color: var(--dark-gray);
  }
  
  .minimize-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--dark);
    transform: scale(1.1);
  }
  
  .color-picker {
    position: absolute;
    right: 50px;
    top: 15px;
    display: flex;
    flex-direction: row;
    gap: var(--space-xs);
    z-index: var(--z-sticky);
    background-color: var(--white);
    padding: var(--space-xs);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    opacity: 0.9;
  }
  
  .color-option {
    width: 16px;
    height: 16px;
    border-radius: var(--radius-round);
    cursor: pointer;
    border: 2px solid transparent;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
  }
  
  .color-option.selected {
    border: 2px solid var(--white);
    transform: scale(1.2);
    box-shadow: var(--shadow-md);
  }
  
  .color-option:hover {
    transform: scale(1.3);
    box-shadow: var(--shadow-md);
  }
  
  .resize-handle {
    width: 16px;
    height: 16px;
    background: var(--primary);
    position: absolute;
    bottom: 0;
    right: 0;
    cursor: nwse-resize;
    border-radius: 0 0 var(--radius-md) 0;
    transition: all var(--transition-fast);
  }
  
  .resize-handle:hover {
    background: var(--primary-dark);
    transform: scale(1.1);
  }
  
  .note-content {
    flex: 1;
    min-height: 100px;
    background: transparent;
    border: none;
    outline: none;
    white-space: pre-wrap;
    padding: var(--space-md);
    overflow: auto;
    line-height: 1.6;
    color: var(--dark);
    font-size: 0.95rem;
  }
  
  /* Styling for recipe content */
  .note-content h1, 
  .note-content h2, 
  .note-content h3, 
  .note-content h4, 
  .note-content h5, 
  .note-content h6 {
    margin-top: var(--space-md);
    margin-bottom: var(--space-xs);
    color: var(--dark);
  }
  
  .note-content b {
    color: var(--dark);
    font-weight: 600;
  }
  
  .note-content i {
    color: var(--dark-gray);
  }
  
  .note-content ul, 
  .note-content ol {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-sm);
  }
  
  .note-content li {
    margin-bottom: var(--space-xs);
  }
  
  /* Custom Scrollbar */
  .note-content::-webkit-scrollbar {
    width: 6px;
  }

  .note-content::-webkit-scrollbar-track {
    background: transparent;
    border-radius: var(--radius-md);
  }

  .note-content::-webkit-scrollbar-thumb {
    background: var(--primary-light);
    opacity: 0.6;
    border-radius: var(--radius-md);
  }

  .note-content::-webkit-scrollbar-thumb:hover {
    background: var(--primary);
  }

  /* Firefox */
  .note-content {
    scrollbar-width: thin;
    scrollbar-color: var(--primary-light) transparent;
  }
  
  .toolbar {
    display: flex;
    justify-content: space-around;
    padding: var(--space-xs) 0;
    border-top: 1px solid var(--light-gray);
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(5px);
  }
  
  .style-button {
    background: transparent;
    border: none;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    color: var(--dark-gray);
  }
  
  .style-button:hover {
    background-color: var(--light-gray);
    color: var(--dark);
    transform: translateY(-2px);
  }
  
  .restore-button {
    width: 100%;
    padding: var(--space-sm);
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--dark);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .restore-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  /* Media Queries for Responsive Design */
  @media (max-width: 992px) {
    .note-content {
      font-size: 0.9rem;
    }
  }
  
  @media (max-width: 768px) {
    .sticky-note {
      border-radius: var(--radius-md);
    }
    
    .color-picker {
      left: -25px;
    }
    
    .color-option {
      width: 14px;
      height: 14px;
    }
    
    .note-content {
      padding: var(--space-sm);
      font-size: 0.85rem;
    }
    
    .header {
      padding: var(--space-xs) var(--space-sm);
    }
    
    .toolbar {
      padding: var(--space-xs) 0;
    }
    
    .style-button {
      width: 28px;
      height: 28px;
    }
  }
  
  @media (max-width: 576px) {
    .sticky-note {
      border-radius: var(--radius-sm);
      max-width: calc(100vw - 80px);
    }
    
    .color-picker {
      left: -20px;
      gap: 4px;
    }
    
    .color-option {
      width: 12px;
      height: 12px;
    }
    
    .note-content {
      padding: var(--space-xs);
      font-size: 0.8rem;
      min-height: 80px;
    }
    
    .header {
      padding: var(--space-xs) var(--space-sm);
    }
    
    .note-title {
      font-size: 0.8rem;
    }
    
    .minimize-button {
      width: 24px;
      height: 24px;
    }
    
    .resize-handle {
      width: 14px;
      height: 14px;
    }
    
    .toolbar {
      padding: 2px 0;
    }
    
    .style-button {
      width: 24px;
      height: 24px;
    }
  }
  
  /* Mobile-specific styling */
  .sticky-note.mobile {
    position: fixed;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%);
    width: 90vw !important;
    height: 80vh !important;
    max-width: 500px;
    max-height: 600px;
    cursor: default;
    box-shadow: var(--shadow-xl);
    z-index: var(--z-modal) !important;
  }
  
  .sticky-note.mobile:hover {
    transform: translate(-50%, -50%);
    box-shadow: var(--shadow-xl);
  }
  
  .sticky-note.mobile .resize-handle {
    display: none;
  }
  
  .sticky-note.mobile .color-picker {
    position: absolute;
    right: 50px;
    top: 12px;
    display: flex !important;
  }
  
  /* Fix for color picker visibility */
  .color-picker {
    display: flex !important;
    opacity: 1;
  }
  
  /* Mobile color picker improvements */
  @media (max-width: 576px) {
    .color-picker {
      position: fixed !important;
      top: 60px !important;
      right: auto !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background-color: var(--white);
      padding: var(--space-sm);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1000 !important;
      display: flex !important;
    }
    
    .color-option {
      width: 24px;
      height: 24px;
      margin: 0 4px;
    }
    
    .sticky-note.mobile .color-picker {
      top: 60px !important;
      right: auto !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
    }
    
    .color-option.selected {
      transform: scale(1.3);
      border: 3px solid var(--primary);
    }
  }
</style>
