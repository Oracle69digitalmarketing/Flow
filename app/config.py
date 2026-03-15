import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # App Configuration
    APP_NAME: str = os.getenv("APP_NAME", "Flow")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://flow:flow@localhost:5432/flow")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Airia
    AIRIA_API_KEY: str = os.getenv("AIRIA_API_KEY")
    AIRIA_PIPELINE_ID: str = os.getenv("AIRIA_PIPELINE_ID", "flow-sales-agent")
    
    # Slack
    SLACK_SIGNING_SECRET: str = os.getenv("SLACK_SIGNING_SECRET")
    SLACK_BOT_TOKEN: str = os.getenv("SLACK_BOT_TOKEN")

    # WhatsApp
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "your-verify-token")
    WHATSAPP_TOKEN: str = os.getenv("WHATSAPP_TOKEN")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID")

settings = Settings()
