import os
import gdown  # pip install gdown if not installed

# Directory to store models and CSVs
MODEL_DIR = "backend/model"
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

# List of files to download
files_to_download = [
    {
        "name": "plant_disease_model.h5",
        "url": "https://drive.google.com/uc?id=1Xy90MYBx4-vAbJzUKQ6mxNSnbGHyIkJI"
    },
    {
        "name": "soil3_vision_model_v1.h5",
        "url": "https://drive.google.com/uc?id=1nSj3A-LYAG4ayp42DugIWD1hyJAWIdkC"
    },
    {
        "name": "Cleaned3_Soil_Vision_Dataset.csv",
        "url": "https://drive.google.com/uc?id=1cGTq35qnZMooXHcvCuDYhybWAiUzWoCb"
    },
    {
        "name": "disease_solutions.csv",
        "url": "https://drive.google.com/uc?id=1NM2ojFxGdw2LCVjD_GIjRBZQTaVjRhPX"
    }
]

# Download if missing
for file in files_to_download:
    path = os.path.join(MODEL_DIR, file["name"])
    if not os.path.exists(path):
        print(f"Downloading {file['name']}...")
        gdown.download(file["url"], path, quiet=False)
    else:
        print(f"{file['name']} already exists.")