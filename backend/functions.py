import os
from datetime import date

def get_image_dict(payload):
    case_id = payload.case_id
    base_dir = os.path.join("storage", "images", case_id)
    if not os.path.exists(base_dir):
        print(f"Directory {base_dir} does not exist, returning empty list, 0 count")
        return  [],  0 

    images = os.listdir(base_dir)
    image_list = []
    for image in images:
        url_path = f"/images/{case_id}/{image}"
        image_list.append({
            "filename": image,
            "url": url_path,
        })

    return image_list, len(images)

def find_latest_case():
    base_dir = os.path.join("storage", "images")
    case_dirs = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
    if case_dirs:
        latest = max(case_dirs, key=lambda d: os.path.getmtime(os.path.join(base_dir, d)))
        return latest
    else:
        today = date.today().isoformat()
        return f"{today}--01"

def create_new_case():
    today = date.today().isoformat()
    base_dir = os.path.join("storage", "images")
    case_dirs = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d)) and d.startswith(today)]
    print(case_dirs)
    if case_dirs:
        highest_index = max(int(d.split('--')[-1]) for d in case_dirs)
        return f"{today}--{str(highest_index + 1).zfill(2)}"
    return f"{today}--01"

def delete_imgs_reindex(payload):
    case_id = payload.case_id
    basedir = os.path.join("storage", "images", case_id)
    print(f"Deleting images: {payload.filenames} from case_id: {case_id}")
    for filename in payload.filenames:
        path = os.path.join(basedir,filename)
        if os.path.exists(path):
            os.remove(path)

    # Renumber remaining images
    images = os.listdir(basedir)
    print(f"Remaining images after deletion: {images}")

    #remove dir if empty
    if not images:
        os.rmdir(basedir)
        return [], 0
    
    def extract_number(fname):
        try:
            name, _ = os.path.splitext(fname)
            return int(name.split(" ")[1])
        except:
            return float("inf")

    images_sorted = sorted(images, key=extract_number)
    for index, fname in enumerate(images_sorted):
        new_name = f"Image {str(index+1).zfill(2)}.png"
        old_path = os.path.join("storage","images", case_id, fname)
        new_path = os.path.join("storage","images", case_id, new_name)
        if fname != new_name:
            os.replace(old_path, new_path)

    # Return updated list
    images = os.listdir(basedir)
    image_list = []
    for image in sorted(images, key=extract_number):
        image_list.append({
            "filename": image,
            "url": f"/images/{case_id}/{image}",
            "path": os.path.join("images", case_id, image)
        })
    return image_list, len(images)

