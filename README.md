# PlatesAI

PlatesAI is an AI-powered recipe assistant that helps you discover, save, and manage recipes. It features a unique sticky note interface for organizing recipes and a smart inventory system that tracks your ingredients.

**Current Version**: Alpha

**Created by**: [Muhammad Daru Darmakusuma](https://github.com/mdarud) | [LinkedIn](https://linkedin.com/in/drmksm)

## Features

- **AI Recipe Assistant**: Chat with the AI to get recipe suggestions, cooking tips, and more
- **Sticky Note Interface**: Save recipes, grocery lists, and notes in a flexible, visual format
- **Inventory Management**: Track your ingredients and get suggestions based on what you have
- **Recipe-Inventory Cross-checking**: Check if you have all the ingredients for a recipe
- **Grocery List Generation**: Create grocery lists for missing ingredients
- **Mobile-Friendly Design**: Responsive layout that works well on all devices

## Key Functionality

### Recipe Assistant
- Ask for recipe suggestions based on ingredients, cuisine, or dietary preferences
- Get detailed recipes with ingredients, steps, tools, and methods
- Save recipes to sticky notes for easy reference

### Inventory Management
- Add ingredients to your inventory with "Add [ingredient] to my inventory"
- Remove ingredients with "Remove [ingredient] from my inventory"
- Update quantities by editing the inventory sticky note
- Cross-check recipes against your inventory to see what you have and what you need

### Sticky Notes
- Drag and resize notes to organize your workspace
- Minimize notes to save space
- Change note colors to categorize different types of content
- Edit note content directly

## Technical Details

PlatesAI is a client-side web application built with:

- **Frontend**: SvelteKit, TypeScript, CSS
- **AI**: Google Gemini API
- **Storage**: Browser localStorage for data persistence
- **Styling**: Custom CSS with variables for consistent theming

The application is designed to work entirely client-side, with no backend dependencies. All data is stored locally in the browser's localStorage.

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file in the `platesWeb` directory with your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server with `npm run dev`
5. Open your browser to the URL shown in the terminal (typically http://localhost:5173)

## Usage Tips

- Start by asking the AI for a recipe, like "Show me a pasta recipe"
- Add ingredients to your inventory with "Add tomatoes, garlic, and pasta to my inventory"
- Check if you have all ingredients for a recipe with the "Check Ingredients" button
- Save recipes to sticky notes for easy reference
- Generate grocery lists for missing ingredients
- Remove ingredients from your inventory when you use them up

## Future Improvements

- API key security enhancements
- Data export/import functionality
- User preferences and settings
- Progressive Web App (PWA) features for offline support
- Enhanced mobile experience
- Multi-device synchronization
- Community features for recipe sharing


