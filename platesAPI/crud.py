from sqlalchemy.orm import Session
from models import User, Recipe, Ingredient, Inventory, ChatHistory
import schemas

# Create User
def create_user(db: Session, user: schemas.UserCreate):
    db_user = User(username=user.username)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Create Recipe
def create_recipe(db: Session, recipe: schemas.RecipeCreate, user_id: str):
    db_recipe = Recipe(user_id=user_id, **recipe.dict())
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

# Create Chat Entry
def save_chat(db: Session, user_id: str, message: str, response: str):
    chat_entry = ChatHistory(user_id=user_id, message=message, response=response)
    db.add(chat_entry)
    db.commit()
    return chat_entry

# Get User's Chat History
def get_chat_history(db: Session, user_id: str, limit=5):
    return db.query(ChatHistory).filter(ChatHistory.user_id == user_id).order_by(ChatHistory.timestamp.desc()).limit(limit).all()
