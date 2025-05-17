import { writable } from 'svelte/store';
import type { 
  AIModelConfig, 
  AIModelType, 
  AIModelVersion,
  GeminiModelVersion,
  OpenAIModelVersion,
  ClaudeModelVersion,
  MockModelVersion
} from '../services/types';
import { browser } from '$app/environment';
import { aiModelConfigService } from '../services/dataService';

// Default model versions for each provider
const DEFAULT_MODEL_VERSIONS = {
  gemini: 'gemini-2.5-flash-preview-04-17' as GeminiModelVersion,
  openai: 'gpt-3.5-turbo' as OpenAIModelVersion,
  claude: 'claude-3-sonnet' as ClaudeModelVersion,
  mock: 'default' as MockModelVersion
};

// Default model configuration
const DEFAULT_MODEL_CONFIG: AIModelConfig = {
  type: 'default',
  apiKey: '', // Will be loaded from environment variables when type is 'default'
  temperature: 0.7,
  maxTokens: 4096,
  model: 'gemini-2.5-flash-preview-04-17' as GeminiModelVersion,
  ingredientCheckMethod: 'direct' // Default to direct comparison for reliability
};

// Create a writable store with the default config
function createAIModelStore() {
  const { subscribe, set, update } = writable<AIModelConfig>(DEFAULT_MODEL_CONFIG);
  
  // Initialize store with saved data
  async function initStore() {
    if (!browser) return;

    try {
      // Try to get config from dataService
      const storedConfig = await aiModelConfigService.getAIModelConfig();
      
      if (storedConfig && isValidConfig(storedConfig)) {
        // Ensure all properties exist, adding defaults for missing ones
        const completeConfig = ensureCompleteConfig(storedConfig);
        set(completeConfig);
        
        // Save the complete config back if it was modified
        if (JSON.stringify(storedConfig) !== JSON.stringify(completeConfig)) {
          await aiModelConfigService.setAIModelConfig(completeConfig);
        }
      } else {
        // If no valid stored config found, use default
        set(DEFAULT_MODEL_CONFIG);
        await aiModelConfigService.setAIModelConfig(DEFAULT_MODEL_CONFIG);
      }
    } catch (error) {
      console.error('Error initializing store:', error);
      set(DEFAULT_MODEL_CONFIG);
    }
  }
  
  // Validate config object
  function isValidConfig(config: any): config is AIModelConfig {
    return (
      config &&
      typeof config === 'object' &&
      typeof config.type === 'string' &&
      typeof config.apiKey === 'string' &&
      typeof config.temperature === 'number' &&
      typeof config.maxTokens === 'number' &&
      typeof config.model === 'string'
    );
  }
  
  // Add missing properties to config if needed
  function ensureCompleteConfig(config: AIModelConfig): AIModelConfig {
    // If ingredientCheckMethod is missing, add it with default value
    if (!config.ingredientCheckMethod) {
      config.ingredientCheckMethod = DEFAULT_MODEL_CONFIG.ingredientCheckMethod;
    }
    return config;
  }
  
  // Initialize the store
  if (browser) {
    initStore();
  }
  
  return {
    subscribe,
    update: async (updater: (config: AIModelConfig) => AIModelConfig) => {
      update(config => {
        const newConfig = updater(config);
        if (browser) {
          // Save to dataService
          aiModelConfigService.setAIModelConfig(newConfig)
            .catch(error => {
              console.error('Error saving config:', error);
            });
        }
        return newConfig;
      });
    },
    set: async (value: AIModelConfig) => {
      set(value);
      if (browser) {
        // Save to dataService
        try {
          await aiModelConfigService.setAIModelConfig(value);
        } catch (error) {
          console.error('Error saving config:', error);
        }
      }
    },
    reset: async () => {
      set(DEFAULT_MODEL_CONFIG);
      if (browser) {
        // Save to dataService
        try {
          await aiModelConfigService.setAIModelConfig(DEFAULT_MODEL_CONFIG);
        } catch (error) {
          console.error('Error saving config:', error);
        }
      }
    }
  };
}

// Export the store
export const aiModelStore = createAIModelStore();
