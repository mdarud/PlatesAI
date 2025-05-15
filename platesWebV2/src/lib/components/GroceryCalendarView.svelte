<script lang="ts">
  import { onMount } from 'svelte';
  import GroceryCalendar from './GroceryCalendar.svelte';
  import DateDetailPanel from './DateDetailPanel.svelte';
  import GroceryList from './GroceryList.svelte';
  import type { GroceryItem } from '../services/types';
  import { groceryStore } from '../stores/groceryStore';
  
  // Props
  export let userId: string = 'default-user';
  export let onAddItem: (date?: string) => void = () => {};
  export let onEditItem: (item: GroceryItem) => void = () => {};
  
  // State
  let selectedDate: string | null = null;
  let showMasterList: boolean = true;
  
  // Handle date selection from calendar
  function handleDateSelect(event: CustomEvent<{ date: string }>): void {
    // Don't do anything if the same date is already selected
    if (selectedDate === event.detail.date) return;
    
    selectedDate = event.detail.date;
    showMasterList = false;
  }
  
  // Handle adding item for a specific date
  function handleAddItemForDate(date: string): void {
    onAddItem(date);
  }
  
  // Toggle between date detail and master list
  function toggleMasterList(): void {
    showMasterList = !showMasterList;
  }
  
  // Initialize with today's date
  onMount(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    selectedDate = `${year}-${month}-${day}`;
  });
</script>

<div class="grocery-calendar-view">
  <div class="calendar-container">
    <GroceryCalendar 
      {userId} 
      {selectedDate} 
      on:dateSelect={handleDateSelect} 
    />
  </div>
  
  <div class="detail-container">
    <div class="detail-header">
      <button 
        class="toggle-button {showMasterList ? 'active' : ''}" 
        on:click={() => {
          if (!showMasterList) {
            showMasterList = true;
          }
        }}
      >
        Master List
      </button>
      <button 
        class="toggle-button {!showMasterList ? 'active' : ''}" 
        on:click={() => {
          if (showMasterList && selectedDate) {
            showMasterList = false;
          }
        }}
        disabled={!selectedDate}
      >
        {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Select a Date'}
      </button>
    </div>
    
    <div class="detail-content">
      {#if showMasterList}
        <div class="master-list-container">
          <GroceryList 
            {userId} 
            {onAddItem} 
            {onEditItem}
            showViewToggle={false}
          />
        </div>
      {:else if selectedDate}
        <DateDetailPanel 
          date={selectedDate} 
          {userId} 
          onAddItem={handleAddItemForDate} 
          {onEditItem} 
        />
      {:else}
        <div class="empty-state">
          <p>Please select a date from the calendar</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .grocery-calendar-view {
    display: flex;
    gap: var(--space-md);
    height: 100%;
    width: 100%;
  }
  
  .calendar-container {
    height: 100%;
    overflow: hidden;
    /* Prevent calendar from stretching based on right panel */
    min-width: 40%;
    max-width: 100%;
  }
  
  .detail-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    /* Prevent detail panel from affecting calendar size */
    min-width: 50%;
    max-width: 100%;
  }
  
  .detail-header {
    display: flex;
    gap: var(--space-xs);
    padding: var(--space-sm);
    background-color: var(--off-white);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    border-bottom: 1px solid var(--light-gray);
  }
  
  .toggle-button {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    border: none;
    background-color: var(--white);
    color: var(--dark-gray);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    flex: 1;
  }
  
  .toggle-button:hover:not(:disabled) {
    background-color: var(--light-gray);
  }
  
  .toggle-button.active {
    background-color: var(--primary);
    color: var(--white);
  }
  
  .toggle-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .detail-content {
    flex: 1;
    overflow: hidden;
  }
  
  .master-list-container {
    height: 100%;
    overflow: hidden;
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background-color: var(--white);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    color: var(--dark-gray);
  }
  
  /* Responsive styles */
  @media (max-width: 1024px) {
    .grocery-calendar-view {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }
    
    .calendar-container {
      max-height: 400px;
    }
  }
  
  @media (max-width: 768px) {
    .calendar-container {
      max-height: 350px;
    }
  }
</style>
