<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { createIcon } from '../utils/icons';
  
  // Props
  export let show: boolean = false;
  export let title: string = 'Confirm Action';
  export let message: string = 'Are you sure you want to proceed?';
  export let confirmButtonText: string = 'Confirm';
  export let cancelButtonText: string = 'Cancel';
  export let confirmButtonClass: string = 'danger';
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Close modal
  function closeModal() {
    dispatch('cancel');
  }
  
  // Confirm action
  function confirmAction() {
    dispatch('confirm');
  }
</script>

{#if show}
  <div class="modal-backdrop" on:click={closeModal}>
    <div class="modal-container" on:click|stopPropagation>
      <div class="modal-header">
        <h2>{title}</h2>
        <button class="close-button" on:click={closeModal}>
          {@html createIcon('close', 24)}
        </button>
      </div>
      
      <div class="modal-content">
        <p class="modal-message">{message}</p>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-button" on:click={closeModal}>{cancelButtonText}</button>
        <button 
          class="confirm-button {confirmButtonClass}" 
          on:click={confirmAction}
        >
          {confirmButtonText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    animation: fadeIn 0.2s ease-out;
    overflow: hidden;
  }
  
  .modal-container {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease-out;
    z-index: 2001;
    overflow: hidden;
    border: 1px solid var(--light-gray);
  }
  
  .modal-header {
    padding: var(--space-md);
    border-bottom: 1px solid var(--light-gray);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: var(--text-lg);
    color: var(--dark);
  }
  
  .close-button {
    background: transparent;
    border: none;
    color: var(--dark-gray);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }
  
  .close-button:hover {
    background-color: var(--light-gray);
    color: var(--dark);
  }
  
  .modal-content {
    padding: var(--space-lg);
  }
  
  .modal-message {
    margin: 0;
    font-size: var(--text-base);
    line-height: 1.5;
    color: var(--dark);
    text-align: center;
  }
  
  .modal-footer {
    padding: var(--space-md);
    border-top: 1px solid var(--light-gray);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-md);
  }
  
  .cancel-button {
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .cancel-button:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  .confirm-button {
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .confirm-button.primary {
    background-color: var(--primary);
    color: var(--white);
  }
  
  .confirm-button.success {
    background-color: var(--success);
    color: var(--white);
  }
  
  .confirm-button.danger {
    background-color: var(--danger, #e74c3c);
    color: var(--white);
  }
  
  .confirm-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style> 