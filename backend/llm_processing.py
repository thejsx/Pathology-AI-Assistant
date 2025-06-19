import openai
from dotenv import load_dotenv
import os

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def main(payload):
    return process_images(payload)

def process_images(payload):
    case_id = payload.case_id
    image_ids = payload.image_ids
    base_dir = os.path.join("images", case_id)
    if not os.path.exists(base_dir):
        print(f"Directory {base_dir} does not exist.")
        return {"status": "error", "message": "Case ID does not exist."}

    images = []
    for image_id in image_ids:
        image_path = os.path.join(base_dir, image_id)
        if os.path.exists(image_path):
            with open(image_path, "rb") as image_file:
                image_data = image_file.read()
                images.append({
                    "id": image_id,
                    "data": base64.b64encode(image_data).decode("utf-8")
                })

    if not images:
        return {"status": "error", "message": "No valid images found."}

    # Call OpenAI API for processing
    response = openai.Image.create(
        model="image-alpha-001",
        images=images
    )

    return {"status": "success", "message": "Images processed successfully."}
import base64