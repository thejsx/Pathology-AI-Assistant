import openai
from dotenv import load_dotenv
import os
import base64

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.AsyncOpenAI()

async def main(payload):
    if len(payload.image_ids) == 0:
        response = await query_llm(payload.prompt, [], use_images=False)
        image_dict = {"status": "no_images", "images": []}
    else:
        image_dict = await process_images(payload.image_ids, payload.case_id)
        if image_dict.get("status") == "failed":
            return "Error processing images: No valid images found in database."
    response = await query_llm(payload.prompt, image_dict["images"])
    print(f"LLM token usage: {response.usage}")

    return response.choices[0].message.content

async def process_images(image_ids, case_id):
    image_contents = []
    base_dir = os.path.join("images", case_id)
    for image_id in image_ids:
        image_path = os.path.join(base_dir, image_id)
        if os.path.exists(image_path):
            with open(image_path, "rb") as image_file:
                image_data = image_file.read()
                image_contents.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{base64.b64encode(image_data).decode('utf-8')}",
                        "detail": 'auto'
                    }
                })
    if not image_contents:
        return {"status": "failed", "images": []}
    return {"status": "success", "images": image_contents}
    

async def query_llm(prompt, images, use_images=True):
    if not use_images or not images:
        system_msg = "Please analyze the users prompt and provide a detailed response."
        content_msg = [{"type": "text", "text": prompt}]
    else:
        system_msg = "Please analyze the images and answer questions/statements in the prompt, if applicable."
        content_msg = [
            {"type": "text", "text": prompt}
        ] + images
    try:
        response = await client.chat.completions.create(
            model="o3",  
            messages=[
                {
                    "role": "system", 
                    "content": system_msg
                },
                {
                    "role": "user",
                    "content": content_msg
                }
            ],
            max_completion_tokens=4000,
            reasoning_effort='medium'
        )
        return response
        
    except Exception as e:
        print(f"Error querying LLM: {e}")
        return "OpenAI API error: " + str(e)