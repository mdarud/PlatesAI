from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

# User Schema
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Recipe Schema
class RecipeBase(BaseModel):
    title: str
    description: Optional[str] = None
    servings: Optional[int] = None
    tools: Optional[List[str]] = None
    methods: Optional[List[str]] = None
    keywords: Optional[str] = None

class RecipeCreate(RecipeBase):
    pass

class RecipeResponse(RecipeBase):
    id: int
    user_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Ingredient Schema
class IngredientBase(BaseModel):
    name: str
    amount: Optional[str] = None

class IngredientCreate(IngredientBase):
    recipe_id: int

class IngredientResponse(IngredientBase):
    id: int
    recipe_id: int

    class Config:
        from_attributes = True

# Inventory Schema
class InventoryBase(BaseModel):
    ingredient_name: str
    amount: Optional[str] = None
    expires_at: Optional[datetime] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryResponse(InventoryBase):
    id: int
    user_id: uuid.UUID

    class Config:
        from_attributes = True

# Chat Schema
class ChatBase(BaseModel):
    user_id: uuid.UUID
    message: str

class ChatResponse(ChatBase):
    response: str
    timestamp: datetime

    class Config:
        from_attributes = True
