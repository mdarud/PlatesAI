<script lang="ts">
  import { aiModelStore } from '../stores/aiModelStore';
  import { clearAllData } from '../services/dataService';
  import type { 
    AIModelConfig, 
    AIModelType, 
    AIModelVersion,
    GeminiModelVersion,
    OpenAIModelVersion,
    ClaudeModelVersion,
    MockModelVersion
  } from '../services/types';
  import { createIcon } from '../utils/icons';
  import ConfirmationModal from './ConfirmationModal.svelte';
  
  // State
  let modelConfig: AIModelConfig;
  let isLoading = false;
  let showApiKey = false;
  let showResetConfirmation = false;
  
  // Subscribe to the AI model store
  const unsubscribe = aiModelStore.subscribe(config => {
    modelConfig = config;
  });
  
  // Clean up subscription on component destruction
  import { onDestroy } from 'svelte';
  onDestroy(unsubscribe);
  
  // Available model types
  const modelTypes: AIModelType[] = ['default', 'gemini', 'openai', 'claude', 'mock'];
  
  // Model versions for each provider
  const modelVersions = {
    default: ['default'] as MockModelVersion[],
    gemini: ['gemini-2.5-flash', 'gemini-pro', 'gemini-1.5-pro'] as GeminiModelVersion[],
    openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'] as OpenAIModelVersion[],
    claude: ['claude-3-sonnet', 'claude-3-opus', 'claude-3-haiku'] as ClaudeModelVersion[],
    mock: ['default'] as MockModelVersion[]
  };
  
  // Handle model type change
  async function handleModelTypeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newType = select.value as AIModelType;
    const newModel = modelVersions[newType][0];
    
    isLoading = true;
    try {
      await aiModelStore.update(config => ({
        ...config,
        type: newType,
        model: newModel
      }));
    } catch (error) {
      console.error('Error updating model type:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Handle model version change
  async function handleModelVersionChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    isLoading = true;
    try {
      await aiModelStore.update(config => ({
        ...config,
        model: select.value as AIModelVersion
      }));
    } catch (error) {
      console.error('Error updating model version:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Handle API key change
  async function handleApiKeyChange(event: Event) {
    const input = event.target as HTMLInputElement;
    isLoading = true;
    try {
      await aiModelStore.update(config => ({
        ...config,
        apiKey: input.value
      }));
    } catch (error) {
      console.error('Error updating API key:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Handle temperature change
  async function handleTemperatureChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    if (!isNaN(value)) {
      isLoading = true;
      try {
        await aiModelStore.update(config => ({
          ...config,
          temperature: value
        }));
      } catch (error) {
        console.error('Error updating temperature:', error);
      } finally {
        isLoading = false;
      }
    }
  }
  
  // Handle max tokens change
  async function handleMaxTokensChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    if (!isNaN(value)) {
      isLoading = true;
      try {
        await aiModelStore.update(config => ({
          ...config,
          maxTokens: value
        }));
      } catch (error) {
        console.error('Error updating max tokens:', error);
      } finally {
        isLoading = false;
      }
    }
  }
  
  // Handle ingredient check method change
  async function handleIngredientCheckMethodChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    isLoading = true;
    try {
      await aiModelStore.update(config => ({
        ...config,
        ingredientCheckMethod: select.value as 'ai' | 'direct'
      }));
    } catch (error) {
      console.error('Error updating ingredient check method:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Toggle API key visibility
  function toggleApiKeyVisibility() {
    showApiKey = !showApiKey;
  }
  
  // Handle reset
  async function handleReset() {
    isLoading = true;
    try {
      await aiModelStore.reset();
    } catch (error) {
      console.error('Error resetting config:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Handle reset all data
  async function handleResetAllData() {
    showResetConfirmation = true;
  }
  
  // Confirm reset all data
  async function confirmResetAllData() {
    isLoading = true;
    try {
      await clearAllData();
      
      // Close the confirmation modal
      showResetConfirmation = false;
      
      // Show success message
      alert('All data has been cleared. The application will reload.');
      
      // Reload the page to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Error resetting all data:', error);
      alert('Error resetting data. Please try again.');
    } finally {
      isLoading = false;
    }
  }
  
  // Cancel reset all data
  function cancelResetAllData() {
    showResetConfirmation = false;
  }
</script>

<div class="settings-container {isLoading ? 'loading' : ''}">
  <h2>AI Model Settings</h2>
  
  <div class="settings-group">
    <label for="modelType">Model Provider</label>
    <select 
      id="modelType" 
      value={modelConfig.type} 
      on:change={handleModelTypeChange}
      class="select-input"
      disabled={isLoading}
    >
      {#each modelTypes as type}
        <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
      {/each}
    </select>
  </div>
  
  <div class="settings-group">
    <label for="ingredientCheckMethod">Ingredient Check Method</label>
    <select 
      id="ingredientCheckMethod" 
      value={modelConfig.ingredientCheckMethod} 
      on:change={handleIngredientCheckMethodChange}
      class="select-input"
      disabled={isLoading}
    >
      <option value="direct">Direct Comparison (more reliable)</option>
      <option value="ai">AI-based Extraction (more flexible)</option>
    </select>
    <p class="setting-description">
      Direct comparison uses regex to match ingredients directly. AI-based extraction uses the AI model to extract ingredients from text.
    </p>
  </div>
  
  {#if modelConfig.type !== 'default'}
    <div class="settings-group">
      <label for="modelVersion">Model Version</label>
      <select 
        id="modelVersion" 
        value={modelConfig.model} 
        on:change={handleModelVersionChange}
        class="select-input"
        disabled={isLoading}
      >
        {#each modelVersions[modelConfig.type] as version}
          <option value={version}>{version}</option>
        {/each}
      </select>
    </div>
    
    <div class="settings-group">
      <label for="apiKey">API Key</label>
      <div class="api-key-input">
        <input 
          type={showApiKey ? "text" : "password"}
          id="apiKey" 
          value={modelConfig.apiKey} 
          on:input={handleApiKeyChange}
          placeholder="Enter your API key"
          class="text-input"
          disabled={isLoading}
        />
        <button 
          class="icon-button" 
          title="Show/Hide API Key"
          on:click={toggleApiKeyVisibility}
          disabled={isLoading}
        >
          {@html createIcon(showApiKey ? 'eye-off' : 'eye', 20)}
        </button>
      </div>
    </div>
  {:else}
    <div class="settings-group">
      <div class="info-box">
        <p>Using default AI model settings provided by PlatesAI</p>
      </div>
    </div>
  {/if}
  
  <div class="settings-group">
    <label for="temperature">Temperature ({modelConfig.temperature})</label>
    <div class="range-input-container">
      <input 
        type="range" 
        id="temperature" 
        min="0" 
        max="1" 
        step="0.1" 
        value={modelConfig.temperature} 
        on:input={handleTemperatureChange}
        class="range-input"
        disabled={isLoading}
      />
      <span class="range-value">{modelConfig.temperature}</span>
    </div>
  </div>
  
  <div class="settings-group">
    <label for="maxTokens">Max Tokens</label>
    <div class="number-input-container">
      <input 
        type="number" 
        id="maxTokens" 
        min="1" 
        max="4096" 
        value={modelConfig.maxTokens} 
        on:input={handleMaxTokensChange}
        class="number-input"
        disabled={isLoading}
      />
    </div>
  </div>
  
  <div class="settings-group">
    <button 
      class="reset-button" 
      on:click={handleReset}
      disabled={isLoading}
    >
      {isLoading ? 'Saving...' : 'Reset to Default Settings'}
    </button>
  </div>
  
  <div class="settings-section">
    <h3>Danger Zone</h3>
    <p class="section-description">
      These actions can't be undone. Be careful!
    </p>
    
    <div class="settings-group">
      <button class="danger-button" on:click={handleResetAllData}>
        <span class="button-icon">
          {@html createIcon('delete', 16)}
        </span>
        <span>Reset All Data</span>
      </button>
      <p class="setting-description">
        This will permanently delete all your data, including recipes, grocery lists, inventory, and settings.
      </p>
    </div>
  </div>
</div>

<!-- Reset Confirmation Modal -->
<ConfirmationModal
  show={showResetConfirmation}
  title="Reset All Data"
  message="This will permanently delete all your data, including recipes, grocery lists, inventory, and settings. This action cannot be undone."
  confirmButtonText="Reset All Data"
  confirmButtonClass="danger"
  on:confirm={confirmResetAllData}
  on:cancel={cancelResetAllData}
/>

<style>
  .settings-container {
    padding: 1.5rem;
    max-width: 600px;
    margin: 0 auto;
  }
  
  h2 {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--text-dark);
    margin-bottom: var(--space-6);
  }
  
  .settings-group {
    margin-bottom: var(--space-6);
  }
  
  label {
    display: block;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-base);
    margin-bottom: var(--space-2);
  }
  
  .select-input,
  .text-input,
  .number-input {
    width: 100%;
    padding: var(--space-3);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    background-color: var(--surface-white);
    color: var(--text-dark);
    font-size: var(--text-base);
    transition: all var(--transition-fast);
  }
  
  .select-input:hover,
  .text-input:hover,
  .number-input:hover {
    border-color: var(--border-hover);
  }
  
  .select-input:focus,
  .text-input:focus,
  .number-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary-light);
  }
  
  .api-key-input {
    display: flex;
    gap: var(--space-2);
  }
  
  .text-input {
    flex: 1;
  }
  
  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    background: var(--surface-white);
    color: var(--text-dark);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .icon-button:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: var(--border-hover);
  }
  
  .icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .range-input-container {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  
  .range-input {
    flex: 1;
    height: 6px;
    -webkit-appearance: none;
    background: var(--primary-light);
    border-radius: var(--radius-full);
    outline: none;
  }
  
  .range-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--primary);
    cursor: pointer;
    border: 2px solid var(--surface-white);
    box-shadow: var(--shadow-sm);
  }
  
  .range-value {
    min-width: 40px;
    text-align: center;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-dark);
  }
  
  .number-input-container {
    display: flex;
    align-items: center;
  }
  
  .reset-button {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background-color: var(--surface-white);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    color: var(--text-dark);
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .reset-button:hover {
    background-color: var(--surface-hover);
    border-color: var(--border-hover);
  }
  
  .settings-container.loading {
    opacity: 0.7;
    pointer-events: none;
  }
  
  .settings-container.loading button,
  .settings-container.loading input,
  .settings-container.loading select {
    cursor: not-allowed;
  }
  
  .setting-description {
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin-top: var(--space-1);
    line-height: 1.4;
  }
  
  .settings-section {
    margin-top: var(--space-xl);
    border-top: 1px solid var(--light-gray);
    padding-top: var(--space-lg);
  }
  
  .section-description {
    color: var(--dark-gray);
    margin-bottom: var(--space-md);
  }
  
  .danger-button {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    background-color: var(--danger, #e74c3c);
    color: var(--white);
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .danger-button:hover {
    background-color: var(--danger-dark, #c0392b);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .button-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .info-box {
    background-color: var(--accent-light, #3498db);
    color: var(--white);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }
  
  .info-box p {
    margin: 0 0 0.5rem 0;
    font-size: var(--text-sm);
  }
  
  .info-box p:last-child {
    margin-bottom: 0;
  }
</style>
