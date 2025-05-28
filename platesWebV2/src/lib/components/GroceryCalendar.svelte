<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { GroceryItem } from '../services/types';
  import { groceryStore } from '../stores/groceryStore';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let selectedDate: string | null = null;
  export let userId: string = 'default-user';
  
  // State
  let currentMonth: Date = new Date();
  let calendarDays: Array<{ date: Date | null; isCurrentMonth: boolean; hasItems: boolean; itemCount: number }> = [];
  let scheduledDates: { [date: string]: number } = {}; // date -> item count
  let monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  let dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Format date as YYYY-MM-DD
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Parse YYYY-MM-DD to Date
  function parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Get days for the calendar
  function getCalendarDays(year: number, month: number): void {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Calculate days from next month to show
    const totalDaysToShow = 42; // 6 rows of 7 days
    const daysFromNextMonth = totalDaysToShow - daysInMonth - daysFromPrevMonth;
    
    // Create array of calendar days
    const days = [];
    
    // Add days from previous month
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    
    for (let i = prevMonthDays - daysFromPrevMonth + 1; i <= prevMonthDays; i++) {
      const date = new Date(year, month - 1, i);
      const dateString = formatDate(date);
      days.push({
        date,
        isCurrentMonth: false,
        hasItems: !!scheduledDates[dateString],
        itemCount: scheduledDates[dateString] || 0
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateString = formatDate(date);
      days.push({
        date,
        isCurrentMonth: true,
        hasItems: !!scheduledDates[dateString],
        itemCount: scheduledDates[dateString] || 0
      });
    }
    
    // Add days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const date = new Date(year, month + 1, i);
      const dateString = formatDate(date);
      days.push({
        date,
        isCurrentMonth: false,
        hasItems: !!scheduledDates[dateString],
        itemCount: scheduledDates[dateString] || 0
      });
    }
    
    calendarDays = days;
  }
  
  // Navigate to previous month
  function prevMonth(): void {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
  }
  
  // Navigate to next month
  function nextMonth(): void {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
  }
  
  // Navigate to today
  function goToToday(): void {
    currentMonth = new Date();
    getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
  }
  
  // Handle date selection
  function selectDate(day: { date: Date | null; isCurrentMonth: boolean }): void {
    if (!day.date) return;
    
    const dateString = formatDate(day.date);
    
    // Don't do anything if the date is already selected
    if (selectedDate === dateString) return;
    
    selectedDate = dateString;
    
    // Dispatch event for parent component
    dispatch('dateSelect', { date: dateString });
  }
  
  // Check if a date is selected
  function isDateSelected(day: { date: Date | null }): boolean {
    if (!day.date || !selectedDate) return false;
    return formatDate(day.date) === selectedDate;
  }
  
  // Check if a date is today
  function isToday(day: { date: Date | null }): boolean {
    if (!day.date) return false;
    const today = new Date();
    return day.date.getDate() === today.getDate() &&
           day.date.getMonth() === today.getMonth() &&
           day.date.getFullYear() === today.getFullYear();
  }
  
  // Load scheduled dates
  function loadScheduledDates(): void {
    // Get scheduled dates directly, without triggering store update
    scheduledDates = groceryStore.getScheduledDates();
    // Only update calendar days if we already have some
    if (calendarDays.length > 0) {
      getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
    }
  }
  
  // Track if we've already loaded data to prevent redundant calls
  let dataLoaded = false;
  
  // Initialize calendar
  onMount(() => {
    // Load grocery items once
    if (!dataLoaded) {
      dataLoaded = true;
      groceryStore.loadGroceryItems(userId)
        .then(dates => {
          // Set scheduled dates directly from the result
          scheduledDates = dates;
          // Initialize calendar
          getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
        })
        .catch(error => {
          console.error('Error loading grocery items:', error);
        });
    }
    
    // Optimize subscription by using a debounced update
    let updateTimeout: number | null = null;
    
    const unsubscribe = groceryStore.subscribe(() => {
      // Cancel any pending update
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      // Immediate refresh of dates without full debounce
      scheduledDates = groceryStore.getScheduledDates();
      
      // Debounce the full calendar update
      updateTimeout = setTimeout(() => {
        getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
        updateTimeout = null;
      }, 100) as unknown as number; // Reduced timeout for snappier UI
    });
    
    return () => {
      unsubscribe();
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  });
  
  // Update calendar when current month changes, but not on every render
  $: if (currentMonth && currentMonth instanceof Date) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    getCalendarDays(year, month);
  }
</script>

<div class="grocery-calendar">
  <div class="calendar-header">
    <div class="month-navigation">
      <button class="nav-button" on:click={prevMonth}>
        {@html createIcon('chevron-left', 20)}
      </button>
      <h2 class="month-title">
        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
      </h2>
      <button class="nav-button" on:click={nextMonth}>
        {@html createIcon('chevron-right', 20)}
      </button>
    </div>
    <button class="today-button" on:click={goToToday}>
      Today
    </button>
  </div>
  
  <div class="calendar-grid">
    <!-- Day names header -->
    <div class="calendar-row day-names">
      {#each dayNames as day}
        <div class="day-name">{day}</div>
      {/each}
    </div>
    
    <!-- Calendar days -->
    <div class="calendar-days">
      {#each calendarDays as day, i}
        <div 
          class="calendar-day {day.isCurrentMonth ? 'current-month' : 'other-month'} 
                 {isToday(day) ? 'today' : ''} 
                 {isDateSelected(day) ? 'selected' : ''}"
          on:click={() => selectDate(day)}
        >
          {#if day.date}
            <span class="day-number">{day.date.getDate()}</span>
            {#if day.hasItems}
              <span class="item-indicator" title="{day.itemCount} items scheduled">
                {day.itemCount}
              </span>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .grocery-calendar {
    display: flex;
    flex-direction: column;
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    height: 100%;
  }
  
  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    background-color: var(--primary);
    color: var(--white);
  }
  
  .month-navigation {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }
  
  .month-title {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
    min-width: 180px;
    text-align: center;
  }
  
  .nav-button {
    background: transparent;
    border: none;
    color: var(--white);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--transition-fast);
  }
  
  .nav-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  .today-button {
    background-color: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.4);
    color: var(--white);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .today-button:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
  
  .calendar-grid {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-md);
  }
  
  .calendar-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--space-xs);
  }
  
  .day-names {
    margin-bottom: var(--space-sm);
  }
  
  .day-name {
    text-align: center;
    font-weight: 600;
    color: var(--dark-gray);
    padding: var(--space-xs);
    font-size: var(--text-sm);
  }
  
  .calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-auto-rows: 1fr;
    gap: var(--space-xs);
    flex: 1;
    /* Force equal height rows */
    grid-template-rows: repeat(6, minmax(40px, 1fr));
  }
  
  .calendar-day {
    position: relative;
    width: 100%;
    height: 40px;
    min-height: 40px;
    max-height: 40px;
    box-sizing: border-box !important;
    border-radius: var(--radius-md);
    cursor: pointer;
    border: 2px solid var(--light-gray);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: background-color 0.2s ease, border-color 0.2s ease;
    /* Ensure content is properly positioned */
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }
  
  .calendar-day:hover {
    background-color: var(--light-gray);
    border-color: var(--primary-light);
  }
  
  .current-month {
    background-color: var(--white);
    color: var(--dark);
  }
  
  .other-month {
    background-color: var(--off-white);
    color: var(--medium-gray);
    border-color: var(--off-white);
  }
  
  .today {
    border: 2px solid var(--primary);
    font-weight: 600;
  }
  
  .selected {
    background-color: var(--primary-light);
    border-color: var(--primary);
  }
  
  .day-number {
    position: absolute;
    top: 4px;
    left: 4px;
    font-size: var(--text-sm);
    line-height: 1;
    margin: 0;
    padding: 0;
    z-index: 1;
  }
  
  .item-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
    background-color: var(--accent);
    color: var(--white);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    border: 2px solid var(--white);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 2;
    pointer-events: none;
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .month-title {
      min-width: 120px;
      font-size: var(--text-base);
    }
    
    .calendar-day {
      /* Fixed height for mobile */
      height: 30px;
      min-height: 30px;
      max-height: 30px;
    }
    
    .day-number {
      font-size: var(--text-xs);
    }
    
    .item-indicator {
      min-width: 16px;
      height: 16px;
      font-size: 10px;
      top: 1px;
      right: 1px;
    }
  }
</style>
