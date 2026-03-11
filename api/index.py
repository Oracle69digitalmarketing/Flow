from app.main import app
from vercel_runtime import create_api_handler

# Vercel serverless handler
handler = create_api_handler(app)
