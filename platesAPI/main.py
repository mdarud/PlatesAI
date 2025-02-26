from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, schemas, crud
from gemini_processor import extract_recipe, detect_intent, search_recipes_in_db, ask_gemini_about_match, generate_recipe_with_ai
from typing import List, Optional
import json
import re

app = FastAPI()

# Ensure DB Tables Exist
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Plates API"}

@app.post("/process-recipe/")
async def process_recipe(input_text: str, db: Session = Depends(get_db)):
    response = extract_recipe(input_text)

    if not response:
        raise HTTPException(status_code=500, detail="Failed to process recipe.")

    try:
        # Remove the 'json' prefix if present
        if response.strip().startswith("json"):
            response = response.strip()[4:].strip()

        print("Raw response:", response)

        # Convert the string response to a dictionary
        parsed_response = json.loads(response)

        parsed_response["servings"] = parsed_response["servings"] if parsed_response["servings"] else None

        parsed_response["title"] = parsed_response["title"] if parsed_response["title"] else None

        parsed_response["description"] = parsed_response["description"] if parsed_response["description"] else None

        # Ensure steps are structured
        parsed_response["steps"] = [
            {"step_number": i + 1, "instruction": step}
            for i, step in enumerate(parsed_response.get("steps", []))
        ]

        # Ensure ingredients have correct amount type
        for ingredient in parsed_response.get("ingredients", []):
            ingredient["amount"] = str(ingredient["amount"])

        # Convert tools and methods into structured objects
        parsed_response["tools"] = [{"tool_name": tool} for tool in parsed_response.get("tools", [])]
        parsed_response["methods"] = [{"method_name": method} for method in parsed_response.get("methods", [])]

        print("Parsed response:", parsed_response)

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON format from Gemini.")

    new_recipe = crud.create_recipe(db, schemas.RecipeCreateSchema(**parsed_response))
    return {"message": "Recipe saved!", "recipe_id": new_recipe.id}

@app.get("/prompt/")
async def search_recipe(user_query: str, db: Session = Depends(get_db)):
    response = detect_intent(user_query)
    print(response)

    if not response:
        raise HTTPException(status_code=500, detail="Failed to process recipe.")

    try:
        print(type(response))
        data = json.loads(response)

        print(data)
        if "intent" not in data:
            return {"message": data["ai_response"]}
        
        if data["intent"] == "search_recipe":
            db_results = search_recipes_in_db(
                db,
                data.get('title', ""),
                data.get('description', ""),
                data.get('ingredients', []),
                data.get('tools', []),
                data.get('methods', []),
                data.get('keywords', [])
            )

            if db_results:
                ai_decision = ask_gemini_about_match(user_query, db_results)

                # Extract matched IDs from AI response
                matched_ids = []
                try:
                    json_match = re.search(r"\{.*'matched_ids': \[(.*?)\].*\}", ai_decision)
                    if json_match:
                        matched_ids = [int(i) for i in json_match.group(1).split(",") if i.strip().isdigit()]
                        print(matched_ids)
                except Exception as e:
                    print("Error parsing AI response:", e)

                if "yes" in ai_decision and matched_ids:
                    return {
                        "source": "database",
                        "ai_verdict": ai_decision,
                        "recipes": [
                            {"id": r.id, "title": r.title, "description": r.description}
                            for r in db_results if r.id in matched_ids
                        ]
                    }

            # If no relevant match, generate with AI
            ai_recipe = generate_recipe_with_ai(user_query)
            return {"source": "ai", "recipe": ai_recipe}
        elif data["intent"] == "save_recipe":
            parsed_response = data

            parsed_response.pop("intent")

            parsed_response["servings"] = parsed_response["servings"] if parsed_response["servings"] else None

            parsed_response["title"] = parsed_response["title"] if parsed_response["title"] else None

            parsed_response["description"] = parsed_response["description"] if parsed_response["description"] else None

            # Ensure steps are structured
            parsed_response["steps"] = [
                {"step_number": i + 1, "instruction": step}
                for i, step in enumerate(parsed_response.get("steps", []))
            ]

            # Ensure ingredients have correct amount type
            for ingredient in parsed_response.get("ingredients", []):
                ingredient["amount"] = str(ingredient["amount"])

            # Convert tools and methods into structured objects
            parsed_response["tools"] = [{"tool_name": tool} for tool in parsed_response.get("tools", [])]
            parsed_response["methods"] = [{"method_name": method} for method in parsed_response.get("methods", [])]
            new_recipe = crud.create_recipe(db, schemas.RecipeCreateSchema(**parsed_response))
            return {"message": "Recipe saved!", "recipe_id": new_recipe.id}
        else:
            return {"message": data["ai_response"]}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=response)


@app.post("/recipes/", response_model=schemas.RecipeSchema)
def create_recipe(recipe: schemas.RecipeCreateSchema, db: Session = Depends(get_db)):
    return crud.create_recipe(db, recipe)

@app.get("/recipes/{recipe_id}", response_model=schemas.RecipeSchema)
def read_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = crud.get_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

@app.get("/recipes/", response_model=list[schemas.RecipeSchema])
def read_all_recipes(db: Session = Depends(get_db)):
    return crud.get_all_recipes(db)