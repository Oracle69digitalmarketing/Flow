from fastapi import FastAPI, Request, HTTPException
from app.config import settings
import httpx
from contextlib import asynccontextmanager

from app.core.airia_client import AiriaClient
from app.core.orchestrator import Orchestrator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize clients on startup
    print("Initializing clients...")
    airia_client = AiriaClient()
    orchestrator = Orchestrator(airia_client=airia_client)
    app.state.airia_client = airia_client
    app.state.orchestrator = orchestrator
    print("Clients initialized.")
    yield
    # Clean up clients on shutdown (optional)
    print("Cleaning up clients...")


app = FastAPI(
    title="Flow - AI Sales Assistant",
    description="Orchestrator service for the Flow AI agent across multiple platforms.",
    version="0.1.0",
    lifespan=lifespan
)

@app.get("/", tags=["Health Check"])
async def read_root():
    """
    Root endpoint to check if the service is running.
    """
    return {"status": "ok", "message": "Flow Orchestrator is running"}

@app.post("/slack/events", tags=["Webhooks"])
async def webhook_slack(request: Request):
    """
    Handles incoming events from Slack.
    """
    orchestrator = request.app.state.orchestrator

    body = await request.json()
    event_type = body.get("type")

    # Handle Slack's URL verification challenge
    if event_type == "url_verification":
        return {"challenge": body.get("challenge")}

    # Handle actual events
    if event_type == "event_callback":
        event = body.get("event", {})
        # Ignore messages from bots to prevent loops
        if event.get("bot_id"):
            return {"status": "ok", "message": "Ignoring bot message"}

        message_text = event.get("text")
        user_id = event.get("user")
        channel_id = event.get("channel")

        if message_text and user_id:
            # We send an immediate 200 OK to Slack to avoid timeouts
            # and process the response asynchronously.
            print(f"Received message from Slack user {user_id}: '{message_text}'")
            
            response_from_orchestrator = await orchestrator.process_message(
                platform="slack",
                platform_user_id=user_id,
                message_text=message_text,
            )
            
            # Extract the reply from the orchestrator's response
            # Assuming the response from Airia has an 'output' key
            reply_text = response_from_orchestrator.get("output", "Sorry, I had trouble processing that.")

            # Post the reply back to the Slack channel
            async with httpx.AsyncClient() as client:
                try:
                    await client.post(
                        "https://slack.com/api/chat.postMessage",
                        headers={"Authorization": f"Bearer {settings.SLACK_BOT_TOKEN}"},
                        json={"channel": channel_id, "text": reply_text},
                    )
                except httpx.RequestError as e:
                    print(f"Error sending message to Slack: {e}")

    return {"status": "ok"}


# @app.post("/webhooks/whatsapp")
# async def webhook_whatsapp(request: Request):
#     # ... logic to handle whatsapp events
#     return {"status": "ok"}
