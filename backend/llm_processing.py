import openai
from dotenv import load_dotenv
import os
import base64

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI()

def main(payload):
    if len(payload.image_ids) == 0:
        response = query_llm(payload.prompt, [], use_images=False)
        image_dict = {"status": "no_images", "images": []}
    else:
        image_dict = process_images(payload.image_ids, payload.case_id)
        if image_dict.get("status") == "failed":
            return "Error processing images: No valid images found in database."
    response = query_llm(payload.prompt, image_dict["images"])
    print(f"LLM response: {response}")
    return response

def process_images(image_ids, case_id):
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
                        "detail": "high"
                    }
                })
    if not image_contents:
        return {"status": "failed", "images": []}
    return {"status": "success", "images": image_contents}
    

def query_llm(prompt, images, use_images=True):
    if not use_images or not images:
        content_msg = "Please analyze the users prompt and provide a detailed response."
        message_content = [{"type": "text", "text": prompt}]
    else:
        content_msg = "Please analyze the images and answer questions/statements in the prompt, if applicable."
        message_content = [
            {"type": "text", "text": prompt}
        ] + images
    try:
        response = client.chat.completions.create(
            model="o3",  
            messages=[
                {
                    "role": "system", 
                    "content": content_msg
                },
                {
                    "role": "user",
                    "content": message_content
                }
            ],
            max_completion_tokens=4000,
            temperature=1  # Lower temperature for more consistent medical analysis
        )
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error querying LLM: {e}")
        return "OpenAI API error: " + str(e)