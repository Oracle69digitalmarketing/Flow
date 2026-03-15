from fastapi import FastAPI, Request, HTTPException
from app.config import settings
import httpx
from contextlib import asynccontextmanager
import logging

from app.core.airia_client import AiriaClientWrapper as AiriaClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    # Initialize clients on startup
    print("Initializing clients...")
    airia_client = AiriaClient()
    app.state.airia_client = airia_client
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
    airia_client = request.app.state.airia_client

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
        
        # Handle app mention
        if event.get("type") == "app_mention":
            user_message = event.get("text", "")
            user_id = event.get("user", "")
            channel_id = event.get("channel", "")

            if user_message and user_id:
                # We send an immediate 200 OK to Slack to avoid timeouts
                # and process the response asynchronously.
                print(f"Received message from Slack user {user_id}: '{user_message}'")
                
                response = await airia_client.process_message(
                    user_message=user_message,
                    user_id=user_id,
                    platform="slack",
                    conversation_id=channel_id
                )
                
                reply_text = response.get("text", "Sorry, I had trouble processing that.")

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

    return {"ok": True}


async def send_whatsapp_message(to_number: str, text: str):
    """Send message via WhatsApp API"""
    url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": text}
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()



@app.get("/whatsapp/webhook", tags=["Webhooks"])
async def webhook_whatsapp_verify(request: Request):
    """
    Handles WhatsApp's webhook verification challenge.
    """
    if request.query_params.get("hub.mode") == "subscribe" and request.query_params.get("hub.verify_token") == settings.WHATSAPP_VERIFY_TOKEN:
        return int(request.query_params.get("hub.challenge"))
    else:
        raise HTTPException(status_code=403, detail="Forbidden")


@app.post("/whatsapp/webhook", tags=["Webhooks"])
async def webhook_whatsapp(request: Request):
    """Handle incoming WhatsApp messages"""
    airia_client = request.app.state.airia_client
    body = await request.json()
    
    # Extract message details
    try:
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])
        
        if messages:
            message = messages[0]
            from_number = message.get("from")
            text = message.get("text", {}).get("body", "")
            
            response = await airia_client.process_message(
                user_message=text,
                user_id=from_number,
                platform="whatsapp",
                conversation_id=from_number
            )
            
            # Send response via WhatsApp API
            await send_whatsapp_message(from_number, response.get("text", "Sorry, I had trouble processing that."))
            
        return {"status": "ok"}
        
    except Exception as e:
        logging.error(f"WhatsApp webhook error: {e}")
        return {"status": "error"}, 500

