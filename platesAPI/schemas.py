from pydantic import BaseModel
from typing import List, Optional

class IngredientSchema(BaseModel):
    name: str
    amount: Optional[str] = None

class StepSchema(BaseModel):
    step_number: int
    instruction: str

class ToolSchema(BaseModel):
    tool_name: str

class MethodSchema(BaseModel):
    method_name: str

class RecipeCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    servings: Optional[str] = None
    ingredients: List[IngredientSchema]
    steps: List[StepSchema]
    tools: List[ToolSchema]
    methods: List[MethodSchema]
    keywords: Optional[str] = None

class RecipeSchema(RecipeCreateSchema):
    id: int
    class Config:
        from_attributes = True  # Replaces `orm_mode = True`
