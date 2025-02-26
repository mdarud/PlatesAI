from sqlalchemy import Column, Integer, String, ForeignKey, Text, TIMESTAMP, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    servings = Column(Integer)
    tools = Column(ARRAY(Text))  # ["knife", "oven"]
    methods = Column(ARRAY(Text))  # ["bake", "stir"]
    keywords = Column(Text)  # "vegan, high-protein"
    created_at = Column(TIMESTAMP, server_default=func.now())

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    amount = Column(String(100))  # "200g", "1 tbsp"

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    ingredient_name = Column(String(255), nullable=False)
    amount = Column(String(100))
    expires_at = Column(TIMESTAMP)

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, server_default=func.now())
