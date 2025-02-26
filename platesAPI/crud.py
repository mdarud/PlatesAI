from sqlalchemy.orm import Session
from models import Recipe, Ingredient, Step, Tool, Method
from schemas import RecipeCreateSchema

def create_recipe(db: Session, recipe_data: RecipeCreateSchema):
    """Create a new recipe and related data"""

    # Create Recipe
    recipe = Recipe(
        title=recipe_data.title,
        description=recipe_data.description,
        servings=recipe_data.servings,
        keywords=recipe_data.keywords
    )
    db.add(recipe)
    db.flush()  # Ensure recipe.id is available before inserting related data

    # Insert ingredients
    ingredients = [Ingredient(recipe_id=recipe.id, **ingredient.dict()) for ingredient in recipe_data.ingredients]
    db.add_all(ingredients)

    # Insert steps
    steps = [Step(recipe_id=recipe.id, **step.dict()) for step in recipe_data.steps]
    db.add_all(steps)

    # Insert tools
    tools = [Tool(recipe_id=recipe.id, **tool.dict()) for tool in recipe_data.tools]
    db.add_all(tools)

    # Insert methods
    methods = [Method(recipe_id=recipe.id, **method.dict()) for method in recipe_data.methods]
    db.add_all(methods)

    db.commit()
    db.refresh(recipe)
    return recipe

def get_recipe(db: Session, recipe_id: int):
    """Retrieve a recipe by ID"""
    return db.query(Recipe).filter(Recipe.id == recipe_id).first()

def get_all_recipes(db: Session):
    """Retrieve all recipes"""
    return db.query(Recipe).all()
