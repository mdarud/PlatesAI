from pydantic import BaseModel, UUID4
from typing import List, Optional

class IngredientSchema(BaseModel):
    name: str
    amount: str

class RecipeSchema(BaseModel):
    title: str
    description: str
    servings: str
    tools: List[str]
    methods: List[str]
    keywords: str
    ingredients: List[IngredientSchema]

class ChatRequest(BaseModel):
    message: str
    user_id: UUID4  # Ensure user_id is a valid UUID

class InventorySchema(BaseModel):
    user_id: UUID4  # Ensure user_id is a valid UUID
    ingredient_name: str
    amount: Optional[str] = None
    expires_at: Optional[str] = None  # Use ISO 8601 date format (YYYY-MM-DD)

    class Config:
        orm_mode = True
