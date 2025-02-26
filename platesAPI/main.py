import os
import json
from fastapi import FastAPI, Depends
from gemini_processor import generate_response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db

app = FastAPI()

# Request Schema
class ChatRequest(BaseModel):
    user_id: str
    message: str

@app.get("/")
def read_root():
    return {"message": "Welcome to the Plates API"}

@app.post("/chat/", summary="Chat with AI", tags=["Chat"])
def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    """
    **Chat with the AI (Gemini)**
    
    - **user_id**: Unique identifier for the user
    - **message**: User's message
    
    **Response**:
    - AI-generated reply
    """
    res = generate_response(request.message)
    print(json.loads(res))
    return {"response": res}