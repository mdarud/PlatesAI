import random
import string
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import get_db
from models import Recipe, Ingredient, ChatHistory, User, Inventory
from schemas import RecipeSchema, ChatRequest, InventorySchema
from uuid import UUID
from typing import List
from gemini_processor import generate_response, compare_inventory
import json
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","plates-p5zabpl0s-mdaruds-projects.vercel.app","https://plates-ai.vercel.app"],  # Change this to match your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        # Generate a random username
        random_username = "User_" + "".join(random.choices(string.ascii_letters + string.digits, k=8))
        
        # Create a new user
        user = User(id=request.user_id, username=random_username)
        db.add(user)
        db.commit()
        db.refresh(user)
    inventory_items = db.query(Inventory).filter(Inventory.user_id == request.user_id).all()
    # Create a list of dictionaries from the inventory items
    if not inventory_items:
        inventory_json = ""
    else:
        inventory_list = [
            {"id": item.id, "name": item.ingredient_name, "amount": item.amount} for item in inventory_items
        ]
        inventory_json = json.dumps(inventory_list)

    response = generate_response(request.message)

    response = json.loads(response)
    if response["intent"] != "unknown" and response["intent"] != "question":
        chat_entry = ChatHistory(user_id=request.user_id, message=request.message, response=response["ai_response"])
        db.add(chat_entry)
        db.commit()

    print(response)

    if response["intent"] == "save_recipe":
        recipe_data = response["recipe"]
        recipe = Recipe(
            user_id=request.user_id,
            title=recipe_data["title"],
            description=recipe_data["description"],
            servings=recipe_data["servings"],
            tools=recipe_data["tools"],
            methods=recipe_data["methods"],
            keywords=recipe_data["keywords"]
        )
        db.add(recipe)
        db.commit()
        db.refresh(recipe)

        for ingredient in recipe_data["ingredients"]:
            db.add(Ingredient(recipe_id=recipe.id, name=ingredient["name"], amount=ingredient["amount"]))
        db.commit()
    elif response["intent"] == "search_recipe":
        return {"intent": response["intent"], "ai_response": response["ai_response"], "recipe": response["recipe"]}
    elif response["intent"] == "search_with_inventory":
        response = generate_response(request.message + ". My Inventory: " + inventory_json)
        return {"intent": response["intent"], "ai_response": response["ai_response"], "recipe": response["recipe"]}
    elif response["intent"] == "save_inventory":
        inventory_data = response["recipe"]["ingredients"]
        for ingredient in inventory_data:
            inventory_item = db.query(Inventory).filter(func.lower(Inventory.ingredient_name) == ingredient["name"].lower(),Inventory.user_id == request.user_id).first()
            if inventory_item:
                inventory_item.amount = ingredient["amount"] # Update amount
            else:
                db.add(Inventory(user_id=request.user_id, ingredient_name=ingredient["name"], amount=ingredient["amount"]))
        db.commit()
    elif response["intent"] == "question":
        backtrack = db.query(ChatHistory).filter(ChatHistory.user_id == request.user_id).order_by(desc(ChatHistory.timestamp)).first()
        print("AI question: " + backtrack.response + "; User answer: " + request.message)
        response = generate_response("AI question: " + backtrack.response + "; User answer: " + request.message)
        print(response)
        response = json.loads(response)
        chat_entry = ChatHistory(user_id=request.user_id, message=request.message, response=response["ai_response"])
        db.add(chat_entry)
        db.commit()
        return {"intent": response["intent"], "ai_response": response["ai_response"], "recipe": response["recipe"]}


    return {"intent": response["intent"], "ai_response": response["ai_response"]}

@app.get("/recipes/{recipe_id}")
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    return recipe

@app.get("/chat/history/{user_id}", response_model=List[dict])
def get_chat_history(user_id: str, db: Session = Depends(get_db)):
    # Fetch chat history ordered by timestamp
    chat_history = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == user_id)
        .order_by(ChatHistory.timestamp)  # Change 'timestamp' to match your actual column name
        .all()
    )

    # Return an empty list if no chat history
    if not chat_history:
        return []

    history = []
    for chat in chat_history:
        history.append({"sender": "You", "text": chat.message})  # User message
        history.append({"sender": "AI", "text": chat.response})  # AI response

    return history

@app.get("/inventory/{user_id}", response_model=List[InventorySchema])
def get_inventory(user_id: str, db: Session = Depends(get_db)):
    inventory_items = db.query(Inventory).filter(Inventory.user_id == user_id).all()

    if not inventory_items:
        return []

    return inventory_items

@app.post("/update-inventory")
def update_inventory(request: ChatRequest, db: Session = Depends(get_db)):
    print(request)
    
    # Check if the user exists; if not, create a new user
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        random_username = "User_" + "".join(random.choices(string.ascii_letters + string.digits, k=8))
        user = User(id=request.user_id, username=random_username)
        db.add(user)
        db.commit()
        db.refresh(user)

    print(request)

    inventory_items = db.query(Inventory).filter(Inventory.user_id == request.user_id).all()
    # Create a list of dictionaries from the inventory items
    if not inventory_items:
        inventory_json = ""
    else:
        inventory_list = [
            {"id": item.id, "name": item.ingredient_name, "amount": item.amount} for item in inventory_items
        ]
        inventory_json = json.dumps(inventory_list)
    response = json.loads(compare_inventory(inventory_json, request.message))
    
    print(response)
    # Process each ingredient from the request
    for ingredient in response:  # Assuming request.ingredients contains a list of ingredients
        ingredient_id = ingredient.get("id")  # Get the ID of the inventory item
        name = ingredient.get("name")  # Get the name of the ingredient
        amount = ingredient.get("amount")  # Get the new amount for the ingredient
        
        if int(ingredient_id) != -1:  # Assuming -1 indicates a new item
            # Update the existing inventory item by ID
            inventory_item = db.query(Inventory).filter(Inventory.id == ingredient_id, Inventory.user_id == request.user_id).first()
            if inventory_item:
                inventory_item.ingredient_name = name  # Update name
                inventory_item.amount = amount  # Update amount
                print(f"Updated inventory item ID {ingredient_id} to amount {amount}.")
            else:
                print(f"Inventory item ID {ingredient_id} not found, skipping update.")
        else:
            # Add a new inventory item
            new_item = Inventory(user_id=request.user_id, ingredient_name=name, amount=amount)
            db.add(new_item)
            print(f"Added new inventory item: {name} with amount {amount}.")
        if amount == "-1" :
            inventory_item = db.query(Inventory).filter(Inventory.id == ingredient_id, Inventory.user_id == request.user_id).first()
            if inventory_item:
                db.delete(inventory_item)  # Delete the item

    db.commit()  # Commit changes to the database

    # Fetch the updated inventory list
    inventory_items = db.query(Inventory).filter(Inventory.user_id == request.user_id).all()
    
    if not inventory_items:
        return []

    return inventory_items