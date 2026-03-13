# app/core/airia_client.py

import os
import httpx
import json
from typing import Dict, Optional

class AiriaClientWrapper:
    """
    Client for calling the published Airia agent via webhook/API endpoint.
    """
    
    def __init__(self):
        # Get credentials from environment variables
        self.api_endpoint = os.getenv("AIRIA_API_ENDPOINT")
        self.api_key = os.getenv("AIRIA_API_KEY")
        
        if not self.api_endpoint:
            raise ValueError("AIRIA_API_ENDPOINT environment variable not set")
        
    
    async def process_message(
        self, 
        user_message: str, 
        user_id: str = None,
        platform: str = "slack",
        conversation_id: str = None,
        additional_context: Dict = None
    ) -> Dict:
        """
        Send message to Airia agent via webhook endpoint.
        """
        # Prepare the payload based on what your agent expects
        payload = {
            "userInput": user_message,
            "asyncOutput": False,
            "userId": user_id,
            "conversationId": conversation_id
        }
        
        # Add any additional context
        if additional_context:
            payload.update(additional_context)
        
        # Prepare headers
        headers = {
            "Content-Type": "application/json"
        }
        
        # Add API key if you have one
        if self.api_key:
            headers["X-API-KEY"] = self.api_key
        
        try:
            # Make the request to Airia webhook
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_endpoint,
                    json=payload,
                    headers=headers
                )
                
                # Check for errors
                response.raise_for_status()
                
                # Parse response
                result = response.json()
                
                # Extract the agent's response text
                # The exact structure depends on your webhook response format
                agent_response = result.get("output") or result.get("response") or result.get("text") or result.get("message") or str(result)
                
                return {
                    "text": agent_response,
                    "tool_calls": [],  # Add if your agent returns tool calls
                    "raw_response": result
                }
                
        except httpx.TimeoutException:
            return {
                "text": "I'm sorry, the request timed out. Please try again.",
                "error": "timeout"
            }
        except httpx.HTTPStatusError as e:
            return {
                "text": f"I'm having trouble connecting to my AI service. Error: {e.response.status_code}",
                "error": str(e)
            }
        except Exception as e:
            return {
                "text": "I encountered an error. Please try again later.",
                "error": str(e)
            }
