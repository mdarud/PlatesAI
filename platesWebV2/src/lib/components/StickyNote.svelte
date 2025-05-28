<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import type { InventoryItem } from "../services/types";
  import { createIcon } from "../utils/icons";
  import "../styles/component-overrides.css";
  
  type Note = {
    id: number;
    title: string;
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
  export let sidebarWidth: number = 0;
  export let rightSidebarWidth: number = 0;
  export let user_id: string = '';

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
    
    // Restore checkbox states when the component mounts
    setTimeout(restoreCheckboxStates, 0);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });

  // Define the color options with more vibrant and professional colors
  const colorOptions = [
    "var(--note-coral, #FF6B6B)",      // Vibrant coral
    "var(--note-marigold, #FFB84C)",   // Warm marigold
    "var(--note-mint, #4ECDC4)",       // Fresh mint
    "var(--note-lavender, #A78BFA)",   // Soft lavender
    "var(--note-sky, #60A5FA)",        // Sky blue
    "var(--note-rose, #F472B6)",       // Rose pink
    "var(--note-emerald, #34D399)",    // Emerald green
  ];

  function minimizeNote(event: MouseEvent) {
    event.stopPropagation();
    note = { ...note, minimized: !note.minimized };
    dispatch("update", note);
  }
  
  function closeNote() {
    dispatch("close", note);
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

  // Debounce function to limit the rate of updates
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return function(this: any, ...args: Parameters<T>): void {
      const context = this;
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        timeout = null;
        func.apply(context, args);
      }, wait);
    };
  }
  
  // Debounced update function to reduce update frequency
  const debouncedUpdate = debounce((updatedNote: Note) => {
    dispatch("update", updatedNote);
  }, 50); // 50ms debounce time

  function resize(event: MouseEvent) {
    if (!isResizing) return;
    
    // Calculate new dimensions
    const newWidth = Math.max(170, startWidth + (event.clientX - startX));
    const newHeight = Math.max(170, startHeight + (event.clientY - startY));
    
    // Update the note dimensions
    note.width = newWidth;
    note.height = newHeight;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      // Use debounced update to reduce the number of store updates
      debouncedUpdate({...note});
    });
  }

  function stopResize() {
    if (isResizing) {
      // Final update to ensure the store has the latest state
      dispatch("update", note);
      isResizing = false;
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResize);
    }
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

    // Add a class to disable transitions during drag
    const noteElement = event.currentTarget as HTMLElement;
    noteElement.classList.add('dragging');
  }

  function drag(event: MouseEvent) {
    if (!isDragging) return;

    // Calculate new positions
    let newX = event.clientX - offsetX;
    let newY = event.clientY - offsetY;

    // Prevent the note from going outside the window bounds
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Account for both left and right sidebars
    const availableWidth = windowWidth - rightSidebarWidth;
    newX = Math.max(sidebarWidth, Math.min(newX, availableWidth - note.width));
    newY = Math.max(0, Math.min(newY, windowHeight - note.height));

    // Update the note position
    note.x = newX;
    note.y = newY;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      // Use debounced update to reduce the number of store updates
      debouncedUpdate({...note});
    });
  }

  function stopDrag(event: MouseEvent) {
    if (isDragging) {
      // Final update to ensure the store has the latest state
      dispatch("update", note);
      isDragging = false;
      window.removeEventListener("mousemove", drag);
      window.removeEventListener("mouseup", stopDrag);

      // Remove the dragging class to re-enable transitions
      const noteElement = event.target as HTMLElement;
      const closestNote = noteElement.closest('.sticky-note');
      if (closestNote) {
        closestNote.classList.remove('dragging');
      }
    }
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
  
  function toggleCheckboxList() {
    // First create an unordered list if not already in one
    document.execCommand("insertUnorderedList");
    
    // Get the selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Get the list items in the current selection
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Check if container is an Element or get its parent element
    const element = container.nodeType === Node.ELEMENT_NODE 
      ? container as Element 
      : container.parentElement;
    
    if (!element) return;
    
    const listItems = element.querySelectorAll('li');
    
    // Add checkbox to each list item if it doesn't already have one
    listItems.forEach((li: HTMLLIElement) => {
      if (!li.innerHTML.includes('<input type="checkbox"')) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'sticky-note-checkbox'; // Add a class for easier selection
        checkbox.setAttribute('data-checked', 'false'); // Initialize state attribute
        
        checkbox.addEventListener('change', (e) => {
          // Prevent the change from triggering a content update
          e.stopPropagation();
          
          // Update the checkbox state in the HTML
          const target = e.target as HTMLInputElement;
          target.setAttribute('data-checked', target.checked ? 'true' : 'false');
          
          // Trigger a content update
          const contentElement = document.getElementById(`note-content-${note.id}`) as HTMLElement;
          if (contentElement) {
            note.text = contentElement.innerHTML;
            dispatch("update", note);
          }
        });
        
        li.insertBefore(checkbox, li.firstChild);
        li.insertBefore(document.createTextNode(' '), checkbox.nextSibling);
      }
    });
  }
  
  // Function to restore checkbox states when loading notes
  function restoreCheckboxStates() {
    const contentElement = document.getElementById(`note-content-${note.id}`);
    if (!contentElement) return;
    
    const checkboxes = contentElement.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((element: Element) => {
      // Cast to HTMLInputElement
      const checkbox = element as HTMLInputElement;
      
      // Restore checked state from data attribute
      const isChecked = checkbox.getAttribute('data-checked') === 'true';
      checkbox.checked = isChecked;
      
      // Add change event listener
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const target = e.target as HTMLInputElement;
        target.setAttribute('data-checked', target.checked ? 'true' : 'false');
        
        // Update note content
        const contentElement = document.getElementById(`note-content-${note.id}`) as HTMLElement;
        if (contentElement) {
          note.text = contentElement.innerHTML;
          dispatch("update", note);
        }
      });
    });
  }

  function focusNote() {
    isEditing = true;
  }

  function blurNote() {
    isEditing = false;
    const contentElement = document.getElementById(
      `note-content-${note.id}`
    ) as HTMLElement;
    
    if (contentElement) {
      // Update the note's text content
      note.text = contentElement.innerHTML;
      
      // Dispatch the update event with the updated note
      dispatch("update", note);
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
    // Check if it's a CSS variable
    if (hex.startsWith('var(')) {
      // Return a slightly darker version of the same variable
      return hex;
    }
    
    try {
      const [r, g, b] = hexToRgb(hex);
      // Make the color darker
      const darkR = Math.round(r * factor);
      const darkG = Math.round(g * factor);
      const darkB = Math.round(b * factor);

      return rgbToHex(darkR, darkG, darkB);
    } catch (e) {
      // If there's an error, return the original color
      return hex;
    }
  }

  // Create a new array with the selected color at the beginning
  $: dynamicColorOptions = [
    note.color,
    ...colorOptions.filter((color) => color !== note.color),
  ];
</script>

<div
  class="sticky-note {isMobile ? 'mobile' : ''} {note.minimized ? 'minimized' : ''}"
  style="background-color: {note.color}; left: {note.x}px; top: {note.y}px; width: {note.width}px; height: {note.height}px; z-index: {note.zIndex};"
  on:mousedown={startDrag}
>
  <div class="header" style="background-color: {getDarkerShade(note.color)}">
    {#if isInventory}
      <div class="note-title">
        <span class="note-icon">
          {@html createIcon('inventory', 18)}
        </span>
        <span>Inventory</span>
      </div>
    {:else}
      <div class="note-title" contenteditable="true" on:blur={(e) => {
        const target = e.target as HTMLDivElement;
        const title = target?.textContent?.trim();
        if (target && title) {
          note = { ...note, title };
          dispatch("update", note);
        }
      }}>
        {note.title || `Note ${note.id}`}
      </div>
    {/if}
    <div class="note-actions">
      <button class="action-button close-btn" on:click|stopPropagation={closeNote} aria-label="Close note">
        <span>×</span>
      </button>
      <button class="action-button minimize-btn" on:click={minimizeNote} aria-label="Minimize note">
        {#if note.minimized}
          <span>
            {@html createIcon('restore', 16, 'icon-restore')}
          </span>
        {:else}
          <span>
            {@html createIcon('minimize', 16, 'icon-minimize')}
          </span>
        {/if}
      </button>
    </div>
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
          <span>
            {@html createIcon('bold', 16)}
          </span>
        </button>
        <button class="style-button" on:click={() => applyStyle("italic")} aria-label="Italic text">
          <span>
            {@html createIcon('italic', 16)}
          </span>
        </button>
        <button class="style-button" on:click={() => applyStyle("underline")} aria-label="Underline text">
          <span>
            {@html createIcon('underline', 16)}
          </span>
        </button>
        <button class="style-button" on:click={() => applyStyle("strikeThrough")} aria-label="Strikethrough text">
          <span>
            {@html createIcon('strikethrough', 16)}
          </span>
        </button>
        <button class="style-button" on:click={toggleList} aria-label="Create list">
          <span>
            {@html createIcon('list', 16)}
          </span>
        </button>
        <button class="style-button" on:click={toggleCheckboxList} aria-label="Create checkbox list">
          <span>
            {@html createIcon('checkbox', 16)}
          </span>
        </button>
      </div>
    {/if}
    
    <div class="resize-handle" on:mousedown={startResize}>
      {@html createIcon('resize', 14, 'icon-resize')}
    </div>
  {:else}
    <button class="restore-button" on:click|stopPropagation={minimizeNote} aria-label="Restore note">
      <span>
        {@html createIcon('maximize', 16, 'icon-maximize')}
      </span>
    </button>
  {/if}
</div>

<style>
  /* Define note colors if not already defined in global CSS */
  :root {
    --note-coral: #FF6B6B;
    --note-marigold: #FFB84C;
    --note-mint: #4ECDC4;
    --note-lavender: #A78BFA;
    --note-sky: #60A5FA;
    --note-rose: #F472B6;
    --note-emerald: #34D399;
    
    /* Enhanced shadows and effects */
    --shadow-fun: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-pop: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    
    /* Enhanced transitions */
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
    --pop-duration: 300ms;
    --wiggle-duration: 750ms;
    
    /* Enhanced spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-bounce: 0.75rem;
    --space-wiggle: 1.25rem;
    
    /* Enhanced border radius */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-fun: 0.625rem;
    --radius-blob: 999px;
    --radius-round: 50%;
  }
  
  .sticky-note {
    position: absolute;
    border-radius: var(--radius-fun);
    box-shadow: var(--shadow-fun);
    cursor: grab;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform var(--transition-normal), box-shadow var(--transition-normal);
    overflow: hidden;
    background-color: var(--white);
    border: none;
    animation: pop var(--pop-duration) ease-out;
    z-index: var(--z-sticky-note, 100);
    color: var(--text-on-white);
    font-family: var(--font-primary);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin: var(--space-lg);
    will-change: transform; /* Optimize for animations */
  }

  .sticky-note.dragging {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
  
  @keyframes pop {
    0% {
      transform: scale(0.95) translateY(10px);
      opacity: 0;
    }
    50% {
      transform: scale(1.02) translateY(-5px);
    }
    100% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
  
  .sticky-note:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-pop);
  }
  
  .sticky-note:active {
    cursor: grabbing;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-bounce) var(--space-wiggle);
    width: 100%;
    font-weight: 600;
    color: var(--text-on-white);
    border-bottom: 2px dashed rgba(255, 255, 255, 0.2);
    background: linear-gradient(to right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
    backdrop-filter: blur(5px);
  }
  
  .note-title {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 1.1rem;
    font-family: var(--font-accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80%;
    cursor: text;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    min-width: 100px;
    border: 1px solid transparent;
  }

  .note-title:hover {
    background-color: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .note-title:focus {
    background-color: rgba(255, 255, 255, 0.3);
    outline: none;
    border-color: var(--primary);
  }

  .note-title:empty:before {
    content: 'Note Title';
    color: rgba(0, 0, 0, 0.4);
  }
  
  .note-icon {
    font-size: var(--text-xl);
    display: flex;
    align-items: center;
  }
  
  .note-actions {
    display: flex;
    gap: var(--space-xs);
  }
  
  .action-button {
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
  
  .action-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--dark);
  }
  
  .close-btn {
    font-size: 24px;
    font-weight: bold;
    color: rgba(0, 0, 0, 0.5);
    line-height: 1;
  }
  
  .close-btn:hover {
    color: rgba(0, 0, 0, 0.8);
  }
  
  .color-picker {
    position: absolute;
    right: 10px;
    top: 40px;
    display: flex !important;
    flex-direction: row;
    gap: var(--space-xs);
    z-index: var(--z-above);
    background-color: var(--white);
    padding: var(--space-xs);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    opacity: 1;
  }
  
  .sticky-note:hover .color-picker {
    display: flex;
    opacity: 1;
  }
  
  .color-option {
    width: 28px;
    height: 28px;
    border-radius: 50%; /* Make color picker perfectly circular */
    cursor: pointer;
    border: 2px solid var(--white);
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-fun);
  }
  
  .color-option:hover {
    transform: scale(1.2) rotate(-5deg);
    box-shadow: var(--shadow-pop);
  }
  
  .color-option.selected {
    border: 3px solid var(--primary);
    transform: scale(1.3);
    box-shadow: var(--shadow-pop);
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
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--white);
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
    padding: var(--space-lg);
    overflow: auto;
    line-height: 1.6;
    color: var(--dark);
    font-size: 0.95rem;
    margin: 0; /* Reset margin */
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
    padding: var(--space-xs) var(--space-sm);
    border-top: 2px dashed rgba(0, 0, 0, 0.1);
    background: linear-gradient(to right, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3));
    backdrop-filter: blur(5px);
  }
  
  .style-button {
    background: transparent;
    border: none;
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-blob);
    transition: all var(--transition-fast);
    color: var(--dark-gray);
  }
  
  .style-button:hover {
    background-color: var(--light-gray);
    color: var(--dark);
    transform: translateY(-2px) rotate(-5deg);
    animation: pop var(--pop-duration) ease-out;
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
    
    .action-button {
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
    right: 10px;
    top: 40px;
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
