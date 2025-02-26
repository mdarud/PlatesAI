<script lang="ts">
  import { createEventDispatcher } from "svelte";

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

  interface Inventory {
    user_id: string;
    ingredient_name: string;
    amount?: string;
    expires_at?: string; // ISO 8601 format (YYYY-MM-DD)
}

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
  let inventoryData: Inventory[] = [];

  // Define the color options
  const colorOptions = [
    "#FFADAD",
    "#FFD6A5",
    "#FDFFB6",
    "#CAFFBF",
    "#9BF6FF",
    "#A0C4FF",
    "#BDB2FF",
  ];

  function minimizeNote() {
    note = { ...note, minimized: !note.minimized, zIndex: 1 };
    dispatch("update", note);
  }

  function inventoryToStickyNote(inv: Inventory[]) {
    let html = `<ul>`;

    inv.forEach((item) => {
        const isOutOfStock = item.amount? parseInt(item.amount) == 0: false;
        html += `<li>${isOutOfStock ? "<s>" : ""}<b>${item.ingredient_name}:</b> ${item.amount || "Unknown amount"}${isOutOfStock ? "</s>" : ""}`;

        if (item.expires_at) {
            html += ` (Expires: ${item.expires_at})`;
        }

        html += `</li>`;
    });

    html += `</ul>`;

    return html;
}

  function startResize(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
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

    // Prevent the note from overlapping with the sidebar
    if (newX < sidebarWidth) {
      newX = sidebarWidth; // Align the note to the right of the sidebar
    }

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

  async function updateInventoryInDB(text: string) {
    // Example API call (Replace with your actual API logic)
    const res = await fetch("http://127.0.0.1:8000/update-inventory", {
      method: "POST",
      body: JSON.stringify({ user_id, message: text }),
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      inventoryData = await res.json();
      note.text = inventoryToStickyNote(inventoryData);
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
  class="sticky-note"
  style="background-color: {note.color}; left: {note.x}px; top: {note.y}px; width: {note.width}px; height: {note.height}px; z-index: {note.zIndex};"
  on:mousedown={startDrag}
>
  <div class="header" style="background:{getDarkerShade(note.color)}">
    {#if note.id == -1}
      <div><b>Inventory</b></div>
    {/if}
    <button class="minimize-button" on:click={minimizeNote}>➖</button>
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
        ></div>
      {/if}
      {#if showColors}
        {#each dynamicColorOptions as color}
          <div
            class="color-option {note.color === color ? 'selected' : ''}"
            style="background-color: {color}"
            on:click={() => changeColor(color)}
          ></div>
        {/each}
      {/if}
    </div>
    <div
      id="note-content-{note.id}"
      contenteditable="true"
      on:mousedown|stopPropagation
      on:focus={focusNote}
      on:blur={blurNote}
    >
      {@html note.text}
      <!-- Use {@html} to render the styled content -->
    </div>
    {#if isEditing}
      <div class="toolbar">
        <button class="style-button" on:click={() => applyStyle("bold")}
          >B</button
        >
        <button class="style-button" on:click={() => applyStyle("italic")}
          >I</button
        >
        <button class="style-button" on:click={() => applyStyle("underline")}
          >U</button
        >
        <button
          class="style-button"
          on:click={() => applyStyle("strikeThrough")}>S</button
        >
        <button class="style-button" on:click={toggleList}>• List</button>
      </div>
    {/if}
    <div class="resize-handle" on:mousedown={startResize}></div>
  {:else}
    <button class="restore-button" on:click={minimizeNote}>🔼</button>
  {/if}
</div>

<style>
  .sticky-note {
    position: absolute;
    border-radius: 5px;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
    cursor: grab;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .sticky-note:active {
    cursor: grabbing;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: auto;
    border-radius: 5px 5px 0 0;
    padding: 10px;
    width: -webkit-fill-available;
  }
  .minimize-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    margin-left: auto;
  }
  .color-picker {
    position: absolute;
    left: -25px; /* Adjust this value as needed */
    top: 10px; /* Adjust this value as needed */
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .color-option {
    width: 10px; /* Small size when not hovered */
    height: 10px; /* Small size when not hovered */
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition:
      width 0.2s,
      height 0.2s; /* Smooth transition */
  }
  .color-option.selected {
    border: 2px solid black;
  }
  .color-option:hover {
    width: 20px; /* Enlarged size on hover */
    height: 20px; /* Enlarged size on hover */
  }
  .resize-handle {
    width: 10px;
    height: 10px;
    background: #7c42da;
    position: absolute;
    bottom: 0;
    right: 0;
    cursor: nwse-resize;
  }
  [contenteditable="true"] {
    flex: 1;
    min-height: 100px;
    background: transparent;
    border: none;
    outline: none;
    white-space: pre-wrap; /* Preserve whitespace */
    padding: 10px;
    overflow: auto;
  }
  /* WebKit-based browsers (Chrome, Edge, Safari) */
  [contenteditable="true"]::-webkit-scrollbar {
    width: 6px; /* Slim scrollbar */
  }

  [contenteditable="true"]::-webkit-scrollbar-track {
    background: transparent; /* Optional: Makes track invisible */
    border-radius: 10px;
  }

  [contenteditable="true"]::-webkit-scrollbar-thumb {
    background: #7c42da; /* Gray color */
    opacity: 0.6;
    border-radius: 20px; /* Rounded scrollbar */
  }

  [contenteditable="true"]::-webkit-scrollbar-thumb:hover {
    background: #7c42da; /* Slightly darker on hover */
  }

  /* Firefox */
  [contenteditable="true"] {
    scrollbar-width: thin; /* Slim scrollbar */
    border-radius: 20px; /* Rounded scrollbar */
    scrollbar-color: #7c42da98 transparent; /* Thumb color + transparent track */
  }
  .toolbar {
    display: flex;
    justify-content: space-around;
    padding: 5px 0;
    border-top: 1px solid #ccc;
  }
  .style-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
  }
</style>
