import h5py
import numpy as np
import os

MODEL_DIR = r"C:\Users\Prachi Dhekule\Downloads\AgroOptics\backend\model"

# Check soil model
soil_path = os.path.join(MODEL_DIR, "soil3_vision_model_v1.h5")
plant_path = os.path.join(MODEL_DIR, "plant_disease_prediction_model.h5")

print("🔍 Checking model files...")

try:
    with h5py.File(soil_path, 'r') as f:
        print(f"✅ Soil model file structure:")
        print(f"   Keys: {list(f.keys())}")
        if 'model_weights' in f:
            print(f"   Contains model_weights")
        if 'keras_version' in f.attrs:
            print(f"   Keras version: {f.attrs['keras_version']}")
except Exception as e:
    print(f"❌ Error reading soil model: {e}")

try:
    with h5py.File(plant_path, 'r') as f:
        print(f"✅ Plant model file structure:")
        print(f"   Keys: {list(f.keys())}")
        if 'model_weights' in f:
            print(f"   Contains model_weights")
        if 'keras_version' in f.attrs:
            print(f"   Keras version: {f.attrs['keras_version']}")
except Exception as e:
    print(f"❌ Error reading plant model: {e}")

# Check file sizes
print(f"\n📊 File sizes:")
print(f"  Soil model: {os.path.getsize(soil_path) / (1024*1024):.2f} MB")
print(f"  Plant model: {os.path.getsize(plant_path) / (1024*1024):.2f} MB")