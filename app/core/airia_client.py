# app/core/airia_client.py

import httpx
import json
import logging
from typing import Dict, Optional

from app.config import settings

# Set up logging
logger = logging.getLogger(__name__)

class AiriaClientWrapper:
    """
    Client for calling the published Airia agent via webhook/API endpoint.
    """
    
    def __init__(self):
        self.api_endpoint = settings.AIRIA_API_URL
        self.api_key = settings.AIRIA_API_KEY
        
        logger.info(f"AiriaClient initialized with endpoint: {self.api_endpoint}")
        logger.info(f"API Key present: {'Yes' if self.api_key else 'No'}")
    
    async def process_message(
        self, 
        message: str, 
        user_id: str = None,
        platform: str = "slack",
        conversation_id: str = None,
        additional_context: Dict = None
    ) -> Dict:
        """
        Send message to Airia agent via webhook endpoint.
        """
        # Prepare the payload - sending only the minimal confirmed working format
        payload = {
            "userInput": message,
            "asyncOutput": False
        }
        # Temporarily removed userId and conversationId for debugging

        if additional_context:
            payload.update(additional_context)

        logger.info(f"Sending payload to Airia: {json.dumps(payload)}")
        
        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                logger.info(f"Making POST request to: {self.api_endpoint}")
                
                response = await client.post(
                    self.api_endpoint,
                    json=payload,
                    headers=headers
                )
                
                logger.info(f"Response status code: {response.status_code}")
                
                # Try to get response body for debugging
                try:
                    response_body = response.json()
                    logger.info(f"Response body: {json.dumps(response_body)}")
                except:
                    response_text = response.text
                    logger.info(f"Response text: {response_text}")
                
                # Check for errors
                if response.status_code >= 400:
                    error_msg = f"Airia API error: {response.status_code}"
                    logger.error(error_msg)
                    
                    return {
                        "text": f"I'm having trouble connecting to my AI service. Error: {response.status_code}",
                        "error": error_msg,
                        "details": response_body if 'response_body' in locals() else response_text
                    }
                
                # Parse successful response
                result = response.json()
                agent_response = result.get('result', 'Sorry, I could not process the response.')
                
                logger.info(f"Successfully got response from Airia")
                
                return {
                    "text": agent_response,
                    "tool_calls": [],
                    "raw_response": result
                }
                
        except httpx.TimeoutException as e:
            logger.error(f"Timeout error: {str(e)}")
            return {
                "text": "I'm sorry, the request timed out. Please try again.",
                "error": "timeout"
            }
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            return {
                "text": "I encountered an error. Please try again later.",
                "error": str(e)
            }
