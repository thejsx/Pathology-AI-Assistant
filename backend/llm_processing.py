import openai
from dotenv import load_dotenv
import os
import base64
import functions
from sqlalchemy import select, func


load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.AsyncOpenAI()

async def main(payload, session):
    image_list = await process_images(payload.image_ids, payload.case_id)
    if image_list == "failed":
        return "Error processing images: No valid images found in database."
    
    msgs_imgs = await construct_messages(payload, image_list, session)
    print(f"Constructed messages for LLM query: {msgs_imgs}")
    response = await query_llm(
        msgs_imgs,
        payload.effort,
        payload.max_tokens,
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


async def construct_messages(payload, image_list, session):
    messages = [{"role": "system", "content": "Please analyze the users query and/or images."}]

    if payload.clinical_data:
        if isinstance(payload.clinical_data, str):
           clin_data = "The following clinical data is available: " + payload.clinical_data
        else:
            clin_data = "\n".join( [f"{key}: {value}" for key, value in payload.clinical_data.items() if key != "specimen"] )
            if payload.clinical_data.get("specimen"):
                clin_data = f"The following clinical data is available regarding the specimen {payload.clinical_data['specimen']['summary']} collected on {payload.clinical_data['specimen']['date']}:" + "\n" + clin_data
            else:
                clin_data = "The following clinical data is available:\n" + clin_data
        messages[0]["content"] += clin_data

    if payload.include_history:
        # fetch history in ascending order by start_ts
        
        llm_history = await functions.load_history(payload.case_id, payload.user_id, payload.include_user, session)

        # Determine if we need to summarize the history
        turn_lengths = [len(item.prompt) + len(item.response) for item in llm_history]
        inv_cumm_lengths = [sum(turn_lengths[i:]) for i in range(len(turn_lengths))]
        cumm_length_bools = [length <= 8000 for length in inv_cumm_lengths]
        if not any(cumm_length_bools):
            last_index = len(cumm_length_bools)
        else:
            last_index = cumm_length_bools.index(True)
        if sum(turn_lengths[:last_index]) < 8000:
            last_index = 0
        to_summarize = llm_history[:last_index]

        # summarize bits of history that meet the criteria
        if len(to_summarize) > 0:
            summary = await summarise_history(to_summarize)
            try:
                await functions.clear_selected_history(payload.case_id, payload.user_id, [i for i in range(len(to_summarize))], session, summary)
            except Exception as e:
                print(f"Error clearing LLM history and putting in summary: {e}")
            messages.append({"role": "assistant", "content": f'The following is a summary of the conversation history: {summary}'})

        for item in llm_history[last_index:]:
            messages.append({"role": "user", "content": item.prompt})
            messages.append({"role": "assistant", "content": item.response})

    content_msg = [{"type": "text", "text": payload.prompt}]

    if image_list:
        content_msg += image_list
    messages.append({"role": "user", "content": content_msg})

    return messages


async def summarise_history(selected_llm_hist: list) -> str:
    llm_hist = "\n\n".join(
        [f"Prompt: {item.prompt}\nResponse: {item.response}" for item in selected_llm_hist]
    )
    resp = await client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role":"system","content":"Return summary of prior chat history, concise yet thorough, about 400 words max. No extra information, just the summary."},
            {"role":"user","content": llm_hist}
        ],
        max_completion_tokens=1000  
    )
    return resp.choices[0].message.content

async def query_llm(msgs_imgs, effort, max_tokens):
    try:
        response = await client.chat.completions.create(
            model="gpt-4.1-mini",
            messages= msgs_imgs,
            max_completion_tokens= min(max(max_tokens, 1000), 10000) 
        )
        return response

    except Exception as e:
        print(f"Error querying LLM: {e}")
        return "OpenAI API error: " + str(e)