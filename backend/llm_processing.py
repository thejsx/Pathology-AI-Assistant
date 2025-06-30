import openai
from dotenv import load_dotenv
import os
import base64
import llm_history as llmhistory_file

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.AsyncOpenAI()

async def main(payload):
    image_list = await process_images(payload.image_ids, payload.case_id)
    if image_list == "failed":
        return "Error processing images: No valid images found in database."
    
    msgs_imgs = await construct_messages(payload, image_list)

    response = await query_llm(
        msgs_imgs,
        payload.effort,
        payload.options,
    )
    print(f"LLM token usage: {response.usage}")

    return response.choices[0].message.content

async def process_images(image_ids, case_id):
    if len(image_ids) == 0:
        return []
    image_contents = []
    base_dir = os.path.join("storage", "images", case_id)
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
        return "failed"
    return  image_contents


async def construct_messages(payload, image_list):
    messages = []
    options = payload.options

    if 'clinical_data' in options and options['clinical_data']:
        messages.append({"role": "system", "content": f"Please analyze the users query and/or images which maypertain to the following clinical data:\n{options['clinical_data']}"})
    else:
        messages.append({"role": "system", "content": "Please analyze the users query and/or images."})

    if 'llm_history' in options and options['llm_history']:
        llm_history = options['llm_history']
        turn_lengths = [len(item['prompt']) + len(item['response']) for item in llm_history]
        inv_cumm_lengths = [sum(turn_lengths[i:]) for i in range(len(turn_lengths))]

        cumm_length_bools = [length <= 4000 for length in inv_cumm_lengths]
        if not any(cumm_length_bools):
            last_index = len(cumm_length_bools)
        else:
            last_index = cumm_length_bools.index(True)

        if sum(turn_lengths[:last_index]) < 4000:
            last_index = 0

        to_summarize = llm_history[:last_index]

        if len(to_summarize) > 0:
            summary = await summarise_history(to_summarize)
            try:
                await llmhistory_file.clear_history(payload.case_id, [i for i in range(len(to_summarize))], summary)
            except Exception as e:
                print(f"Error clearing LLM history and putting in summary: {e}")
            messages.append({"role": "system", "content": f'The following is a summary of the LLM history: {summary}'})

        for item in llm_history[last_index:]:
            messages.append({"role": "user", "content": item['prompt']})
            messages.append({"role": "assistant", "content": item['response']})

    content_msg = [{"type": "text", "text": payload.prompt}]

    if image_list:
        content_msg += image_list
    messages.append({"role": "user", "content": content_msg})

    return messages


async def summarise_history(selected_llm_hist: list) -> str:
    llm_hist = "\n\n".join(
        [f"Prompt: {item['prompt']}\nResponse: {item['response']}" for item in selected_llm_hist]
    )
    resp = await client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role":"system","content":
             "You are a professional summariser. "
             "Return summary of prior chat history, concise yet thorough, length no more than 400 words."},
            {"role":"user","content": llm_hist}
        ],
        max_completion_tokens=500  
    )
    return resp.choices[0].message.content

async def query_llm(msgs_imgs, effort, options):
    try:
        response = await client.chat.completions.create(
            model="gpt-4.1-mini",
            messages= msgs_imgs,
            max_completion_tokens=options.get("max_tokens", 4000),
            # reasoning_effort=effort
        )
        return response

    except Exception as e:
        print(f"Error querying LLM: {e}")
        return "OpenAI API error: " + str(e)