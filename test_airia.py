import httpx
import asyncio
import os

async def test_airia_format():
    endpoint = "https://api.airia.ai/v2/PipelineExecution/e68138a1-4bc1-486b-b9b7-e9195159bea2"
    api_key = "ak-MTU2NjUwMzk0N3wxNzczNDcyODg4NTQ1fHRpLVQzSmhZMnhsTmprdFQzQmxiaUJTWldkcGMzUnlZWFJwYjI0dFFXbHlhV0VnUm5KbFpWOWhOVEkwTWpoaU15MWpOVFppTFRRM1ltSXRZVGszWmkwd05qVXhOemN6WldFM01UUT18MXwxMDAxNDQxMDQ5"  # Put your key here
    
    # Try different payload formats
    payloads = [
        {"userInput": "Hello"},
        {"input": "Hello"},
        {"message": "Hello"},
        {"query": "Hello"},
        {"prompt": "Hello"},
        {"text": "Hello"},
        {"user_input": "Hello"},
        {"content": "Hello"},
        {"messages": [{"role": "user", "content": "Hello"}]}
    ]
    
    async with httpx.AsyncClient() as client:
        for i, payload in enumerate(payloads):
            print(f"Testing format {i+1}: {payload}")
            try:
                response = await client.post(
                    endpoint,
                    json=payload,
                    headers={
                        "X-API-KEY": api_key,
                        "Content-Type": "application/json"
                    }
                )
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    print("✅ SUCCESS! This format works!")
                    print(f"Response: {response.json()}")
                    return payload
                else:
                    print(f"Response: {response.text[:200]}")
            except Exception as e:
                print(f"Error: {e}")
    
    print("❌ None of the formats worked")

asyncio.run(test_airia_format())
