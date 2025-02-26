import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Set API Key manually if environment variable is not working
API_KEY = os.getenv("GEMINI_API_KEY")

def generate_response(text):
    client = genai.Client(api_key=API_KEY)

    model = "gemini-2.0-pro-exp-02-05"

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=text),
            ],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        temperature=1,
        top_p=0.95,
        top_k=64,
        max_output_tokens=8192,
        response_mime_type="application/json",
        response_schema=genai.types.Schema(
            type=genai.types.Type.OBJECT,
            required=["intent", "ai_response"],
            properties={
                "intent": genai.types.Schema(type=genai.types.Type.STRING),
                "recipe": genai.types.Schema(
                    type=genai.types.Type.OBJECT,
                    required=["title", "description", "ingredients", "steps", "servings", "tools", "methods", "keywords"],
                    properties={
                        "title": genai.types.Schema(type=genai.types.Type.STRING),
                        "description": genai.types.Schema(type=genai.types.Type.STRING),
                        "ingredients": genai.types.Schema(
                            type=genai.types.Type.ARRAY,
                            items=genai.types.Schema(
                                type=genai.types.Type.OBJECT,
                                required=["name", "amount"],
                                properties={
                                    "name": genai.types.Schema(type=genai.types.Type.STRING),
                                    "amount": genai.types.Schema(type=genai.types.Type.STRING),
                                },
                            ),
                        ),
                        "steps": genai.types.Schema(
                            type=genai.types.Type.ARRAY,
                            items=genai.types.Schema(type=genai.types.Type.STRING),
                        ),
                        "servings": genai.types.Schema(type=genai.types.Type.STRING),
                        "tools": genai.types.Schema(
                            type=genai.types.Type.ARRAY,
                            items=genai.types.Schema(type=genai.types.Type.STRING),
                        ),
                        "methods": genai.types.Schema(
                            type=genai.types.Type.ARRAY,
                            items=genai.types.Schema(type=genai.types.Type.STRING),
                        ),
                        "keywords": genai.types.Schema(type=genai.types.Type.STRING),
                    },
                ),
                "ai_response": genai.types.Schema(type=genai.types.Type.STRING),
            },
        ),
        system_instruction=[
            types.Part.from_text(
                text="""1. Classify the user request into one of these intents:
   - `search_recipe`
   - `save_recipe`
   - `save_inventory`
   - `search_with_inventory`
   - `out_of_topic`

2. **Handling Intent Cases:**
   - If intent includes `search_recipe` or `search_with_inventory`, generate a **complete recipe** inside the `recipe` object.
   - If intent includes `save_inventory`, extract ingredients and store them.
   - If intent is `search_with_inventory`, use the stored inventory to find relevant recipes.
   - If intent is `out_of_topic`, **do not generate a recipe**. Just set `"intent": "out_of_topic"`.

3. **Recipe Object Requirements (When Searching for a Recipe):**
   - The `recipe` object must include **all properties** (`title`, `description`, `ingredients`, `steps`, `servings`, `tools`, `methods`, `keywords`).
   - Provide an AI-generated **description, keywords, and additional details**.
   - If searching with inventory, prioritize **recipes using stored ingredients**.

4. **Out-of-Topic Handling:**
   - If the request is not culinary-related, **do not generate a recipe**.
   - Instead, respond conversationally and redirect to food topics with the recipe from the media, character, film, series, actor they are asking.
   - If the user keeps going off-topic, just acknowledge the request and provide friendly guidance back to cooking.
"""
            ),
        ],
    )

    # Send request to Gemini API and return the response
    response_text = ""
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        response_text += chunk.text  # Collect the response

    return response_text  # Return the full response


