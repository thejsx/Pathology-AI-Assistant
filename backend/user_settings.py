import os, json

BASE_DIR = os.path.join(os.path.dirname(__file__), 'storage', 'user_data')

def _path(user_id: str) -> str:
    user_id = user_id.replace('/', '_')
    return os.path.join(BASE_DIR, f'{user_id}.json')

def load_user_settings(user_id: str) -> dict:
    try:
        with open(_path(user_id), 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_user_settings(user_id: str, settings: dict):
    print(settings)
    with open(_path(user_id), 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=2)
