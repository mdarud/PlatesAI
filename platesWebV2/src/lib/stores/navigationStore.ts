import { writable } from 'svelte/store';

// Define valid section types
export type Section = 'chat' | 'recipes' | 'inventory' | 'grocery' | 'settings';

// Create a writable store for the current section
export const currentSection = writable<Section>('chat');
