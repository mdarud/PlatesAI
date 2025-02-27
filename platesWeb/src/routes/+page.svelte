<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import {
    faAngleRight,
    faAngleLeft,
    faUtensils,
  } from "@fortawesome/free-solid-svg-icons";
  import { onMount } from "svelte";
  import StickyNote from "../lib/StickyNote.svelte";
  import ChatArea from "../lib/ChatArea.svelte";

  type Note = {
    id: number;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    minimized: boolean;
    zIndex: number; // Add this line
  };

  interface Recipe {
    title: string;
    description: string;
    ingredients: Ingredient[];
    steps: string[];
    servings: string;
    tools: string[];
    methods: string[];
    keywords: string;
  }

  interface Ingredient {
    name: string;
    amount: string;
  }

  interface Inventory {
    user_id: string;
    ingredient_name: string;
    amount?: string;
    expires_at?: string; // ISO 8601 format (YYYY-MM-DD)
  }

  let notes: Note[] = [];
  let nextId = 1;
  let selectedNoteIds: number[] = [];
  let editMode = false;
  let drawerMinimized = false; // State to track drawer minimization
  let inventoryData: Inventory[] = [];
  let messages: { text: string; sender: string }[] = [];
  const colorOptions = [
    "#FFADAD",
    "#FFD6A5",
    "#FDFFB6",
    "#CAFFBF",
    "#9BF6FF",
    "#A0C4FF",
    "#BDB2FF",
  ];
  $: sidebarWidth = drawerMinimized ? 60 : 210; // Adjust based on the sidebar state
  $: inventoryInit = false;

  let user_id: string; // Now a UUID

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
    let html = `<b>${recipe.title}</b><br><br>`;
    html += `<i>${recipe.description}</i><br><br>`;

    // Ingredients
    html += `<b>Ingredients:</b><ul>`;
    recipe.ingredients.forEach((ingredient) => {
      html += `<li><b>${ingredient.name}:</b> ${ingredient.amount}</li>`;
    });
    html += `</ul>`;

    // Steps
    html += `<b>Steps:</b><ul>`;
    recipe.steps.forEach((step) => {
      html += `<li>${step}</li>`;
    });
    html += `</ul>`;

    // Tools
    html += `<b>Tools:</b><ul>`;
    recipe.tools.forEach((tool) => {
      html += `<li>${tool}</li>`;
    });
    html += `</ul>`;

    // Methods
    html += `<b>Methods:</b><ul>`;
    recipe.methods.forEach((method) => {
      html += `<li>${method}</li>`;
    });
    html += `</ul>`;

    // Keywords
    html += `<b>Keywords:</b> <i>${recipe.keywords}</i>`;

    addNote(html);
  }

  function inventoryToStickyNote(inv: Inventory[]) {
    let html = `<ul>`;

    inv.forEach((item) => {
      const isOutOfStock = item.amount ? parseInt(item.amount) == 0 : false;
      html += `<li>${isOutOfStock ? "<s>" : ""}<b>${item.ingredient_name}:</b> ${item.amount || "Unknown amount"}${isOutOfStock ? "</s>" : ""}`;

      if (item.expires_at) {
        html += ` (Expires: ${item.expires_at})`;
      }

      html += `</li>`;
    });

    html += `</ul>`;

    return html;
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

  async function fetchInventory() {
    if (!user_id) return;

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/inventory/${user_id}`
    );
    if (res.ok) {
      inventoryData = await res.json();
      notes = notes.map((note) =>
        note.id === -1
          ? { ...note, text: inventoryToStickyNote(inventoryData) }
          : note
      );
    }
  }

  async function fetchChatHistory() {
    if (!user_id) return;

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/chat/history/${user_id}`
    );
    if (res.ok) {
      messages = await res.json();
    }
    console.log(messages);
  }

  onMount(() => {
    const savedNotes = localStorage.getItem("stickyNotes");
    user_id = getUserId();
    if (savedNotes) {
      notes = JSON.parse(savedNotes);
      const inventoryNote = notes.find((item: Note) => item.id == -1);

      if (!inventoryNote) {
        const newNote: Note = {
          id: -1,
          text: "Inventory",
          x: 375,
          y: 239,
          width: 366,
          height: 332,
          color: "#FFADAD",
          minimized: true,
          zIndex: 1,
        };
        notes.push(newNote);
        saveNotes();
        console.log(newNote); // Optionally log the newly created note
      } else {
        console.log(inventoryNote); // Optionally log if the note already exists
      }
      console.log(notes);
      nextId = Math.max(...notes.map((n) => n.id), 0) + 1;
      fetchInventory();
      fetchChatHistory();
      setTimeout(() => {
        const chatContainer = document.getElementById("chat-container");
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }

    const inventoryNote = notes.find((item: Note) => item.id == -1);
    console.log(!inventoryNote)
    if (!inventoryNote) {
      const newNote: Note = {
        id: -1,
        text: "Inventory",
        x: 375,
        y: 239,
        width: 366,
        height: 332,
        color: "#FFADAD",
        minimized: true,
        zIndex: 1,
      };
      notes.push(newNote);
      saveNotes();
    }
  });
</script>

<div class="drawer {drawerMinimized ? 'minimized' : ''}">
  <div class="header">
    <button
      on:click={toggleDrawer}
      class="toggle-drawer-btn {drawerMinimized ? 'minimized' : ''}"
    >
      <FontAwesomeIcon icon={drawerMinimized ? faAngleRight : faAngleLeft} />
    </button>
    {#if !drawerMinimized}
      <span class="food-icon" role="img" aria-label="Food">🍽️</span>
      <span class="title">Plates</span>
    {/if}
  </div>
  {#if !drawerMinimized}
    <div class="button-container">
      <button class="add-note-btn" on:click={() => addNote()}
        >➕ Add Note</button
      >
      <button class="edit-notes-btn" on:click={toggleEditMode}
        >{editMode ? "Done" : "✏️ Edit"}</button
      >
      {#if editMode}
        <button
          class="delete-notes-btn"
          on:click={deleteSelectedNotes}
          disabled={selectedNoteIds.length === 0}
        >
          Delete
        </button>
      {/if}
    </div>
  {/if}
  {#if !drawerMinimized}
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
          {extractPlainText(note.text).slice(0, 10) +
            (note.text.length > 10 ? "..." : "")}
        </div>
      {/each}
    </div>
    {#each notes.filter((n) => n.minimized && n.id == -1) as note}
      <div
        class="note-card"
        on:click={() => {
          toggleMinimize(note.id);
        }}
        style="background-color: {note.color}; width: 90%; position: absolute; bottom: 10px; font-weight: normal;"
      >
        🛍️{extractPlainText("Inventory").slice(0, 10) +
          ("Inventory".length > 10 ? "..." : "")}
      </div>
    {/each}
  {/if}
</div>

<div
  class="notes-area"
  style="margin-left: {drawerMinimized ? '60px' : '210px'};"
>
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
  <!-- Chat area added here -->
  <ChatArea
    on:addNote={recipeToStickyNote}
    on:fetchInventory={fetchInventory}
    {messages}
    {user_id}
  />
</div>

<style>
  * {
    font-family: Arial, sans-serif;
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
  }

  .drawer {
    width: 210px; /* Set the width of the drawer */
    height: 100vh;
    position: fixed;
    left: 0;
    top: 0;
    background: #1b1a1a;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
    overflow-y: auto;
    padding: 10px;
    z-index: 1000; /* Ensure it appears above other content */
    transition: width 0.3s; /* Smooth transition */
  }

  .drawer.minimized {
    width: 60px; /* Width when minimized */
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px; /* Space between icon, title, and button */
    margin-bottom: 10px; /* Add space below the header */
  }

  .title {
    font-size: 24px; /* Adjust title size */
    font-weight: bold; /* Make title bold */
    font-family: "Pacifico", cursive; /* Use a fun font */
    color: #ffffff;
  }

  .food-icon {
    font-size: 24px; /* Adjust icon size */
  }

  .toggle-drawer-btn {
    background: transparent;
    border: none;
    font-size: 24px;
    cursor: pointer;
  }

  .button-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px; /* Add space between buttons and minimized notes */
  }

  .add-note-btn,
  .edit-notes-btn,
  .delete-notes-btn {
    padding: 8px 12px;
    border: none;
    background-color: #ffffff;
    color: rgb(37, 37, 37);
    font-size: 16px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-note-btn:hover,
  .edit-notes-btn:hover,
  .delete-notes-btn:hover {
    background-color: rgb(212, 212, 212);
  }

  .minimized-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .note-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    border-radius: 5px;
    text-align: center;
    cursor: pointer;
    font-weight: bold;
    transition: transform 0.2s;
    border: 1px solid transparent;
    overflow: hidden;
  }

  .note-card:hover {
    transform: scale(1.05);
  }

  .wiggle {
    animation: wiggle 0.2s ease infinite alternate;
  }

  @keyframes wiggle {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(1deg);
    }
  }

  .selected {
    border: 2px solid #ff4f4f;
    background-color: rgba(255, 175, 175, 0.5);
  }

  .notes-area {
    height: calc(100vh - 50px);
    overflow: hidden;
  }

  .toggle-drawer-btn {
    background: transparent;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: ghostwhite;
    transition: transform 0.3s; /* Smooth transition for rotation */
  }

  .toggle-drawer-btn.minimized {
    transform: rotate(180deg); /* Rotate arrow when minimized */
  }
</style>
