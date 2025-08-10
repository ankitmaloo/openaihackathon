import asyncio
import os
from datetime import datetime
from typing import List

from agents import Agent, Runner, function_tool
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

from gpt_assistant import *
from firebase import create_conversation

# --- 1. SETUP AND CONFIGURATION ---

# Load environment variables from a .env file (for OPENAI_API_KEY)
load_dotenv()

# Ensure the OpenAI API key is available
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable is not set. Please create a .env file or set it manually.")


# ==============================================================================
# 3. FASTAPI APPLICATION SETUP
# ==============================================================================

# --- Pydantic Models for API Data Structure ---
class Message(BaseModel):
    agent: str
    text: str
    timestamp: datetime

class Instruction(BaseModel):
    query: str

# --- FastAPI App and In-Memory History Store ---
app = FastAPI()
conversation_history: List[Message] = []



# ==============================================================================
# 5. API ENDPOINTS
# ==============================================================================

@app.post("/start")
async def start_conversation(query: Instruction, background_tasks: BackgroundTasks):
    """
    Receives a prompt, starts the agent conversation in the background,
    and returns an immediate confirmation.
    """

    # Add the synchronous wrapper function to the background tasks
    # Create conversation with auto-generated ID and return it
    conversation_id = create_conversation(metadata={"status": "running"})

    background_tasks.add_task(
        run_proc, query.query, conversation_id
    )

    return {
        "message": "Mission accepted. On it.",
        "conversation_id": conversation_id,
    }

@app.get("/history", response_model=List[Message])
async def get_conversation_history():
    """
    Fetches the current state of the conversation history.
    The frontend can poll this endpoint every few seconds to get live updates.
    """
    return conversation_history

@app.get("/")
def read_root():
    """A simple root endpoint to confirm the server is running."""
    return {"message": "Agent-to-Agent Backend is running. Use /docs to see the API."}
