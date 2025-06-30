import os
import json
from datetime import datetime, timezone

BASE_DIR = os.path.join(os.path.dirname(__file__), "storage", "llm_output")
os.makedirs(BASE_DIR, exist_ok=True)


def _path(case_id: str) -> str:
    """Return the json file that stores history for a given case."""
    safe = case_id.replace("/", "_")
    return os.path.join(BASE_DIR, f"{safe}.json")


def append_entry(case_id: str, prompt: str, image_count: int, response: str):
    """Add a single call to the history log."""
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prompt": prompt,
        "image_count": image_count,
        "response": response,
    }

    data = load_history(case_id)
    data.append(record)
    with open(_path(case_id), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_history(case_id: str) -> list[dict]:
    """Return the full list (may be empty). Latest entry is last."""
    try:
        with open(_path(case_id), "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


async def clear_history(case_id, selected_history, summary=None):

    try:
        if selected_history:
            data = load_history(case_id)
            new_data = [entry for i, entry in enumerate(data) if i not in selected_history]

            if summary:
                first_timestamp = data[0]['timestamp'][0] if isinstance(data[0]['timestamp'], list) else data[0]['timestamp']
                last_timestamp = data[len(data) - len(new_data) - 1]['timestamp']
                last_timestamp = last_timestamp[1] if isinstance(last_timestamp, list) else last_timestamp
                new_data.insert(0, {
                    "timestamp": [first_timestamp, last_timestamp],
                    "prompt": "Summary of LLM history",
                    "image_count": sum(entry.get('image_count', 0) for ind, entry in enumerate(data) if ind in selected_history),
                    "response": summary
                })
            with open(_path(case_id), "w", encoding="utf-8") as f:
                json.dump(new_data, f, indent=2)
        else:
            os.remove(_path(case_id))
    except FileNotFoundError:
        pass
