from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    username = Column(String(50), unique=True, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

    recipes = relationship("Recipe", back_populates="user")
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="user", cascade="all, delete-orphan")

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="chat_history")

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    servings = Column(String(255))
    tools = Column(ARRAY(Text))
    methods = Column(ARRAY(Text))
    keywords = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="recipes")
    ingredients = relationship("Ingredient", back_populates="recipe")

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    amount = Column(String(100))

    recipe = relationship("Recipe", back_populates="ingredients")

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ingredient_name = Column(String(255), nullable=False)
    amount = Column(String(100))
    expires_at = Column(TIMESTAMP, nullable=True)

    user = relationship("User", back_populates="inventory")
