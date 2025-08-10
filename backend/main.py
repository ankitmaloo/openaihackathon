import asyncio
import os
from datetime import datetime
from typing import List

from agents import Agent, Runner, function_tool
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import StreamingResponse
import json
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


from gpt_assistant import *
from firebase import create_conversation
from progress import wait_first_turn

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

origins = ['*']

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Add this line
    allow_origin_regex=None,
)



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

    async def sse_stream():
        payload = {
            "message": "Mission accepted. On it.",
            "conversation_id": conversation_id,
        }
        # Initial event with basic payload
        yield f"event: init\ndata: {json.dumps(payload)}\n\n"
        # Heartbeats until the first turn is persisted
        while True:
            started = await wait_first_turn(conversation_id, timeout=1.0)
            if started:
                break
            # periodic heartbeat
            hb = {"conversation_id": conversation_id, "ts": datetime.utcnow().isoformat() + "Z"}
            yield f"event: heartbeat\ndata: {json.dumps(hb)}\n\n"
        # Final event to close out the stream when background signals ready
        done_payload = {"conversation_id": conversation_id, "status": "started"}
        yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

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
