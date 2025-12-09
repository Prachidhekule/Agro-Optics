import os
import json
import random
from datetime import datetime, timezone
from difflib import get_close_matches

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# Try importing TF/Keras optional pieces
try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing import image
    TENSORFLOW_AVAILABLE = True
except Exception:
    tf = None
    load_model = None
    image = None
    TENSORFLOW_AVAILABLE = False

import numpy as np
import pandas as pd
import requests

# -----------------------------
# Flask app + instance setup
# -----------------------------
app = Flask(__name__, instance_relative_config=True)
CORS(app)

# Ensure instance folder exists
os.makedirs(app.instance_path, exist_ok=True)

# DB inside instance to avoid permission issues
DB_PATH = os.path.join(app.instance_path, "agro_optics.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Uploads dir inside instance
UPLOAD_DIR = os.path.join(app.instance_path, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

db = SQLAlchemy(app)

# -----------------------------
# Database models
# -----------------------------
class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(300), nullable=False)
    photo = db.Column(db.String(400), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    farm_size = db.Column(db.String(100), nullable=True)
    crops = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    soil_analyses = db.relationship("SoilAnalysis", backref="user", lazy=True, cascade="all, delete-orphan")
    plant_analyses = db.relationship("PlantAnalysis", backref="user", lazy=True, cascade="all, delete-orphan")

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "photo": self.photo,
            "phone": self.phone,
            "location": self.location,
            "farm_size": self.farm_size,
            "crops": self.crops,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class SoilAnalysis(db.Model):
    __tablename__ = "soil_analysis"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    predicted_soil = db.Column(db.String(200))
    soil_info = db.Column(db.Text)
    weather_info = db.Column(db.Text)
    image_name = db.Column(db.String(400))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class PlantAnalysis(db.Model):
    __tablename__ = "plant_analysis"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    predicted_label = db.Column(db.String(200))
    confidence = db.Column(db.Float)
    image_name = db.Column(db.String(400))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

with app.app_context():
    db.create_all()
    print("✅ Database initialized at:", DB_PATH)

# -----------------------------
# Model and data paths - WITH ENHANCED FALLBACK MODE
# -----------------------------

# Use absolute paths for your model files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

# If the above doesn't work, use your specific path
MODEL_DIR = r"C:\Users\Prachi Dhekule\Downloads\AgroOptics\backend\model"

print(f"📁 Looking for models in: {MODEL_DIR}")

# Define exact paths
SOIL_MODEL_PATH = os.path.join(MODEL_DIR, "soil3_vision_model_v1.h5")
PLANT_MODEL_PATH = os.path.join(MODEL_DIR, "plant_disease_prediction_model.h5")
CLASS_LABELS_PATH = os.path.join(MODEL_DIR, "class_labels.json")
SOIL_DATASET_PATH = os.path.join(MODEL_DIR, "Cleaned3_Soil_Vision_Dataset.csv")
DISEASE_SOLUTIONS_PATH = os.path.join(MODEL_DIR, "disease_solutions.csv")

# Check if files exist
print("🔍 Checking for model files:")
soil_model_exists = os.path.exists(SOIL_MODEL_PATH) and os.path.getsize(SOIL_MODEL_PATH) > 1024  # More than 1KB
plant_model_exists = os.path.exists(PLANT_MODEL_PATH) and os.path.getsize(PLANT_MODEL_PATH) > 1024

print(f"  Soil model: {SOIL_MODEL_PATH} - {'✅ Found' if soil_model_exists else '❌ Not found or corrupted'}")
print(f"  Plant model: {PLANT_MODEL_PATH} - {'✅ Found' if plant_model_exists else '❌ Not found or corrupted'}")
print(f"  Class labels: {CLASS_LABELS_PATH} - {'✅ Found' if os.path.exists(CLASS_LABELS_PATH) else '❌ Not found'}")
print(f"  Soil dataset: {SOIL_DATASET_PATH} - {'✅ Found' if os.path.exists(SOIL_DATASET_PATH) else '❌ Not found'}")
print(f"  Disease solutions: {DISEASE_SOLUTIONS_PATH} - {'✅ Found' if os.path.exists(DISEASE_SOLUTIONS_PATH) else '❌ Not found'}")

# -----------------------------
# Load models and data - WITH ENHANCED FALLBACK HANDLING
# -----------------------------
soil_model = None
plant_model = None
plant_labels = {}
df = pd.DataFrame()
solutions_dict = {}
solutions_keys = []

# Only try loading if files are not corrupted AND TensorFlow is available
if soil_model_exists and TENSORFLOW_AVAILABLE:
    try:
        print("🔄 Loading soil model...")
        soil_model = load_model(SOIL_MODEL_PATH)
        print("✅ Soil model loaded successfully")
    except Exception as e:
        print(f"❌ Could not load soil model: {e}")
        soil_model = None
else:
    print("⚠️  Soil model not available or corrupted, using fallback mode")

if plant_model_exists and TENSORFLOW_AVAILABLE:
    try:
        print("🔄 Loading plant model...")
        plant_model = load_model(PLANT_MODEL_PATH)
        print("✅ Plant model loaded successfully")
    except Exception as e:
        print(f"❌ Could not load plant model: {e}")
        plant_model = None
else:
    print("⚠️  Plant model not available or corrupted, using fallback mode")

# Always try to load other data files
# Load soil dataset
if os.path.exists(SOIL_DATASET_PATH):
    try:
        df = pd.read_csv(SOIL_DATASET_PATH)
        # Clean column names
        df.columns = (
            df.columns
            .str.strip()
            .str.replace(" ", "_")
            .str.replace("-", "_")
            .str.replace("(", "")
            .str.replace(")", "")
        )
        if "Soil_Type" in df.columns:
            df['Soil_Type'] = df['Soil_Type'].str.strip()
        print(f"✅ Loaded soil dataset with {len(df)} rows")
    except Exception as e:
        print(f"❌ Could not load soil dataset: {e}")

# Load disease solutions
if os.path.exists(DISEASE_SOLUTIONS_PATH):
    try:
        sol_df = pd.read_csv(DISEASE_SOLUTIONS_PATH)
        if "label" in sol_df.columns and "solution" in sol_df.columns:
            sol_df["label"] = sol_df["label"].astype(str).str.strip()
            for _, row in sol_df.iterrows():
                key = row["label"]
                val = row["solution"] if not pd.isna(row["solution"]) else ""
                solutions_dict[key] = val
            solutions_keys = list(solutions_dict.keys())
            print(f"✅ Loaded {len(solutions_keys)} disease solutions")
    except Exception as e:
        print(f"❌ Could not load disease solutions: {e}")

# Load class labels (optional, handle missing file)
if os.path.exists(CLASS_LABELS_PATH):
    try:
        with open(CLASS_LABELS_PATH, "r", encoding="utf-8") as f:
            plant_labels = json.load(f)
        print(f"✅ Loaded {len(plant_labels)} plant class labels")
    except Exception as e:
        print(f"❌ Could not load class labels: {e}")
else:
    print("⚠️  Class labels file not found, using fallback labels")

# Check what we have loaded
print("\n📊 Data Loaded Summary:")
print(f"  Soil dataset rows: {len(df)}")
print(f"  Disease solutions: {len(solutions_dict)}")
print(f"  TensorFlow available: {TENSORFLOW_AVAILABLE}")
print(f"  Soil model: {'✅ Loaded' if soil_model else '❌ Not available (using fallback)'}")
print(f"  Plant model: {'✅ Loaded' if plant_model else '❌ Not available (using fallback)'}")

# -----------------------------
# Soil class list & mapping
# -----------------------------
soil_classes = ['Alluvial soil', 'Black Soil', 'Clay soil', 'Gravel', 'Red soil', 'Silt', 'Sand']
soil_label_map = {
    "Alluvial soil": "alluvial soil",
    "Black Soil": "black soil",
    "Clay soil": "clay soil",
    "Gravel": "gravel",
    "Red soil": "red soil",
    "Silt": "silt",
    "Sand": "sand"
}

# -----------------------------
# Plant classes mapping - CORRECTED VERSION
# -----------------------------
PLANT_CLASSES = {
    0: "Apple___Apple_scab",
    1: "Apple___Black_rot",
    2: "Apple___Cedar_apple_rust",
    3: "Apple___healthy",
    4: "Blueberry___healthy",
    5: "Cherry_(including_sour)___Powdery_mildew",
    6: "Cherry_(including_sour)___healthy",
    7: "Corn_(maize)___Cercospora_leaf_spot_Gray_leaf_spot",
    8: "Corn_(maize)___Common_rust",
    9: "Corn_(maize)___Northern_Leaf_Blight",
    10: "Corn_(maize)___healthy",
    11: "Grape___Black_rot",
    12: "Grape___Esca_(Black_Measles)",
    13: "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    14: "Grape___healthy",
    15: "Orange___Haunglongbing_(Citrus_greening)",
    16: "Peach___Bacterial_spot",
    17: "Peach___healthy",
    18: "Pepper,bell___Bacterial_spot",
    19: "Pepper,bell___healthy",
    20: "Potato___Early_blight",
    21: "Potato___Late_blight",
    22: "Potato___healthy",
    23: "Raspberry___healthy",
    24: "Soybean___healthy",
    25: "Squash___Powdery_mildew",
    26: "Strawberry___Leaf_scorch",
    27: "Strawberry___healthy",
    28: "Tomato___Bacterial_spot",
    29: "Tomato___Early_blight",
    30: "Tomato___Late_blight",
    31: "Tomato___Leaf_Mold",
    32: "Tomato___Septoria_leaf_spot",
    33: "Tomato___Spider_mites_Two-spotted_spider_mite",
    34: "Tomato___Target_Spot",
    35: "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    36: "Tomato___Tomato_mosaic_virus",
    37: "Tomato___healthy"
}

# Create reverse mapping for easier lookup
PLANT_CLASSES_REVERSE = {v: k for k, v in PLANT_CLASSES.items()}

# -----------------------------
# DEMO PLANT DISEASES FOR FALLBACK MODE - FIXED VERSION
# -----------------------------
DEMO_PLANT_DISEASES = [
    {"label": "Tomato___Early_blight", "confidence": 0.87, "is_healthy": False},
    {"label": "Tomato___Late_blight", "confidence": 0.85, "is_healthy": False},
    {"label": "Potato___Early_blight", "confidence": 0.88, "is_healthy": False},
    {"label": "Potato___Late_blight", "confidence": 0.86, "is_healthy": False},
    {"label": "Apple___Apple_scab", "confidence": 0.83, "is_healthy": False},
    {"label": "Apple___Black_rot", "confidence": 0.81, "is_healthy": False},
    {"label": "Apple___Cedar_apple_rust", "confidence": 0.79, "is_healthy": False},
    {"label": "Corn_(maize)___Common_rust", "confidence": 0.76, "is_healthy": False},
    {"label": "Corn_(maize)___Cercospora_leaf_spot_Gray_leaf_spot", "confidence": 0.74, "is_healthy": False},
    {"label": "Grape___Black_rot", "confidence": 0.89, "is_healthy": False},
    {"label": "Grape___Esca_(Black_Measles)", "confidence": 0.85, "is_healthy": False},
    {"label": "Peach___Bacterial_spot", "confidence": 0.81, "is_healthy": False},
    {"label": "Tomato___healthy", "confidence": 0.94, "is_healthy": True},
    {"label": "Potato___healthy", "confidence": 0.96, "is_healthy": True},
    {"label": "Apple___healthy", "confidence": 0.91, "is_healthy": True},
    {"label": "Corn_(maize)___healthy", "confidence": 0.93, "is_healthy": True},
    {"label": "Grape___healthy", "confidence": 0.95, "is_healthy": True}
]

# -----------------------------
# DEMO SOIL TYPES FOR FALLBACK MODE
# -----------------------------
DEMO_SOIL_TYPES = [
    {"type": "Clay soil", "confidence": 0.85},
    {"type": "Alluvial soil", "confidence": 0.82},
    {"type": "Black Soil", "confidence": 0.92},
    {"type": "Red soil", "confidence": 0.87},
    {"type": "Gravel", "confidence": 0.84},
    {"type": "Silt", "confidence": 0.81},
    {"type": "Sand", "confidence": 0.83}
]

# -----------------------------
# Season-based crop recommendations - EXACT MATCH with soil_classes
# -----------------------------
SEASON_BASED_CROPS = {
    "Alluvial soil": {
        "Summer": ["Maize", "Sugarcane", "Watermelon", "Cucumbers", "Vegetables"],
        "Rainy": ["Rice", "Bajra", "Jowar", "Maize", "Pulses"],
        "Winter": ["Wheat", "Mustard", "Barley", "Peas", "Gram"]
    },
    "Black Soil": {
        "Summer": ["Groundnut", "Sunflower", "Sesame", "Vegetables", "Maize"],
        "Rainy": ["Cotton", "Soybean", "Maize", "Tur", "Moong"],
        "Winter": ["Wheat", "Gram", "Jowar", "Mustard", "Barley"]
    },
    "Red soil": {
        "Summer": ["Groundnut", "Maize", "Ragi", "Vegetables", "Sesame"],
        "Rainy": ["Millets", "Ragi", "Pulses", "Soybean", "Castor"],
        "Winter": ["Wheat", "Mustard", "Gram", "Onion", "Garlic"]
    },
    "Clay soil": {
        "Summer": ["Sugarcane", "Vegetables", "Banana", "Maize", "Groundnut"],
        "Rainy": ["Rice", "Jute", "Turmeric", "Ginger", "Vegetables"],
        "Winter": ["Peas", "Wheat", "Mustard", "Potato", "Oats"]
    },
    "Gravel": {
        "Summer": ["Groundnut", "Carrot", "Watermelon", "Cucumber", "Bajra"],
        "Rainy": ["Coconut", "Maize", "Sesame", "Castor", "Pulses"],
        "Winter": ["Onion", "Potato", "Garlic", "Mustard", "Wheat"]
    },
    "Silt": {
        "Summer": ["Rice", "Vegetables", "Maize", "Pulses"],
        "Rainy": ["Rice", "Jute", "Maize"],
        "Winter": ["Wheat", "Barley", "Mustard"]
    },
    "Sand": {
        "Summer": ["Groundnut", "Watermelon", "Vegetables"],
        "Rainy": ["Maize", "Pulses", "Castor"],
        "Winter": ["Wheat", "Mustard", "Gram"]
    }
}

# -----------------------------
# Fallback solutions for common diseases
# -----------------------------
FALLBACK_SOLUTIONS = {
    "apple scab": "Apply fungicides containing myclobutanil or sulfur. Remove fallen leaves in autumn to reduce fungal spores.",
    "apple black rot": "Prune infected branches 6-8 inches below cankers. Apply copper-based fungicides during dormancy.",
    "apple cedar apple rust": "Remove nearby juniper/cedar trees if possible. Apply fungicides at pink bud stage.",
    "blueberry healthy": "Plant appears healthy. Maintain soil acidity (pH 4.5-5.5) and proper drainage.",
    "cherry powdery mildew": "Apply sulfur or potassium bicarbonate fungicides. Improve air circulation by pruning.",
    "corn cercospora leaf spot": "Rotate crops with non-host plants. Apply fungicides containing azoxystrobin.",
    "corn common rust": "Plant resistant hybrid varieties. Apply fungicides early when symptoms appear.",
    "corn northern leaf blight": "Use tillage to bury crop residue. Apply fungicides during silking stage.",
    "grape black rot": "Apply fungicides before rainfall events. Remove mummified fruits during winter.",
    "grape esca": "Prune during dry weather to prevent infection. Disinfect pruning tools between cuts.",
    "grape leaf blight": "Apply copper-based fungicides. Ensure proper vine spacing for air flow.",
    "orange haunglongbing": "Remove infected trees immediately. Control Asian citrus psyllid with insecticides.",
    "peach bacterial spot": "Apply copper sprays during dormancy. Avoid overhead irrigation.",
    "pepper bell bacterial spot": "Use pathogen-free seeds. Apply copper bactericides early in season.",
    "potato early blight": "Remove infected leaves. Apply chlorothalonil or mancozeb fungicides every 7-10 days.",
    "potato late blight": "Destroy infected plants immediately. Apply fungicides with mefenoxam before infection.",
    "squash powdery mildew": "Apply sulfur, potassium bicarbonate, or neem oil. Water at soil level, not leaves.",
    "strawberry leaf scorch": "Remove infected leaves. Apply fungicides containing captan or thiram.",
    "tomato bacterial spot": "Use copper bactericides. Avoid working with plants when foliage is wet.",
    "tomato early blight": "Remove bottom leaves. Apply chlorothalonil or copper fungicide weekly.",
    "tomato late blight": "Destroy infected plants. Apply fungicides containing chlorothalonil or mancozeb.",
    "tomato leaf mold": "Increase ventilation in greenhouse. Apply fungicides containing chlorothalonil.",
    "tomato septoria leaf spot": "Remove infected leaves. Apply copper or maneb fungicides.",
    "tomato spider mites": "Apply insecticidal soap or neem oil. Release predatory mites like Phytoseiulus persimilis.",
    "tomato target spot": "Apply fungicides containing azoxystrobin or pyraclostrobin. Remove plant debris.",
    "tomato yellow leaf curl": "Control whiteflies with insecticides. Use resistant varieties if available.",
    "tomato mosaic virus": "Remove infected plants. Disinfect tools. Control aphid vectors.",
}

# -----------------------------
# Utility helpers
# -----------------------------
def safe_json_load(s):
    try:
        return json.loads(s) if s else None
    except Exception:
        return None

def preprocess_plant(path, img_size=224):
    if image is None:
        raise RuntimeError("Keras image utilities not available")
    img = tf.keras.utils.load_img(path, target_size=(img_size, img_size))
    arr = tf.keras.utils.img_to_array(img) / 255.0
    return np.expand_dims(arr, axis=0)

def format_label_for_matching(label):
    """Convert model label to various formats for solution matching"""
    if not label:
        return []
    
    formats = []
    
    # Original format
    formats.append(label)
    
    # Replace underscores with spaces
    formats.append(label.replace("___", " ").replace("_", " ").strip())
    
    # Replace ___ with - 
    formats.append(label.replace("___", " - ").replace("_", " ").strip())
    
    # Get last part after ___
    parts = label.split("___")
    if len(parts) > 1:
        formats.append(parts[-1].replace("_", " ").strip())
    
    # Lowercase versions
    formats.append(label.lower())
    formats.append(label.lower().replace("___", " ").replace("_", " ").strip())
    
    if len(parts) > 1:
        formats.append(parts[-1].lower().replace("_", " ").strip())
    
    # Remove parentheses content
    formats.append(label.split("(")[0].strip().replace("_", " ").strip())
    
    return list(set(formats))  # Remove duplicates

def format_disease_label_for_display(label):
    """Format disease label for better display"""
    if not label:
        return "Unknown Disease"
    
    # Convert to string if not already
    if not isinstance(label, str):
        label = str(label)
    
    # Handle healthy cases
    if "healthy" in label.lower():
        parts = label.split("___")
        if len(parts) > 0:
            plant_name = parts[0].replace("_", " ").title()
            return f"{plant_name} - Healthy"
        return "Healthy Plant"
    
    # Handle disease cases
    if "___" in label:
        parts = label.split("___")
        if len(parts) == 2:
            plant_name = parts[0].replace("_", " ").title()
            disease_name = parts[1].replace("_", " ").title()
            # Clean up parentheses and special characters
            disease_name = disease_name.split("(")[0].strip()
            return f"{plant_name} - {disease_name}"
    
    # Fallback: just clean up the label
    return label.replace("___", " - ").replace("_", " ").title()

def find_solution_for_label(label):
    """Find solution for a given plant disease label"""
    if not label:
        return "No disease label provided"
    
    # Convert to string if not already
    if not isinstance(label, str):
        label = str(label)
    
    if "healthy" in label.lower():
        return "No disease detected. Plant appears healthy. Maintain current care practices."
    
    # Try different label formats
    formats_to_try = format_label_for_matching(label)
    
    # Try exact matches first
    for fmt in formats_to_try:
        if fmt in solutions_dict:
            return solutions_dict[fmt]
    
    # Try fuzzy matching
    if solutions_keys:
        for fmt in formats_to_try:
            matches = get_close_matches(fmt, solutions_keys, n=1, cutoff=0.6)
            if matches:
                return solutions_dict.get(matches[0])
    
    # Try fallback solutions with simplified label
    simple_label = label.lower().split("___")[-1].replace("_", " ").strip()
    # Remove content in parentheses
    simple_label = simple_label.split("(")[0].strip()
    
    if simple_label in FALLBACK_SOLUTIONS:
        return FALLBACK_SOLUTIONS[simple_label]
    
    return "No specific solution available in database. Consult with a local agricultural expert for proper diagnosis and treatment."

def get_seasonal_crops_for_soil(soil_type):
    """Get seasonal crops for a soil type with case-insensitive matching"""
    if not soil_type:
        print(f"❌ No soil type provided to get_seasonal_crops_for_soil")
        return {}
    
    print(f"🔍 Looking for crops for soil type: '{soil_type}'")
    print(f"📋 Available soil types: {list(SEASON_BASED_CROPS.keys())}")
    
    # Try exact match first
    if soil_type in SEASON_BASED_CROPS:
        print(f"✅ Found exact match for '{soil_type}'")
        return SEASON_BASED_CROPS[soil_type]
    
    # Try case-insensitive match
    soil_type_lower = soil_type.lower().strip()
    for key in SEASON_BASED_CROPS.keys():
        if key.lower() == soil_type_lower:
            print(f"✅ Found case-insensitive match: '{key}' for '{soil_type}'")
            return SEASON_BASED_CROPS[key]
    
    # Try fuzzy matching
    matches = get_close_matches(soil_type, list(SEASON_BASED_CROPS.keys()), n=1, cutoff=0.6)
    if matches:
        print(f"✅ Found fuzzy match: '{matches[0]}' for '{soil_type}'")
        return SEASON_BASED_CROPS[matches[0]]
    
    print(f"❌ No match found for soil type: '{soil_type}'")
    return {}

def get_current_season():
    """Determine current season based on month"""
    from datetime import datetime
    current_month = datetime.now().month
    
    # Simple season logic for India
    if current_month in [3, 4, 5, 6]:  # March to June
        return "Summer"
    elif current_month in [7, 8, 9, 10]:  # July to October
        return "Rainy"
    else:  # November to February
        return "Winter"

def get_plant_prediction_from_filename(filename):
    """Get consistent plant prediction based on filename hash"""
    if not filename:
        return "Apple___Apple_scab", 0.83, False
    
    import hashlib
    filename_hash = int(hashlib.md5(filename.lower().encode()).hexdigest(), 16)
    
    # List of possible diseases with their confidences - consistent mapping
    diseases = [
        ("Apple___Apple_scab", 0.83, False),
        ("Apple___Black_rot", 0.81, False),
        ("Tomato___Early_blight", 0.87, False),
        ("Tomato___Late_blight", 0.85, False),
        ("Potato___Early_blight", 0.88, False),
        ("Potato___Late_blight", 0.86, False),
        ("Corn_(maize)___Common_rust", 0.76, False),
        ("Grape___Black_rot", 0.89, False),
        ("Tomato___healthy", 0.94, True),
        ("Potato___healthy", 0.96, True),
        ("Apple___healthy", 0.91, True),
        ("Corn_(maize)___healthy", 0.93, True),
        ("Grape___healthy", 0.95, True)
    ]
    
    # Use hash to select consistently - same filename = same index
    disease_index = filename_hash % len(diseases)
    return diseases[disease_index]

def get_demo_plant_analysis(image_filename=None):
    """Get a deterministic demo plant analysis - always returns same for same filename"""
    
    # Get consistent prediction based on filename
    if image_filename:
        label, confidence, is_healthy = get_plant_prediction_from_filename(image_filename)
        print(f"🔍 Using deterministic prediction for '{image_filename}': {label}")
    else:
        # Default for no filename
        label = "Apple___Apple_scab"
        confidence = 0.83
        is_healthy = False
    
    confidence_percent = confidence * 100
    
    # Format for display
    if "___" in label:
        parts = label.split("___")
        if len(parts) >= 2:
            plant_name = parts[0].replace("_", " ").title()
            disease_name = parts[1].replace("_", " ").title()
            disease_name = disease_name.split("(")[0].strip()
            formatted_prediction = f"{plant_name} - {disease_name}"
        else:
            formatted_prediction = label.replace("_", " ").title()
            plant_name = "Plant"
            disease_name = "Disease"
    else:
        formatted_prediction = label.replace("_", " ").title()
        plant_name = "Plant"
        disease_name = "Disease"
    
    # Get solution
    solution = find_solution_for_label(label)
    
    # Generate top predictions - deterministic based on label
    top_predictions = [
        {
            "label": label,
            "display_label": formatted_prediction,
            "confidence": round(confidence, 4),
            "confidence_percent": round(confidence_percent, 2),
            "confidence_formatted": f"{confidence_percent:.2f}%"
        }
    ]
    
    # Add 2 more consistent predictions with lower confidence
    # Use consistent secondary predictions based on label
    if "Apple" in label:
        other_labels = [
            ("Apple___Black_rot", 0.25),
            ("Apple___Cedar_apple_rust", 0.18)
        ]
    elif "Tomato" in label:
        other_labels = [
            ("Tomato___Late_blight", 0.22),
            ("Tomato___Bacterial_spot", 0.19)
        ]
    elif "Potato" in label:
        other_labels = [
            ("Potato___Late_blight", 0.24),
            ("Potato___Early_blight", 0.21)
        ]
    elif "Corn" in label:
        other_labels = [
            ("Corn_(maize)___Common_rust", 0.23),
            ("Corn_(maize)___Cercospora_leaf_spot_Gray_leaf_spot", 0.17)
        ]
    elif "Grape" in label:
        other_labels = [
            ("Grape___Esca_(Black_Measles)", 0.26),
            ("Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", 0.20)
        ]
    else:
        other_labels = [
            ("Apple___Apple_scab", 0.25),
            ("Tomato___Early_blight", 0.22)
        ]
    
    for other_label, other_conf in other_labels:
        other_formatted = format_disease_label_for_display(other_label)
        top_predictions.append({
            "label": other_label,
            "display_label": other_formatted,
            "confidence": round(other_conf, 4),
            "confidence_percent": round(other_conf * 100, 2),
            "confidence_formatted": f"{other_conf * 100:.2f}%"
        })
    
    # Sort by confidence
    top_predictions.sort(key=lambda x: x["confidence"], reverse=True)
    
    return {
        "label": label,
        "formatted_prediction": formatted_prediction,
        "plant_name": plant_name,
        "disease_name": disease_name,
        "is_healthy": is_healthy,
        "confidence": confidence,
        "confidence_percent": confidence_percent,
        "solution": solution,
        "top_predictions": top_predictions
    }

def get_demo_soil_analysis(image_filename=None):
    """Get a demo soil analysis - uses filename to determine soil type"""
    
    # Default to Clay soil
    soil_type = "Clay soil"
    confidence = 0.85
    
    # Check filename for soil type hints - deterministic
    if image_filename:
        filename_lower = image_filename.lower()
        
        # Check for soil type hints in filename - deterministic mapping
        if "black" in filename_lower:
            soil_type = "Black Soil"
            confidence = 0.92
            print(f"🔍 Filename suggests Black Soil: {image_filename}")
        elif "red" in filename_lower:
            soil_type = "Red soil"
            confidence = 0.87
            print(f"🔍 Filename suggests Red soil: {image_filename}")
        elif "clay" in filename_lower:
            soil_type = "Clay soil"
            confidence = 0.88
            print(f"🔍 Filename suggests Clay soil: {image_filename}")
        elif "gravel" in filename_lower:
            soil_type = "Gravel"
            confidence = 0.84
            print(f"🔍 Filename suggests Gravel: {image_filename}")
        elif "sand" in filename_lower:
            soil_type = "Sand"
            confidence = 0.83
            print(f"🔍 Filename suggests Sand: {image_filename}")
        elif "alluvial" in filename_lower or "allu" in filename_lower:
            soil_type = "Alluvial soil"
            confidence = 0.85
            print(f"🔍 Filename suggests Alluvial soil: {image_filename}")
        elif "silt" in filename_lower:
            soil_type = "Silt"
            confidence = 0.81
            print(f"🔍 Filename suggests Silt: {image_filename}")
        else:
            # Use consistent mapping based on filename hash
            import hashlib
            filename_hash = int(hashlib.md5(filename_lower.encode()).hexdigest(), 16)
            soil_index = filename_hash % len(DEMO_SOIL_TYPES)
            demo_soil = DEMO_SOIL_TYPES[soil_index]
            soil_type = demo_soil["type"]
            confidence = demo_soil["confidence"]
            print(f"🔍 No soil type in filename, using consistent mapping: {soil_type}")
    else:
        # No filename, use consistent default
        soil_type = "Clay soil"
        confidence = 0.85
    
    confidence_percent = confidence * 100
    
    # Find soil info from dataset
    soil_info = {}
    mapped = soil_label_map.get(soil_type, soil_type).lower()
    
    if not df.empty and "Soil_Type" in df.columns:
        try:
            match = get_close_matches(mapped, df['Soil_Type'].str.lower(), n=1)
            if match:
                row = df[df['Soil_Type'].str.lower() == match[0]].iloc[0]
                
                def safe(v):
                    return None if pd.isna(v) else v
                
                soil_info = {
                    "soil_type": safe(row.get("Soil_Type")),
                    "ph": f"{safe(row.get('pH_Range_min'))}–{safe(row.get('pH_Range_max'))}" 
                          if safe(row.get('pH_Range_min')) and safe(row.get('pH_Range_max')) 
                          else safe(row.get('pH_Range')),
                    "npk": {
                        "N": f"{safe(row.get('Nitrogen_mg/kg_min'))}–{safe(row.get('Nitrogen_mg/kg_max'))}" 
                             if safe(row.get('Nitrogen_mg/kg_min')) and safe(row.get('Nitrogen_mg/kg_max')) 
                             else safe(row.get('Nitrogen_mg/kg')),
                        "P": f"{safe(row.get('Phosphorus_mg/kg_min'))}–{safe(row.get('Phosphorus_mg/kg_max'))}" 
                             if safe(row.get('Phosphorus_mg/kg_min')) and safe(row.get('Phosphorus_mg/kg_max')) 
                             else safe(row.get('Phosphorus_mg/kg')),
                        "K": f"{safe(row.get('Potassium_mg/kg_min'))}–{safe(row.get('Potassium_mg/kg_max'))}" 
                             if safe(row.get('Potassium_mg/kg_min')) and safe(row.get('Potassium_mg/kg_max')) 
                             else safe(row.get('Potassium_mg/kg')),
                    },
                    "recommended_crops": safe(row.get("Crop_Recommendations")),
                    "recommended_fertilizers": safe(row.get("Fertilizer_Recommendations"))
                }
        except Exception as e:
            print(f"⚠️  Soil dataset matching failed: {e}")
    
    # Get seasonal crop recommendations
    seasonal_crops = get_seasonal_crops_for_soil(soil_type)
    current_season = get_current_season()
    current_season_crops = seasonal_crops.get(current_season, []) if seasonal_crops else []
    
    return {
        "soil_type": soil_type,
        "confidence": confidence,
        "confidence_percent": confidence_percent,
        "soil_info": soil_info,
        "seasonal_crops": seasonal_crops,
        "current_season": current_season,
        "current_season_crops": current_season_crops
    }

# -----------------------------
# Serve files
# -----------------------------
@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename, as_attachment=False)

# -----------------------------
# Simple test
# -----------------------------
@app.route("/api/hello")
def hello():
    return jsonify({"message": "Agro-Optics Backend is working perfectly!", "status": "ok"})

# -----------------------------
# Health check endpoint
# -----------------------------
@app.route("/api/health")
def health_check():
    return jsonify({
        "status": "ok",
        "mode": "fallback" if (soil_model is None and plant_model is None) else "ai",
        "features": {
            "soil_analysis": True,
            "plant_analysis": True,
            "seasonal_crops": True,
            "user_auth": True,
            "weather_data": True
        },
        "data_loaded": {
            "soil_dataset": not df.empty,
            "disease_solutions": len(solutions_dict) > 0,
            "soil_model": soil_model is not None,
            "plant_model": plant_model is not None
        },
        "accuracy_note": "Using enhanced demo mode with realistic data (AI models will be loaded when available)",
        "backend_version": "1.1.0",
        "current_season": get_current_season(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# -----------------------------
# Test plant endpoint (for debugging frontend)
# -----------------------------
@app.route("/api/test-plant-response", methods=["GET"])
def test_plant_response():
    """Test endpoint to check plant response format"""
    return jsonify({
        "success": True,
        "prediction": "Apple - Apple Scab",
        "original_label": "Apple___Apple_scab",
        "plant_name": "Apple",
        "disease_name": "Apple Scab",
        "is_healthy": False,
        "confidence": 0.8255,
        "confidence_percent": 82.55,
        "confidence_formatted": "82.55%",
        "confidence_level": "High",
        "confidence_color": "success",
        "accuracy_stars": 4,
        "top_predictions": [
            {
                "label": "Apple___Apple_scab",
                "display_label": "Apple - Apple Scab",
                "confidence": 0.8255,
                "confidence_percent": 82.55,
                "confidence_formatted": "82.55%"
            },
            {
                "label": "Apple___Black_rot",
                "display_label": "Apple - Black Rot",
                "confidence": 0.1234,
                "confidence_percent": 12.34,
                "confidence_formatted": "12.34%"
            },
            {
                "label": "Apple___Cedar_apple_rust",
                "display_label": "Apple - Cedar Apple Rust",
                "confidence": 0.0511,
                "confidence_percent": 5.11,
                "confidence_formatted": "5.11%"
            }
        ],
        "image_name": "test_plant_20241205123045.jpg",
        "image_url": "/uploads/test_plant_20241205123045.jpg",
        "solution": "Apply fungicides containing myclobutanil or sulfur. Remove fallen leaves in autumn to reduce fungal spores.",
        "user_found": 1,
        "user_email": "user@example.com",
        "message": "✅ Analysis complete: Apple - Apple Scab with high confidence (82.55%)",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# -----------------------------
# Seasons & crop mapping
# -----------------------------
@app.route("/api/seasons")
def get_seasons():
    return jsonify({
        "seasons": ["Summer", "Winter", "Rainy"],
        "current_season": get_current_season(),
        "message": "Available seasons for crop recommendations"
    })

@app.route("/api/available-seasons", methods=["GET"])
def get_available_seasons():
    """Get all available seasons and soil types"""
    return jsonify({
        "success": True,
        "seasons": ["Summer", "Winter", "Rainy"],
        "soil_types": list(SEASON_BASED_CROPS.keys()),
        "current_season": get_current_season(),
        "message": "Available seasons and soil types for crop recommendations"
    })

@app.route("/api/crop-by-season", methods=["POST"])
def crop_by_season():
    try:
        # Get JSON data
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        season = data.get("season")
        soil_type = data.get("soil_type")
        
        print(f"🌾 Crop by season request - Season: {season}, Soil Type: {soil_type}")
        
        if not season:
            return jsonify({
                "success": False,
                "message": "Season parameter required",
                "available_seasons": ["Summer", "Winter", "Rainy"]
            }), 400
        
        if not soil_type or soil_type == "None" or soil_type == "null":
            return jsonify({
                "success": False,
                "season": season,
                "recommended_crops": [],
                "message": f"Please provide soil type for crop recommendations in {season} season",
                "available_soil_types": list(SEASON_BASED_CROPS.keys()),
                "available_seasons": ["Summer", "Winter", "Rainy"]
            })
        
        # Clean and standardize the soil type
        soil_type_clean = soil_type.strip()
        
        # Try exact match first
        if soil_type_clean in SEASON_BASED_CROPS:
            seasonal_crops = SEASON_BASED_CROPS[soil_type_clean]
        else:
            # Try case-insensitive match
            soil_type_lower = soil_type_clean.lower()
            matched = False
            for key in SEASON_BASED_CROPS.keys():
                if key.lower() == soil_type_lower:
                    seasonal_crops = SEASON_BASED_CROPS[key]
                    soil_type_clean = key  # Use the correct casing
                    matched = True
                    break
            
            if not matched:
                # Try fuzzy matching
                matches = get_close_matches(soil_type_clean, list(SEASON_BASED_CROPS.keys()), n=1, cutoff=0.6)
                if matches:
                    seasonal_crops = SEASON_BASED_CROPS[matches[0]]
                    soil_type_clean = matches[0]
                else:
                    return jsonify({
                        "success": False,
                        "season": season,
                        "soil_type": soil_type,
                        "recommended_crops": [],
                        "message": f"Soil type '{soil_type}' not found in database",
                        "available_soil_types": list(SEASON_BASED_CROPS.keys()),
                        "available_seasons": ["Summer", "Winter", "Rainy"]
                    })
        
        # Check if season exists for this soil type
        if season in seasonal_crops:
            recommended_crops = seasonal_crops[season]
            return jsonify({
                "success": True,
                "season": season,
                "soil_type": soil_type_clean,
                "recommended_crops": recommended_crops,
                "all_seasons": list(seasonal_crops.keys()),
                "message": f"Crop recommendations for {soil_type_clean} during {season} season"
            })
        else:
            return jsonify({
                "success": False,
                "season": season,
                "soil_type": soil_type_clean,
                "recommended_crops": [],
                "message": f"No crop recommendations found for {soil_type_clean} during {season} season",
                "available_seasons": list(seasonal_crops.keys())
            })
        
    except Exception as e:
        print(f"❌ Error in crop-by-season: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Internal server error"
        }), 500

# -----------------------------
# Get crops by soil type
# -----------------------------
@app.route("/api/crops-by-soil", methods=["POST"])
def crops_by_soil():
    data = request.get_json()
    if not data or "soil_type" not in data:
        return jsonify({"error": "Soil type parameter required"}), 400
    
    soil_type = data["soil_type"]
    
    seasonal_crops = get_seasonal_crops_for_soil(soil_type)
    
    if seasonal_crops:
        return jsonify({
            "soil_type": soil_type,
            "seasonal_recommendations": seasonal_crops,
            "all_crops": list(set(crop for season_crops in seasonal_crops.values() for crop in season_crops)),
            "message": f"Crop recommendations for {soil_type}"
        })
    else:
        return jsonify({
            "error": f"Soil type '{soil_type}' not found in database",
            "available_soil_types": list(SEASON_BASED_CROPS.keys())
        }), 404

# -----------------------------
# Get seasonal crops endpoint (for frontend to call with GET)
# -----------------------------
@app.route("/api/get-seasonal-crops", methods=["GET"])
def get_seasonal_crops():
    """Get crops for a specific soil type and season from query parameters"""
    soil_type = request.args.get("soil_type")
    season = request.args.get("season")
    
    print(f"🌱 GET Seasonal Crops - Soil: {soil_type}, Season: {season}")
    
    if not soil_type or not season:
        return jsonify({
            "success": False,
            "error": "Both soil_type and season parameters are required",
            "example": "/api/get-seasonal-crops?soil_type=Alluvial soil&season=Winter"
        }), 400
    
    # Get seasonal crops for this soil type
    seasonal_crops = get_seasonal_crops_for_soil(soil_type)
    
    print(f"🔍 Found seasonal crops: {seasonal_crops}")
    
    if seasonal_crops and season in seasonal_crops:
        recommended_crops = seasonal_crops[season]
        return jsonify({
            "success": True,
            "soil_type": soil_type,
            "season": season,
            "recommended_crops": recommended_crops,
            "message": f"Crops for {soil_type} in {season} season"
        })
    else:
        return jsonify({
            "success": False,
            "soil_type": soil_type,
            "season": season,
            "recommended_crops": [],
            "message": f"No crops found for {soil_type} in {season} season",
            "available_seasons": list(seasonal_crops.keys()) if seasonal_crops else []
        })

@app.route("/api/seasonal-crops", methods=["GET"])
def get_seasonal_crops_api():
    """Get seasonal crops by soil type and season from query parameters"""
    soil_type = request.args.get("soil_type")
    season = request.args.get("season")
    
    if not soil_type:
        return jsonify({
            "success": False,
            "error": "soil_type parameter is required",
            "example": "/api/seasonal-crops?soil_type=Alluvial soil&season=Winter"
        }), 400
    
    if not season:
        # Return crops for all seasons if no season specified
        seasonal_crops = get_seasonal_crops_for_soil(soil_type)
        if seasonal_crops:
            return jsonify({
                "success": True,
                "soil_type": soil_type,
                "all_seasons_crops": seasonal_crops,
                "seasons": list(seasonal_crops.keys()),
                "message": f"Crop recommendations for {soil_type} across all seasons"
            })
        else:
            return jsonify({
                "success": False,
                "soil_type": soil_type,
                "all_seasons_crops": {},
                "message": f"Soil type '{soil_type}' not found",
                "available_soil_types": list(SEASON_BASED_CROPS.keys())
            })
    
    # Get specific season crops
    seasonal_crops = get_seasonal_crops_for_soil(soil_type)
    
    if seasonal_crops:
        if season in seasonal_crops:
            return jsonify({
                "success": True,
                "soil_type": soil_type,
                "season": season,
                "recommended_crops": seasonal_crops[season],
                "all_seasons": list(seasonal_crops.keys()),
                "message": f"Crops for {soil_type} in {season} season"
            })
        else:
            return jsonify({
                "success": False,
                "soil_type": soil_type,
                "season": season,
                "recommended_crops": [],
                "message": f"No crops found for {soil_type} in {season} season",
                "available_seasons": list(seasonal_crops.keys())
            })
    else:
        return jsonify({
            "success": False,
            "soil_type": soil_type,
            "season": season,
            "recommended_crops": [],
            "message": f"Soil type '{soil_type}' not found",
            "available_soil_types": list(SEASON_BASED_CROPS.keys())
        })

# -----------------------------
# Auth (signup/login)
# -----------------------------
@app.route("/api/signup", methods=["POST"])
def signup():
    try:
        # Check if request is JSON or form-data
        if request.content_type and 'application/json' in request.content_type:
            # Handle JSON request
            data = request.get_json()
            name = data.get("name")
            email = data.get("email")
            password = data.get("password")
            phone = data.get("phone", "")
            location = data.get("location", "")
            farm_size = data.get("farmSize", data.get("farm_size", ""))
            crops = data.get("crops", "")
            photo = None
            photo_filename = None
        else:
            # Handle form-data (with possible file upload)
            name = request.form.get("name")
            email = request.form.get("email")
            password = request.form.get("password")
            phone = request.form.get("phone", "")
            location = request.form.get("location", "")
            farm_size = request.form.get("farmSize", request.form.get("farm_size", ""))
            crops = request.form.get("crops", "")
            photo = request.files.get("photo")
            
            # Handle photo upload
            photo_filename = None
            if photo and photo.filename:
                safe_name = secure_filename(photo.filename)
                photo_filename = f"photo_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{safe_name}"
                photo.save(os.path.join(UPLOAD_DIR, photo_filename))

        # Validate required fields
        if not name or not email or not password:
            return jsonify({"error": "Name, email and password are required"}), 400

        # Check if user already exists
        if User.query.filter_by(email=email.strip().lower()).first():
            return jsonify({"error": "Email already registered"}), 400

        # Create user
        user = User(
            name=name.strip(),
            email=email.strip().lower(),
            password_hash=generate_password_hash(password),
            phone=phone.strip() if phone else None,
            location=location.strip() if location else None,
            farm_size=farm_size.strip() if farm_size else None,
            crops=crops.strip() if crops else None,
            photo=photo_filename
        )
        
        db.session.add(user)
        db.session.commit()
        
        print(f"✅ User created: {email}")
        return jsonify({
            "message": "Signup successful",
            "user": user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in signup: {e}")
        return jsonify({"error": "Failed to create user account"}), 500

@app.route("/api/login", methods=["POST"])
def login():
    try:
        # Check if request is JSON or form-data
        if request.content_type and 'application/json' in request.content_type:
            data = request.get_json()
        else:
            data = request.form
        
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        
        print(f"🔐 Login attempt - Email: {email}, Password provided: {'Yes' if password else 'No'}")
        
        if not email or not password:
            print("❌ Missing email or password")
            return jsonify({
                "success": False,
                "error": "Email and password are required",
                "status": "error"
            }), 400

        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"❌ User not found: {email}")
            return jsonify({
                "success": False,
                "error": "Invalid email or password",
                "status": "error",
                "message": "Invalid email or password"
            }), 401
        
        if not user.check_password(password):
            print(f"❌ Incorrect password for: {email}")
            return jsonify({
                "success": False,
                "error": "Invalid email or password",
                "status": "error",
                "message": "Invalid email or password"
            }), 401

        print(f"✅ Login successful for: {email}")
        
        # Return a clear success response with user data
        response_data = {
            "success": True,
            "status": "success",
            "message": "Login successful",
            "user": user.to_dict(),
            "token": "auth_token_placeholder"
        }
        
        print(f"📤 Sending response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"🔥 Error in login: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "status": "error",
            "message": str(e)
        }), 500

# -----------------------------
# Get user profile
# -----------------------------
@app.route("/api/user/profile", methods=["GET"])
def get_user_profile():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "Email parameter required"}), 400
    
    user = User.query.filter_by(email=email.strip().lower()).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "message": "User profile retrieved successfully",
        "user": user.to_dict()
    })

# -----------------------------
# Update user profile
# -----------------------------
@app.route("/api/user/update", methods=["POST"])
def update_user_profile():
    data = request.get_json() or {}
    email = data.get("email")
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    user = User.query.filter_by(email=email.strip().lower()).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Update fields if provided
    if "name" in data:
        user.name = data["name"].strip()
    if "phone" in data:
        user.phone = data["phone"].strip() if data["phone"] else None
    if "location" in data:
        user.location = data["location"].strip() if data["location"] else None
    if "farm_size" in data or "farmSize" in data:
        farm_size = data.get("farm_size") or data.get("farmSize")
        user.farm_size = farm_size.strip() if farm_size else None
    if "crops" in data:
        user.crops = data["crops"].strip() if data["crops"] else None
    
    try:
        db.session.commit()
        return jsonify({
            "message": "Profile updated successfully",
            "user": user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error updating profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

# -----------------------------
# Soil prediction - ENHANCED FALLBACK MODE WITH FILENAME ANALYSIS
# -----------------------------
@app.route("/api/soil", methods=["POST"])
def predict_soil():
    """Soil analysis with enhanced fallback mode"""
    try:
        # Get form data
        city = request.form.get("city", "Belagavi")
        user_email = request.form.get("user_email")
        
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"success": False, "error": "No file selected"}), 400

        # Save the uploaded file
        filename = secure_filename(file.filename)
        timestamped = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{filename}"
        saved_path = os.path.join(UPLOAD_DIR, timestamped)
        file.save(saved_path)
        print(f"✅ Saved soil image: {timestamped}")

        # Find user if email provided
        user = None
        if user_email:
            user = User.query.filter_by(email=user_email.strip().lower()).first()
            print(f"📧 User for soil analysis: {user.email if user else 'Not found'}")

        # Check if model is available
        if soil_model is None:
            print("⚠️  Soil model not loaded, using enhanced demo mode with filename analysis")
            
            # Get demo soil analysis WITH FILENAME
            demo_result = get_demo_soil_analysis(filename)
            
            predicted_soil = demo_result["soil_type"]
            confidence = demo_result["confidence"]
            confidence_percent = demo_result["confidence_percent"]
            soil_info = demo_result["soil_info"]
            seasonal_crops = demo_result["seasonal_crops"]
            current_season = demo_result["current_season"]
            current_season_crops = demo_result["current_season_crops"]
        else:
            # Make prediction with real model
            predicted_soil = "Unknown"
            confidence = 0.0
            confidence_percent = 0.0
            
            try:
                if image is not None:
                    img = image.load_img(saved_path, target_size=(150, 150))
                    img_arr = np.expand_dims(image.img_to_array(img), axis=0) / 255.0
                    prediction = soil_model.predict(img_arr, verbose=0)
                    idx = int(np.argmax(prediction.squeeze()))
                    predicted_soil = soil_classes[idx] if idx < len(soil_classes) else "Unknown"
                    confidence = float(np.max(prediction.squeeze()))
                    confidence_percent = confidence * 100
                    print(f"🧪 Soil prediction: {predicted_soil} (Confidence: {confidence_percent:.2f}%)")
            except Exception as e:
                print(f"❌ Error during soil prediction: {e}")
                predicted_soil = "Unknown"
                confidence = 0.0
                confidence_percent = 0.0

            # Find soil info from dataset
            mapped = soil_label_map.get(predicted_soil, predicted_soil).lower()
            soil_info = {}
            
            if not df.empty and "Soil_Type" in df.columns:
                try:
                    match = get_close_matches(mapped, df['Soil_Type'].str.lower(), n=1)
                    if match:
                        row = df[df['Soil_Type'].str.lower() == match[0]].iloc[0]
                        
                        def safe(v):
                            return None if pd.isna(v) else v
                        
                        soil_info = {
                            "soil_type": safe(row.get("Soil_Type")),
                            "ph": f"{safe(row.get('pH_Range_min'))}–{safe(row.get('pH_Range_max'))}" 
                                  if safe(row.get('pH_Range_min')) and safe(row.get('pH_Range_max')) 
                                  else safe(row.get('pH_Range')),
                            "npk": {
                                "N": f"{safe(row.get('Nitrogen_mg/kg_min'))}–{safe(row.get('Nitrogen_mg/kg_max'))}" 
                                     if safe(row.get('Nitrogen_mg/kg_min')) and safe(row.get('Nitrogen_mg/kg_max')) 
                                     else safe(row.get('Nitrogen_mg/kg')),
                                "P": f"{safe(row.get('Phosphorus_mg/kg_min'))}–{safe(row.get('Phosphorus_mg/kg_max'))}" 
                                     if safe(row.get('Phosphorus_mg/kg_min')) and safe(row.get('Phosphorus_mg/kg_max')) 
                                     else safe(row.get('Phosphorus_mg/kg')),
                                "K": f"{safe(row.get('Potassium_mg/kg_min'))}–{safe(row.get('Potassium_mg/kg_max'))}" 
                                     if safe(row.get('Potassium_mg/kg_min')) and safe(row.get('Potassium_mg/kg_max')) 
                                     else safe(row.get('Potassium_mg/kg')),
                            },
                            "recommended_crops": safe(row.get("Crop_Recommendations")),
                            "recommended_fertilizers": safe(row.get("Fertilizer_Recommendations"))
                        }
                except Exception as e:
                    print(f"⚠️  Soil dataset matching failed: {e}")

            # Get seasonal crop recommendations for ALL seasons
            seasonal_crops = get_seasonal_crops_for_soil(predicted_soil)
            
            # Get current season and crops for current season
            current_season = get_current_season()
            current_season_crops = seasonal_crops.get(current_season, []) if seasonal_crops else []

        # Get weather information (always try to get real weather)
        API_KEY = os.getenv("OPENWEATHER_API_KEY") or "d9c834bc3e00761992fc6cb1ab2e60bd"
        weather = {}
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                weather = {
                    "current_temperature": data.get("main", {}).get("temp"),
                    "current_humidity": data.get("main", {}).get("humidity"),
                    "weather_description": data.get("weather", [{}])[0].get("description"),
                    "city": city
                }
        except Exception as e:
            print(f"⚠️  Weather fetch failed: {e}")
            weather = {
                "current_temperature": 28,
                "current_humidity": 65,
                "weather_description": "Partly cloudy",
                "city": city,
                "note": "Demo weather data"
            }

        # Determine soil confidence level
        if confidence_percent >= 85:
            soil_confidence_level = "High"
            soil_confidence_color = "success"
        elif confidence_percent >= 70:
            soil_confidence_level = "Medium"
            soil_confidence_color = "warning"
        elif confidence_percent >= 50:
            soil_confidence_level = "Low"
            soil_confidence_color = "info"
        else:
            soil_confidence_level = "Very Low"
            soil_confidence_color = "danger"

        # Save to database
        try:
            soil_record = SoilAnalysis(
                user_id=user.id if user else None,
                predicted_soil=predicted_soil,
                soil_info=json.dumps(soil_info) if soil_info else None,
                weather_info=json.dumps(weather) if weather else None,
                image_name=timestamped
            )
            db.session.add(soil_record)
            db.session.commit()
            print(f"✅ Saved soil analysis to DB (ID: {soil_record.id})")
        except Exception as e:
            print(f"❌ DB soil save error: {e}")
            db.session.rollback()

        # Prepare response
        response_data = {
            "success": True,
            "predicted_soil": predicted_soil,
            "soil_confidence": {
                "value": round(confidence, 4),
                "percent": round(confidence_percent, 2),
                "formatted": f"{confidence_percent:.2f}%",
                "level": soil_confidence_level,
                "color": soil_confidence_color
            },
            "soil_info": soil_info,
            "weather": weather,
            "seasonal_crops": seasonal_crops,
            "current_season": current_season,
            "current_season_crops": current_season_crops,
            "all_seasons": list(seasonal_crops.keys()) if seasonal_crops else [],
            "image_name": timestamped,
            "image_url": f"/uploads/{timestamped}",
            "user_found": user.id if user else None,
            "message": f"Soil analysis completed successfully with {soil_confidence_level.lower()} confidence ({confidence_percent:.2f}%)"
        }
        
        # Add demo mode flag if using fallback
        if soil_model is None:
            response_data["demo_mode"] = True
            response_data["demo_note"] = f"Using filename-based analysis: '{filename}' suggests {predicted_soil}"
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"🔥 Error in soil prediction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(e)
        }), 500

# -----------------------------
# Plant prediction - ENHANCED FALLBACK MODE WITH CONSISTENT RESULTS
# -----------------------------
@app.route("/api/plant", methods=["POST"])
def predict_plant():
    """Predict plant disease with enhanced fallback mode and consistent results"""
    try:
        # Get user email if provided
        user_email = request.form.get("user_email")
        
        if "file" not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file uploaded"
            }), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({
                "success": False,
                "error": "No file selected"
            }), 400

        # Save the uploaded file
        filename = secure_filename(file.filename)
        timestamped = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{filename}"
        saved_path = os.path.join(UPLOAD_DIR, timestamped)
        file.save(saved_path)
        print(f"✅ Saved plant image: {timestamped}")

        # Find user if email provided
        user = None
        if user_email:
            user = User.query.filter_by(email=user_email.strip().lower()).first()
            print(f"📧 User for plant analysis: {user.email if user else 'Not found'}")

        # Check if model is available
        if plant_model is None:
            print("⚠️  Plant model not loaded, using enhanced demo mode with consistent results")
            
            # Get deterministic demo plant analysis based on filename
            demo_result = get_demo_plant_analysis(filename)
            label = demo_result["label"]
            formatted_prediction = demo_result["formatted_prediction"]
            plant_name = demo_result["plant_name"]
            disease_name = demo_result["disease_name"]
            is_healthy = demo_result["is_healthy"]
            confidence = demo_result["confidence"]
            confidence_percent = demo_result["confidence_percent"]
            solution = demo_result["solution"]
            top_predictions = demo_result["top_predictions"]
            demo_mode = True
            
            print(f"🌿 Deterministic plant prediction for '{filename}': {label} (Confidence: {confidence_percent:.2f}%)")
        else:
            # Make prediction with real model
            label = "Unknown"
            confidence = 0.0
            confidence_percent = 0.0
            top_predictions = []
            demo_mode = False
            
            try:
                # Preprocess image
                img = preprocess_plant(saved_path)
                
                # Make prediction
                preds = plant_model.predict(img, verbose=0)
                
                # Get the predicted class index
                idx = int(np.argmax(preds[0]))
                confidence = float(preds[0][idx])
                confidence_percent = confidence * 100
                
                print(f"🔍 Prediction results - Index: {idx}, Raw confidence: {confidence}, Percent: {confidence_percent:.2f}%")
                
                # Get top 3 predictions for display
                top_indices = np.argsort(preds[0])[-3:][::-1]
                top_predictions = []
                
                for top_idx in top_indices:
                    top_confidence = float(preds[0][top_idx])
                    top_label = plant_labels.get(str(top_idx)) or plant_labels.get(top_idx) or PLANT_CLASSES.get(top_idx, f"Class_{top_idx}")
                    
                    # Format the label for display
                    display_label = format_disease_label_for_display(top_label)
                    
                    top_predictions.append({
                        "label": top_label,
                        "display_label": display_label,
                        "confidence": round(top_confidence, 4),
                        "confidence_percent": round(top_confidence * 100, 2),
                        "confidence_formatted": f"{top_confidence * 100:.2f}%"
                    })
                
                # Try to get label from loaded JSON labels first
                if plant_labels:
                    # Try string key first
                    label = plant_labels.get(str(idx))
                    if not label:
                        # Try integer key
                        label = plant_labels.get(idx)
                
                # If still no label, use our hardcoded classes
                if not label or label == "Unknown":
                    label = PLANT_CLASSES.get(idx, f"Class_{idx}")
                
                print(f"🌿 Plant prediction: {label} (Confidence: {confidence_percent:.2f}%)")
                
                # Format the main prediction label for display
                formatted_prediction = format_disease_label_for_display(label)
                
                # Extract plant name and disease from label
                plant_name = "Plant"
                disease_name = "Disease"
                if isinstance(label, str):
                    if "___" in label:
                        parts = label.split("___")
                        if len(parts) > 0:
                            plant_name = parts[0].replace("_", " ").title()
                        if len(parts) > 1:
                            disease_name = parts[1].replace("_", " ").title()
                            # Remove content in parentheses
                            disease_name = disease_name.split("(")[0].strip()
                    else:
                        disease_name = label.replace("_", " ").title()
                else:
                    # If label is not a string, convert it
                    label = str(label)
                
                # Check if it's healthy
                is_healthy = isinstance(label, str) and "healthy" in label.lower()
                
                # Find solution for the disease
                solution = find_solution_for_label(label)
                
            except Exception as pred_error:
                print(f"❌ Error during plant prediction: {pred_error}")
                # Fall back to demo mode if real prediction fails
                demo_result = get_demo_plant_analysis(filename)
                label = demo_result["label"]
                formatted_prediction = demo_result["formatted_prediction"]
                plant_name = demo_result["plant_name"]
                disease_name = demo_result["disease_name"]
                is_healthy = demo_result["is_healthy"]
                confidence = demo_result["confidence"]
                confidence_percent = demo_result["confidence_percent"]
                solution = demo_result["solution"]
                top_predictions = demo_result["top_predictions"]
                demo_mode = True

        # Determine confidence level and color
        if confidence_percent >= 85:
            confidence_level = "High"
            confidence_color = "success"
        elif confidence_percent >= 70:
            confidence_level = "Medium"
            confidence_color = "warning"
        elif confidence_percent >= 50:
            confidence_level = "Low"
            confidence_color = "info"
        else:
            confidence_level = "Very Low"
            confidence_color = "danger"

        # Calculate accuracy rating (out of 5 stars)
        accuracy_stars = min(5, int((confidence_percent / 100) * 5))
        if accuracy_stars < 1:
            accuracy_stars = 1

        # Save to database
        try:
            plant_record = PlantAnalysis(
                user_id=user.id if user else None,
                predicted_label=label,
                confidence=confidence,
                image_name=timestamped
            )
            db.session.add(plant_record)
            db.session.commit()
            print(f"✅ Saved plant analysis to DB (ID: {plant_record.id})")
        except Exception as db_error:
            print(f"❌ DB plant save error: {db_error}")
            db.session.rollback()

        # Prepare the response
        response_data = {
            "success": True,
            "prediction": formatted_prediction,
            "original_label": label,
            "plant_name": plant_name,
            "disease_name": disease_name,
            "is_healthy": is_healthy,
            "confidence": round(confidence, 4),
            "confidence_percent": round(confidence_percent, 2),
            "confidence_formatted": f"{confidence_percent:.2f}%",
            "confidence_level": confidence_level,
            "confidence_color": confidence_color,
            "accuracy_stars": accuracy_stars,
            "top_predictions": top_predictions,
            "image_name": timestamped,
            "image_url": f"/uploads/{timestamped}",
            "solution": solution,
            "user_found": user.id if user else None,
            "user_email": user_email,
            "message": f"✅ Analysis complete: {formatted_prediction} with {confidence_level.lower()} confidence ({confidence_percent:.2f}%)",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Add demo mode flag if using fallback
        if demo_mode:
            response_data["demo_mode"] = True
            response_data["demo_note"] = "Using enhanced demo data with consistent results (same file = same prediction)"
        
        print(f"📤 Sending response with confidence: {confidence_percent:.2f}%")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"🔥 Unexpected error in plant prediction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(e)
        }), 500

# -----------------------------
# Debug plant prediction
# -----------------------------
@app.route("/api/debug-plant", methods=["POST"])
def debug_plant():
    """Debug endpoint to test plant prediction"""
    if "file" not in request.files:
        return jsonify({"error": "No image file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Save the uploaded file
    filename = secure_filename(file.filename)
    timestamped = f"debug_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{filename}"
    saved_path = os.path.join(UPLOAD_DIR, timestamped)
    file.save(saved_path)
    
    debug_info = {
        "plant_model_loaded": plant_model is not None,
        "plant_labels_loaded": len(plant_labels) > 0,
        "solutions_loaded": len(solutions_dict) > 0,
        "plant_classes_count": len(PLANT_CLASSES),
        "plant_labels_count": len(plant_labels),
        "solutions_count": len(solutions_dict),
        "tensorflow_available": TENSORFLOW_AVAILABLE,
        "demo_mode_active": plant_model is None
    }
    
    if plant_model is None:
        # Test the deterministic function
        test_filename = filename
        test_results = []
        for i in range(5):
            result = get_plant_prediction_from_filename(test_filename)
            test_results.append({
                "iteration": i,
                "label": result[0],
                "confidence": result[1],
                "is_healthy": result[2]
            })
        
        return jsonify({
            "error": "Plant model not loaded - Using enhanced demo mode",
            "debug_info": debug_info,
            "demo_diseases_available": len(DEMO_PLANT_DISEASES),
            "deterministic_test": test_results,
            "consistency_check": all(r["label"] == test_results[0]["label"] for r in test_results),
            "demo_mode_description": "The system is running in enhanced demo mode with deterministic plant disease data"
        }), 200
    
    try:
        # Preprocess image
        img = preprocess_plant(saved_path)
        
        # Make prediction
        preds = plant_model.predict(img, verbose=0)
        
        # Get top 3 predictions
        top_indices = np.argsort(preds[0])[-3:][::-1]
        top_predictions = []
        
        for idx in top_indices:
            confidence = float(preds[0][idx])
            
            # Get label
            label = plant_labels.get(str(idx)) or plant_labels.get(idx) or PLANT_CLASSES.get(idx, f"Class_{idx}")
            
            top_predictions.append({
                "index": int(idx),
                "label": label,
                "confidence": round(confidence, 4),
                "confidence_percent": f"{confidence:.2%}"
            })
        
        debug_info.update({
            "model_output_shape": str(plant_model.output_shape) if hasattr(plant_model, 'output_shape') else "Unknown",
            "predictions_shape": str(preds.shape),
            "top_predictions": top_predictions,
            "all_predictions": preds[0].tolist()
        })
        
        return jsonify({
            "success": True,
            "debug_info": debug_info,
            "message": "Plant prediction debug completed"
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"❌ Debug plant prediction error: {e}")
        print(f"📋 Traceback: {error_trace}")
        
        debug_info["error"] = str(e)
        debug_info["traceback"] = error_trace
        
        return jsonify({
            "error": "Debug prediction failed",
            "debug_info": debug_info
        }), 500

# -----------------------------
# History route
# -----------------------------
@app.route('/api/history')
def get_history():
    email = request.args.get('email')
    type_filter = request.args.get('type', 'all')
    
    if not email:
        return jsonify({'error': 'Email parameter is required'}), 400
    
    # Find user
    user = User.query.filter_by(email=email.strip().lower()).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get plant history for this user
    plant_history = []
    if type_filter in ['all', 'plant']:
        plant_records = PlantAnalysis.query.filter_by(user_id=user.id).order_by(PlantAnalysis.created_at.desc()).all()
        for record in plant_records:
            confidence_percent = record.confidence * 100 if record.confidence else 0
            
            # Determine confidence level
            if confidence_percent >= 85:
                confidence_level = "High"
                confidence_color = "success"
            elif confidence_percent >= 70:
                confidence_level = "Medium"
                confidence_color = "warning"
            elif confidence_percent >= 50:
                confidence_level = "Low"
                confidence_color = "info"
            else:
                confidence_level = "Very Low"
                confidence_color = "danger"
            
            # Format label for display
            display_label = format_disease_label_for_display(record.predicted_label) if record.predicted_label else "Unknown"
            
            plant_history.append({
                'id': record.id,
                'predicted_label': record.predicted_label,
                'display_label': display_label,
                'confidence': record.confidence,
                'confidence_percent': round(confidence_percent, 2),
                'confidence_formatted': f"{confidence_percent:.2f}%",
                'confidence_level': confidence_level,
                'confidence_color': confidence_color,
                'image_name': record.image_name,
                'image_url': f"/uploads/{record.image_name}" if record.image_name else None,
                'created_at': record.created_at.isoformat() if record.created_at else None,
                'type': 'plant'
            })
    
    # Get soil history for this user  
    soil_history = []
    if type_filter in ['all', 'soil']:
        soil_records = SoilAnalysis.query.filter_by(user_id=user.id).order_by(SoilAnalysis.created_at.desc()).all()
        for record in soil_records:
            soil_history.append({
                'id': record.id,
                'predicted_soil': record.predicted_soil,
                'soil_info': safe_json_load(record.soil_info),
                'weather_info': safe_json_load(record.weather_info),
                'image_name': record.image_name,
                'image_url': f"/uploads/{record.image_name}" if record.image_name else None,
                'created_at': record.created_at.isoformat() if record.created_at else None,
                'type': 'soil'
            })
    
    return jsonify({
        'plant_history': plant_history,
        'soil_history': soil_history,
        'total_plant': len(plant_history),
        'total_soil': len(soil_history),
        'user_email': user.email,
        'message': 'History retrieved successfully'
    })

# -----------------------------
# Get user stats
# -----------------------------
@app.route('/api/user/stats', methods=['GET'])
def get_user_stats():
    """Get user statistics including soil tests, plant scans, etc."""
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Email parameter is required'}), 400
    
    try:
        # Get user from database
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get soil test count
        soil_tests = SoilAnalysis.query.filter_by(user_id=user.id).count()
        
        # Get plant scan count
        plant_scans = PlantAnalysis.query.filter_by(user_id=user.id).count()
        
        # Calculate active days (days since registration)
        from datetime import datetime, timezone
        
        # Make both datetimes timezone-aware
        now_utc = datetime.now(timezone.utc)
        
        # If created_at is naive, make it aware by assuming UTC
        if user.created_at.tzinfo is None:
            created_at_aware = user.created_at.replace(tzinfo=timezone.utc)
        else:
            created_at_aware = user.created_at
            
        days_active = (now_utc - created_at_aware).days
        if days_active < 1:
            days_active = 1
        
        # Calculate total analyses
        total_analyses = soil_tests + plant_scans
        
        return jsonify({
            'soil_tests': soil_tests,
            'plant_scans': plant_scans,
            'active_days': days_active,
            'total_analyses': total_analyses,
            'registration_date': user.created_at.isoformat() if user.created_at else None
        })
        
    except Exception as e:
        print(f"Error in get_user_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to get user stats: {str(e)}'}), 500

# -----------------------------
# DEBUG ENDPOINTS
# -----------------------------

@app.route('/api/debug/routes')
def list_routes():
    """List all available API endpoints"""
    import urllib
    output = []
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods))
        line = urllib.parse.unquote(f"{rule.endpoint:50s} {methods:20s} {rule}")
        output.append(line)
    
    return jsonify({
        "routes": sorted(output),
        "total_routes": len(output)
    })

@app.route('/api/debug/check-user/<email>')
def check_user(email):
    """Check if a user exists in the database"""
    user = User.query.filter_by(email=email.strip().lower()).first()
    if user:
        return jsonify({
            "exists": True,
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "has_password_hash": bool(user.password_hash),
            "created_at": user.created_at.isoformat() if user.created_at else None
        })
    else:
        return jsonify({"exists": False, "email": email})

@app.route('/api/debug/users')
def get_all_users():
    """Get all users in the database (for debugging)"""
    try:
        users = User.query.all()
        users_list = []
        for user in users:
            users_list.append({
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        return jsonify({
            'users': users_list,
            'count': len(users_list)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug/reset-test-user', methods=['POST'])
def reset_test_user():
    """Create or reset a test user for debugging"""
    try:
        # Delete existing test user if exists
        test_user = User.query.filter_by(email="test@example.com").first()
        if test_user:
            db.session.delete(test_user)
            db.session.commit()
        
        # Create new test user
        user = User(
            name="Test User",
            email="test@example.com",
            password_hash=generate_password_hash("test123")
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            "message": "Test user created/reset",
            "user": {
                "email": "test@example.com",
                "password": "test123"
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# -----------------------------
# Test endpoint for seasonal crops
# -----------------------------
@app.route('/api/test-season-recommendation', methods=["GET"])
def test_season_recommendation():
    """Test endpoint to verify seasonal recommendations work"""
    test_data = {
        "soil_type": "Alluvial soil",
        "season": "Winter"
    }
    
    # Test the function directly
    seasonal_crops = get_seasonal_crops_for_soil(test_data["soil_type"])
    
    result = {
        "test_data": test_data,
        "seasonal_crops_found": seasonal_crops is not None,
        "all_seasons": list(seasonal_crops.keys()) if seasonal_crops else [],
        "winter_crops": seasonal_crops.get("Winter", []) if seasonal_crops else [],
        "SEASON_BASED_CROPS_keys": list(SEASON_BASED_CROPS.keys()),
        "soil_classes": soil_classes,
        "current_season": get_current_season()
    }
    
    return jsonify(result)

@app.route('/api/test-seasonal-crops')
def test_seasonal_crops():
    """Test endpoint to verify seasonal crops are working"""
    test_cases = [
        {"soil_type": "Alluvial soil", "season": "Winter", "expected": ["Wheat", "Mustard", "Barley", "Peas", "Gram"]},
        {"soil_type": "Black Soil", "season": "Winter", "expected": ["Wheat", "Gram", "Jowar", "Mustard", "Barley"]},
        {"soil_type": "Red soil", "season": "Winter", "expected": ["Wheat", "Mustard", "Gram", "Onion", "Garlic"]},
        {"soil_type": "Clay soil", "season": "Winter", "expected": ["Peas", "Wheat", "Mustard", "Potato", "Oats"]},
        {"soil_type": "Gravel", "season": "Winter", "expected": ["Onion", "Potato", "Garlic", "Mustard", "Wheat"]}
    ]
    
    results = []
    for test in test_cases:
        seasonal_crops = get_seasonal_crops_for_soil(test["soil_type"])
        if seasonal_crops and test["season"] in seasonal_crops:
            crops = seasonal_crops[test["season"]]
            results.append({
                "soil_type": test["soil_type"],
                "season": test["season"],
                "expected": test["expected"],
                "actual": crops,
                "match": crops == test["expected"],
                "found": True
            })
        else:
            results.append({
                "soil_type": test["soil_type"],
                "season": test["season"],
                "expected": test["expected"],
                "actual": [],
                "match": False,
                "found": False
            })
    
    return jsonify({
        "test_results": results,
        "SEASON_BASED_CROPS_keys": list(SEASON_BASED_CROPS.keys()),
        "soil_classes": soil_classes,
        "current_season": get_current_season()
    })

# -----------------------------
# Clear user data (for testing)
# -----------------------------
@app.route('/api/clear-test-data', methods=['POST'])
def clear_test_data():
    """Clear test data - for development only"""
    try:
        # Delete all analyses
        SoilAnalysis.query.delete()
        PlantAnalysis.query.delete()
        
        # Delete test users (keep admin users)
        test_users = User.query.filter(User.email.like('%@example.com')).all()
        for user in test_users:
            db.session.delete(user)
        
        db.session.commit()
        return jsonify({'message': 'Test data cleared successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to clear test data: {str(e)}'}), 500

# -----------------------------
# New endpoint: Test file upload
# -----------------------------
@app.route("/api/test-upload", methods=["POST"])
def test_upload():
    """Simple test endpoint to verify file upload works"""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    
    # Save file
    filename = secure_filename(file.filename)
    timestamped = f"test_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{filename}"
    saved_path = os.path.join(UPLOAD_DIR, timestamped)
    file.save(saved_path)
    
    # Return success
    return jsonify({
        "success": True,
        "message": "File uploaded successfully",
        "filename": timestamped,
        "file_size": os.path.getsize(saved_path),
        "url": f"/uploads/{timestamped}"
    })

# -----------------------------
# Test consistency endpoint
# -----------------------------
@app.route("/api/test-consistency", methods=["GET"])
def test_consistency():
    """Test that the same filename gives the same prediction every time"""
    test_filenames = ["tomato1.jpg", "apple2.jpg", "potato3.jpg", "grape4.jpg", "corn5.jpg"]
    
    results = {}
    for filename in test_filenames:
        # Test 3 times to ensure consistency
        predictions = []
        for i in range(3):
            label, confidence, is_healthy = get_plant_prediction_from_filename(filename)
            predictions.append({
                "iteration": i,
                "label": label,
                "confidence": confidence,
                "is_healthy": is_healthy
            })
        
        # Check if all predictions are the same
        consistent = all(p["label"] == predictions[0]["label"] for p in predictions)
        
        results[filename] = {
            "predictions": predictions,
            "consistent": consistent,
            "hash": int(hashlib.md5(filename.lower().encode()).hexdigest(), 16)
        }
    
    return jsonify({
        "test_results": results,
        "all_consistent": all(r["consistent"] for r in results.values())
    })

# -----------------------------
# Run
# -----------------------------
if __name__ == "__main__":
    print("\n" + "="*50)
    print("🌱 Agro-Optics AI Backend - ENHANCED FALLBACK MODE WITH CONSISTENT RESULTS")
    print("="*50)
    print(f"📁 Instance path: {app.instance_path}")
    print(f"📁 Uploads directory: {UPLOAD_DIR}")
    print(f"📊 Database path: {DB_PATH}")
    print(f"🤖 Soil model: {'✅ Loaded' if soil_model else '❌ Not available (using enhanced demo)'}")
    print(f"🌿 Plant model: {'✅ Loaded' if plant_model else '❌ Not available (using enhanced demo with consistent results)'}")
    print(f"📊 Data Loaded:")
    print(f"  - Soil dataset: {len(df)} rows")
    print(f"  - Disease solutions: {len(solutions_dict)}")
    print(f"  - Demo plant diseases: {len(DEMO_PLANT_DISEASES)}")
    print(f"  - Demo soil types: {len(DEMO_SOIL_TYPES)}")
    print(f"📅 Current season: {get_current_season()}")
    print("\n📋 Available Soil Types for Seasonal Crops:")
    for soil_type in SEASON_BASED_CROPS.keys():
        print(f"   - {soil_type}")
    print("\n📋 Available Seasons:")
    for season in ["Summer", "Winter", "Rainy"]:
        print(f"   - {season}")
    print("="*50)
    
    print("\n🔗 API Endpoints for Plant Diagnosis (NOW CONSISTENT):")
    print("   1. POST /api/plant - Upload plant image for disease detection")
    print("   2. GET  /api/test-plant-response - Test endpoint with sample response")
    print("   3. POST /api/debug-plant - Debug plant prediction")
    print("   4. GET  /api/test-consistency - Test consistency of predictions")
    print("   5. GET  /api/health - Check backend and model status")
    print("\n🔗 API Endpoints for Soil Analysis:")
    print("   6. POST /api/soil - Upload soil image for analysis")
    print("\n🔗 API Endpoints for Seasonal Crops:")
    print("   7. GET  /api/seasons - Get all available seasons")
    print("   8. POST /api/crop-by-season - Get crops for soil & season (JSON)")
    print("   9. GET  /api/seasonal-crops?soil_type=X&season=Y - Get crops via GET")
    print("\n🔗 API Endpoints for User Management:")
    print("   10. POST /api/signup - User registration")
    print("   11. POST /api/login - User login")
    print("   12. GET  /api/user/profile?email=X - Get user profile")
    print("   13. POST /api/user/update - Update user profile")
    print("   14. GET  /api/history?email=X - Get user history")
    print("="*50)
    
    print("\n⚠️  IMPORTANT: Plant predictions are now DETERMINISTIC")
    print("   - Same filename = Same prediction every time")
    print("   - No more random changes between analyses")
    print("="*50)
    
    print("🚀 Starting server on http://127.0.0.1:5000")
    print("="*50 + "\n")
    
    app.run(host="0.0.0.0", port=5000, debug=True)