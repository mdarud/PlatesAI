import os
import google.generativeai as genai
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Recipe, Ingredient, Method, Tool
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing in .env file")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-pro")
db = Depends(get_db)

def detect_intent(prompt: str) -> str: 
    response = model.generate_content(
        f"""Classify the following user request as either 'search_recipe' or 'save_recipe'.
        If intent is 'search_recipe' then get this properties (if mentioned) for searching 'title', 'servings', 'description', 'ingredients', 'tools', 'methods', 'keywords'.
        If intent is 'save_recipe' then get this properties (if mentioned) for saving 'title', 'servings', 'description', 'ingredients', 'tools', 'methods', 'keywords'.
        If intent is 'save_inventory' then extract ingredients and store them especially if there "I have ...".

        example: If the user write something like 'Lemon Chicken' which can be a title recipe but also can be ingredients too, so put it in title and/or ingredients.
        example: If the user write it like 'I want chicken with rosemary' then find out what the title of the food with that recipe to be a title and insert chicken and rosemary as ingredients.

        Example (for invetory related): 
        - "I have two onions, 6 cloves of garlic, and a whole chicken" → save_inventory.
        - "I have two onions, 6 cloves of garlic, and a whole chicken. What recipe can I make?" → the intent become "save_inventory,search_recipe" strict.
        - "Recommend me recipes I can make with my inventory" → search_recipe using stored inventory.
        Note for out of topic (culinary):
        - Response only with ai_response
        - only answers with culinary related answer if its out of topic then try to sway them to ask about culinary except if the request related to films, series, and actors try to recommend them recipes from the shows or movie
        - Example: Who is Leslie Knope? She is a character in Parks and Rec, but do you want the recipe of Leslie Knope's Waffle?
        """
        f"""The output should be in JSON format like this if save_recipe (Don't write "json" prefix in the response and strictly follow the format):
        {{
            "intent": "search_recipe/save_recipe/save_inventory (can be combination of save_inventory and search_recipe)",
            "title": "Recipe Title",
            "description": "Brief description of the recipe",
            "ingredients": [
                {{"name": "Flour", "amount": "2 cups"}},
                {{"name": "Eggs", "amount": "2"}}
            ],
            "steps": [
                "Step 1: Mix ingredients",
                "Step 2: Heat pan",
                "Step 3: Pour batter"
            ],
            "servings": "4",
            "tools": ["Mixing bowl", "Whisk", "Pan"],
            "methods": ["Frying", "Mixing"]
            "keywords": "generate the keywords for the recipe like the flavors, main ingredients, type of food/drink, etc (must be string. ex. "sour, chicken, sweet, lemon, protein")
            "ai_response": "Create your additional response to send to the user in the chat"
        }}
        """
        f"Request: {prompt}"
    )
    
    return response.text.strip().replace("json", "")

    
def ask_gemini_about_match(user_query: str, db_results: list):
    """ Let Gemini decide if database results are relevant """
    db_recipes = [
        f"ID: {r.id}, Title: {r.title}, Description: {r.description}" for r in db_results
    ]

    prompt = (
        f"A user is searching for: '{user_query}'.\n"
        f"Here are some recipes from the database:\n{db_recipes}\n"
        f"Do any of these recipes match the user request? Answer 'yes' or 'no' and explain why."
        f"If yes, list the IDs of matching recipes in a JSON format: {{'matched_ids': [1, 2, 3]}}."
    )

    response = model.generate_content(prompt)

    print("Ask response:", response.text)

    return response.text.lower()


def generate_recipe_with_ai(user_query: str):
    """ Use Gemini AI to generate a recipe if no match is found in DB """
    prompt = f"Find a detailed recipe for or that satisfy the requirements: {user_query}"
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content(prompt)
    return response.text  # Extract recipe text from AI response
    
def search_recipes_in_db(
    db: Session,
    title: str = None,
    desc: str = None,
    ingredients: list = None,
    tools: list = None,
    methods: list = None,
    keywords: str = None
) -> list:
    """Search for matching recipes in the database"""

    # Ensure default values for None parameters
    title = title or ""
    desc = desc or ""
    ingredients = ingredients or []
    tools = tools or []
    methods = methods or []

    # Base query
    query = db.query(Recipe)

    # Add filters only if the parameter is provided
    filters = []
    
    if title:
        filters.append(Recipe.title.ilike(f"%{title.lower()}%"))
    
    if desc:
        filters.append(Recipe.description.ilike(f"%{desc.lower()}%"))

    if ingredients:
        for ingredient in ingredients:
            filters.append(Recipe.ingredients.any(Ingredient.name.ilike(f"%{ingredient['name'].lower()}%")))

    if tools:
        for tool in tools:
            filters.append(Recipe.tools.any(Tool.tool_name.ilike(f"%{tool.lower()}%")))

    if methods:
        for method in methods:
            filters.append(Recipe.methods.any(Method.method_name.ilike(f"%{method.lower()}%")))
    
    if keywords:
        keywords = keywords.strip().split(",")
        print(keywords)
        for word in keywords:
            filters.append(Recipe.keywords.ilike(f"%{word.lower()}%"))

    # Apply filters if any exist
    if filters:
        query = query.filter(or_(*filters))

    return query.distinct().all()


def extract_recipe(input_text: str) -> dict:
    """
    Process the input text using Gemini AI and extract structured recipe details.
    """
    try:
        prompt = f"""
        Extract the following recipe into structured JSON format, help add the keywords:
        ---
        {input_text}
        ---
        The output should be in JSON format like this:
        {{
            "title": "Recipe Title",
            "description": "Brief description of the recipe",
            "ingredients": [
                {{"name": "Flour", "amount": "2 cups"}},
                {{"name": "Eggs", "amount": "2"}}
            ],
            "steps": [
                "Step 1: Mix ingredients",
                "Step 2: Heat pan",
                "Step 3: Pour batter"
            ],
            "servings": "4",
            "tools": ["Mixing bowl", "Whisk", "Pan"],
            "methods": ["Frying", "Mixing"]
            "keywords": "generate your own keywords for the recipe like the flavors, main ingredients, type of food/drink, etc (ex. "sour, chicken, sweet, lemon, protein")
        }}
        Don't use "json" prefix in the response.
        """
        response = model.generate_content(prompt).text
        return response  # This should be JSON formatted string
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None

