from airia import AiriaClient as SdkClient
from app.config import settings
import uuid

class AiriaClient:
    """
    Client for interacting with our Flow agent on Airia.
    """
    
    def __init__(self):
        if not settings.AIRIA_API_KEY:
            raise ValueError("AIRIA_API_KEY is not set. Please check your .env file.")
        
        self.sdk_client = SdkClient(api_key=settings.AIRIA_API_KEY)
        self.pipeline_id = settings.AIRIA_PIPELINE_ID
        print(f"AiriaClient initialized for pipeline: {self.pipeline_id}")

    async def process_message(
        self,
        message: str,
        user_id: str,
        platform: str,
        context: dict
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
        # A unique ID for this specific interaction
        interaction_id = str(uuid.uuid4())
        
        print(f"Executing Airia pipeline '{self.pipeline_id}' for user '{user_id}'")

        # The user's provided snippet used `execute_pipeline`
        # We will adapt it to a more robust payload
        response = await self.sdk_client.pipelines.execute(
            pipeline_id=self.pipeline_id,
            user_input=message,
            user_id=user_id,
            # We can pass additional structured context to the pipeline
            context={
                "interaction_id": interaction_id,
                "platform": platform,
                "aggregated_context": context
            }
        )
        
        print(f"Received response from Airia pipeline.")
        # The actual response structure will depend on the Airia SDK.
        # We assume it returns a dict-like object.
        return response


# Singleton instance
airia_client = AiriaClient()
