from airia import AiriaAsyncClient
from app.config import settings


class AiriaClient:
    """
    Client for interacting with our Flow agent on Airia.
    """

    def __init__(self):
        if not settings.AIRIA_API_KEY:
            raise ValueError("AIRIA_API_KEY is not set. Please check your .env file.")

        self.client = AiriaAsyncClient(api_key=settings.AIRIA_API_KEY)
        self.pipeline_id = settings.AIRIA_PIPELINE_ID
        print(f"AiriaClient initialized for pipeline: {self.pipeline_id}")

    async def process_message(
        self,
        message: str,
        user_id: str,
        platform: str,
        context: dict,
    ) -> dict:
        """
        Send message to the Airia pipeline with full context.

        Args:
            message: The user's message.
            user_id: The internal ID of the user.
            platform: The platform the message originated from (e.g., 'slack', 'whatsapp').
            context: The aggregated context for the user.

        Returns:
            The response from the Airia pipeline.
        """
        print(f"Executing Airia pipeline '{self.pipeline_id}' for user '{user_id}'")

        try:
            # Correct method: execute_pipeline()
            # Note: not all original context parameters are supported by this method.
            response = await self.client.execute_pipeline(
                pipeline_id=self.pipeline_id,
                user_input=message,
                user_id=user_id,
            )

            print("Received response from Airia pipeline.")
            # Return structured response
            return {
                "text": response.result if hasattr(response, "result") else str(response),
                "tool_calls": [],  # Parse tool calls if your pipeline uses them
                "finish_reason": "stop",
            }

        except Exception as e:
            # Log the error
            print(f"Airia API error: {str(e)}")
            # Return a fallback response
            return {
                "text": "I'm having trouble connecting to my AI service right now. Please try again later.",
                "tool_calls": [],
                "error": str(e),
            }

