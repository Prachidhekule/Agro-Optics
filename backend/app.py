# # app.py
# import os
# import json
# from datetime import datetime
# from difflib import get_close_matches

# from flask import Flask, request, jsonify, send_from_directory
# from flask_cors import CORS
# from flask_sqlalchemy import SQLAlchemy
# from werkzeug.security import generate_password_hash, check_password_hash
# from werkzeug.utils import secure_filename

# # optional: these will be used if tensorflow + keras models exist
# try:
#     import tensorflow as tf
#     from tensorflow.keras.models import load_model
#     from tensorflow.keras.preprocessing import image
# except Exception:
#     tf = None
#     load_model = None
#     image = None

# import numpy as np
# import pandas as pd
# import requests

# # =============================
# # App + instance dir setup
# # =============================
# app = Flask(__name__, instance_relative_config=True)
# CORS(app)

# os.makedirs(app.instance_path, exist_ok=True)

# DB_PATH = os.path.join(app.instance_path, "agro_optics.db")
# app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
# app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# UPLOAD_DIR = os.path.join(app.instance_path, "uploads")
# os.makedirs(UPLOAD_DIR, exist_ok=True)

# db = SQLAlchemy(app)

# # =============================
# # DATABASE MODELS
# # =============================
# class User(db.Model):
#     __tablename__ = "user"
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(150), nullable=False)
#     email = db.Column(db.String(200), unique=True, nullable=False)
#     password_hash = db.Column(db.String(300), nullable=False)
#     photo = db.Column(db.String(400), nullable=True)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)

#     soil_analyses = db.relationship("SoilAnalysis", backref="user", lazy=True)
#     plant_analyses = db.relationship("PlantAnalysis", backref="user", lazy=True)

#     def check_password(self, password):
#         return check_password_hash(self.password_hash, password)

#     def to_dict(self):
#         return {
#             "id": self.id,
#             "name": self.name,
#             "email": self.email,
#             "photo": self.photo,
#             "created_at": self.created_at.isoformat()
#         }


# class SoilAnalysis(db.Model):
#     __tablename__ = "soil_analysis"
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
#     predicted_soil = db.Column(db.String(200))
#     soil_info = db.Column(db.Text)
#     weather_info = db.Column(db.Text)
#     image_name = db.Column(db.String(400))
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)


# class PlantAnalysis(db.Model):
#     __tablename__ = "plant_analysis"
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
#     predicted_label = db.Column(db.String(200))
#     confidence = db.Column(db.Float)
#     image_name = db.Column(db.String(400))
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)


# with app.app_context():
#     db.create_all()
#     print("DB initialized at:", DB_PATH)

# # ==========================================
# # 🌿 NEW: PLANT DISEASE CLASS LABEL MAP
# # ==========================================
# PLANT_CLASSES = {
#     0: "Apple___Black_rot",
#     1: "Apple___Cedar_apple_rust",
#     2: "Apple___Healthy",
#     3: "Blueberry___Healthy",
#     4: "Cherry_(including_sour)___Powdery_mildew",
#     5: "Cherry_(including_sour)___Healthy",
#     6: "Corn_(maize)___Cercospora_leaf_spot_Gray_leaf_spot",
#     7: "Corn_(maize)___Common_rust",
#     8: "Corn_(maize)___Healthy",
#     9: "Grape___Black_rot",
#     10: "Grape___Esca_(Black_Measles)",
#     11: "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
#     12: "Peach___Bacterial_spot",
#     13: "Peach___Healthy",
#     14: "Pepper,_bell___Bacterial_spot",
#     15: "Pepper,_bell___Healthy",
#     16: "Potato___Early_blight",
#     17: "Potato___Late_blight",
#     18: "Potato___Healthy",
#     19: "Strawberry___Healthy"
# }

# # =============================
# # Load optional models + dataset
# # =============================
# tf_get_logger = None
# soil_model = None
# plant_model = None
# plant_labels = {}
# df = pd.DataFrame()

# MODELS_DIR = os.path.join(app.instance_path, "models")
# # allow models in instance/models or backend/models
# possible_soil = [
#     os.path.join(MODELS_DIR, "soil3_vision_model_v1.h5"),
#     os.path.join("models", "soil3_vision_model_v1.h5")
# ]
# possible_plant = [
#     os.path.join(MODELS_DIR, "plant_disease_prediction_model.h5"),
#     os.path.join("models", "plant_disease_prediction_model.h5")
# ]
# possible_labels = os.path.join(MODELS_DIR, "class_labels.json")
# possible_dataset_csv = [
#     os.path.join(MODELS_DIR, "Cleaned3_Soil_Vision_Dataset.csv"),
#     os.path.join("models", "Cleaned3_Soil_Vision_Dataset.csv")
# ]

# if tf is not None:
#     tf_get_logger = tf.get_logger()
#     tf_get_logger.setLevel('ERROR')

# # try load soil model
# for p in possible_soil:
#     if os.path.exists(p):
#         try:
#             print("Loading soil model from:", p)
#             soil_model = load_model(p)
#             break
#         except Exception as e:
#             print("Could not load soil model from", p, "-", e)

# # try load plant model
# for p in possible_plant:
#     if os.path.exists(p):
#         try:
#             print("Loading plant model from:", p)
#             plant_model = tf.keras.models.load_model(p)
#             break
#         except Exception as e:
#             print("Could not load plant model from", p, "-", e)

# # load plant labels if present
# if os.path.exists(possible_labels):
#     try:
#         with open(possible_labels, "r") as f:
#             plant_labels = json.load(f)
#     except Exception as e:
#         print("Could not load class_labels.json:", e)

# # load dataset CSV if present
# for p in possible_dataset_csv:
#     if os.path.exists(p):
#         try:
#             df = pd.read_csv(p)
#             df.columns = (
#                 df.columns
#                 .str.strip()
#                 .str.replace(" ", "_")
#                 .str.replace("-", "_")
#                 .str.replace("(", "")
#                 .str.replace(")", "")
#             )
#             if "Soil_Type" in df.columns:
#                 df['Soil_Type'] = df['Soil_Type'].str.strip()
#             print("Loaded soil dataset from:", p)
#         except Exception as e:
#             print("Could not read dataset CSV:", e)
#         break

# soil_classes = ['Alluvial soil', 'Black Soil', 'Clay soil', 'Gravel', 'Red soil', 'Silt', 'Sand']
# soil_label_map = {
#     "Alluvial soil": "alluvial soil",
#     "Black Soil": "black soil",
#     "Clay soil": "clay soil",
#     "Gravel": "gravel",
#     "Red soil": "red soil",
#     "Silt": "silt",
#     "Sand": "sand"
# }

# # =============================
# # Utility helpers
# # =============================
# def safe_json_load(s):
#     try:
#         return json.loads(s) if s else None
#     except Exception:
#         return None

# def preprocess_plant(path, img_size=224):
#     if image is None:
#         raise RuntimeError("Keras image utilities not available")
#     img = tf.keras.utils.load_img(path, target_size=(img_size, img_size))
#     arr = tf.keras.utils.img_to_array(img) / 255.0
#     return np.expand_dims(arr, axis=0)

# # =============================
# # Serve uploaded images
# # =============================
# @app.route("/uploads/<path:filename>")
# def uploaded_file(filename):
#     # Security: filename already passed through secure_filename when saved
#     return send_from_directory(UPLOAD_DIR, filename, as_attachment=False)

# # =============================
# # Simple test route
# # =============================
# @app.route("/api/hello")
# def hello():
#     return jsonify({"message": "Backend is working perfectly!", "instance_uploads": UPLOAD_DIR})

# # =============================
# # Seasons & crop mapping
# # =============================
# @app.route("/api/seasons")
# def get_seasons():
#     return jsonify({"seasons": ["Summer", "Winter", "Rainy"]})

# @app.route("/api/crop-by-season", methods=["POST"])
# def crop_by_season():
#     season = request.json.get("season")
#     season_crop_map = {
#         "Summer": ["Sugarcane", "Maize", "Bajra", "Groundnut", "Sesame"],
#         "Winter": ["Wheat", "Mustard", "Barley", "Peas", "Garlic"],
#         "Rainy": ["Rice", "Cotton", "Soybean", "Tur", "Moong"]
#     }
#     return jsonify({"season": season, "recommended_crops": season_crop_map.get(season, [])})

# # =============================
# # Auth: Signup
# # =============================
# @app.route("/api/signup", methods=["POST"])
# def signup():
#     # accept form-data (with optional photo) OR JSON body
#     name = request.form.get("name") or (request.json and request.json.get("name"))
#     email = request.form.get("email") or (request.json and request.json.get("email"))
#     password = request.form.get("password") or (request.json and request.json.get("password"))

#     if not name or not email or not password:
#         return jsonify({"error": "name, email and password required"}), 400

#     if User.query.filter_by(email=email).first():
#         return jsonify({"error": "Email already registered"}), 400

#     photo_filename = None
#     if "photo" in request.files:
#         photo = request.files["photo"]
#         safe_name = secure_filename(photo.filename) if photo.filename else "photo"
#         photo_filename = f"photo_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{safe_name}"
#         photo.save(os.path.join(UPLOAD_DIR, photo_filename))

#     user = User(
#         name=name,
#         email=email,
#         password_hash=generate_password_hash(password),
#         photo=photo_filename
#     )
#     db.session.add(user)
#     db.session.commit()
#     print("New user created:", user.email, "id:", user.id)
#     return jsonify({"message": "signup successful", "user": user.to_dict()}), 201

# # =============================
# # Auth: Login
# # =============================
# @app.route("/api/login", methods=["POST"])
# def login():
#     data = request.get_json() or {}
#     email = data.get("email") or request.form.get("email")
#     password = data.get("password") or request.form.get("password")
#     if not email or not password:
#         return jsonify({"error": "email and password required"}), 400

#     user = User.query.filter_by(email=email).first()
#     if not user or not user.check_password(password):
#         return jsonify({"error": "invalid credentials"}), 401

#     return jsonify({"message": "login successful", "user": user.to_dict()})

# # =============================
# # Soil prediction endpoint
# # =============================
# @app.route("/api/soil", methods=["POST"])
# def predict_soil():
#     if soil_model is None:
#         print("WARNING: soil_model not loaded; endpoint will still run but predictions may be placeholder")
#         # we still accept upload and store things in DB

#     city = request.form.get("city", "Belagavi")
#     user_email = request.form.get("user_email") or request.headers.get("X-User-Email")
#     print("DEBUG /api/soil: received user_email ->", repr(user_email))

#     user = None
#     if user_email:
#         user = User.query.filter_by(email=user_email).first()
#         print("DEBUG /api/soil: user matched ->", getattr(user, "id", None))

#     if "file" not in request.files:
#         return jsonify({"error": "No file uploaded", "received_user_email": user_email}), 400

#     file = request.files["file"]
#     filename = secure_filename(file.filename) if file.filename else "uploaded"
#     timestamped = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
#     saved_path = os.path.join(UPLOAD_DIR, timestamped)
#     file.save(saved_path)
#     print("Saved file to:", saved_path)

#     predicted_soil = "Unknown"
#     try:
#         if soil_model is not None and image is not None:
#             img = image.load_img(saved_path, target_size=(150, 150))
#             img_arr = np.expand_dims(image.img_to_array(img), axis=0) / 255.0
#             prediction = soil_model.predict(img_arr)
#             idx = int(np.argmax(prediction.squeeze()))
#             predicted_soil = soil_classes[idx] if idx < len(soil_classes) else "Unknown"
#         else:
#             # fallback: try to infer from filename or use default
#             predicted_soil = "Unknown"
#     except Exception as e:
#         print("ERROR during soil prediction:", e)
#         predicted_soil = "Unknown"

#     mapped = soil_label_map.get(predicted_soil, predicted_soil).lower()
#     row = None
#     if not df.empty and "Soil_Type" in df.columns:
#         try:
#             match = get_close_matches(mapped, df['Soil_Type'].str.lower(), n=1)
#             row = df[df['Soil_Type'].str.lower() == match[0]].iloc[0] if match else df.iloc[0]
#         except Exception as e:
#             print("WARN: dataset matching failed:", e)
#             row = None

#     def safe(v):
#         return None if pd.isna(v) else v

#     soil_info = {}
#     if row is not None:
#         soil_info = {
#             "soil_type": safe(row.get("Soil_Type")),
#             "ph": f"{safe(row.get('pH_Range_min'))}–{safe(row.get('pH_Range_max'))}" if safe(row.get('pH_Range_min')) and safe(row.get('pH_Range_max')) else safe(row.get('pH_Range')),
#             "npk": {
#                 "N": f"{safe(row.get('Nitrogen_mg/kg_min'))}–{safe(row.get('Nitrogen_mg/kg_max'))}" if safe(row.get('Nitrogen_mg/kg_min')) and safe(row.get('Nitrogen_mg/kg_max')) else safe(row.get('Nitrogen_mg/kg')),
#                 "P": f"{safe(row.get('Phosphorus_mg/kg_min'))}–{safe(row.get('Phosphorus_mg/kg_max'))}" if safe(row.get('Phosphorus_mg/kg_min')) and safe(row.get('Phosphorus_mg/kg_max')) else safe(row.get('Phosphorus_mg/kg')),
#                 "K": f"{safe(row.get('Potassium_mg/kg_min'))}–{safe(row.get('Potassium_mg/kg_max'))}" if safe(row.get('Potassium_mg/kg_min')) and safe(row.get('Potassium_mg/kg_max')) else safe(row.get('Potassium_mg/kg')),
#             },
#             "recommended_crops": safe(row.get("Crop_Recommendations")),
#             "recommended_fertilizers": safe(row.get("Fertilizer_Recommendations"))
#         }

#     # fetch weather (best-effort)
#     API_KEY = os.getenv("OPENWEATHER_API_KEY") or "d9c834bc3e00761992fc6cb1ab2e60bd"
#     weather = {}
#     try:
#         url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
#         w = requests.get(url, timeout=5)
#         if w.status_code == 200:
#             j = w.json()
#             weather = {
#                 "current_temperature": j.get("main", {}).get("temp"),
#                 "current_humidity": j.get("main", {}).get("humidity"),
#                 "weather_description": j.get("weather", [{}])[0].get("description")
#             }
#     except Exception as e:
#         print("WARN: weather fetch failed:", e)
#         weather = {"error": "Weather fetch failed"}

#     # save to DB
#     try:
#         soil_record = SoilAnalysis(
#             user_id=user.id if user else None,
#             predicted_soil=predicted_soil,
#             soil_info=json.dumps(soil_info),
#             weather_info=json.dumps(weather),
#             image_name=timestamped
#         )
#         db.session.add(soil_record)
#         db.session.commit()
#         print("DEBUG /api/soil: saved soil_analysis id:", soil_record.id, "user_id:", soil_record.user_id)
#     except Exception as e:
#         print("DB soil save error:", e)

#     return jsonify({
#         "predicted_soil": predicted_soil,
#         "soil_info": soil_info,
#         "weather": weather,
#         "image_name": timestamped,
#         "received_user_email": user_email,
#         "user_found": user.id if user else None
#     })



# # =============================
# # Plant prediction endpoint
# # =============================
# @app.route("/api/plant", methods=["POST"])
# def predict_plant():
#     if plant_model is None:
#         print("WARNING: plant_model not loaded; endpoint will still run with placeholder")

#     user_email = request.form.get("user_email") or request.headers.get("X-User-Email")
#     print("DEBUG /api/plant: received user_email ->", repr(user_email))

#     user = None
#     if user_email:
#         user = User.query.filter_by(email=user_email).first()

#     file = request.files.get("file") or request.files.get("image")
#     if file is None:
#         return jsonify({"error": "No image uploaded"}), 400

#     filename = secure_filename(file.filename) if file.filename else "uploaded"
#     timestamped = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
#     saved_path = os.path.join(UPLOAD_DIR, timestamped)
#     file.save(saved_path)

#     try:
#         if plant_model is not None:
#             img = preprocess_plant(saved_path)
#             preds = plant_model.predict(img)
#             idx = int(np.argmax(preds))
#             confidence = float(np.max(preds))

#             # 🌿 **USE REAL DISEASE NAME HERE**
#             label = PLANT_CLASSES.get(idx, f"Class_{idx}")

#         else:
#             label = "Unknown"
#             confidence = 0.0

#     except Exception as e:
#         print("ERROR during plant prediction:", e)
#         return jsonify({"error": "prediction failed", "details": str(e)}), 500

#     # save to DB
#     try:
#         plant_record = PlantAnalysis(
#             user_id=user.id if user else None,
#             predicted_label=label,
#             confidence=confidence,
#             image_name=timestamped
#         )
#         db.session.add(plant_record)
#         db.session.commit()
#         print("DEBUG saved plant_analysis id:", plant_record.id)

#     except Exception as e:
#         print("DB plant save error:", e)

#     return jsonify({
#         "prediction": label,
#         "confidence": round(confidence, 4),
#         "image_name": timestamped
#     })


# # =============================
# # History route
# # =============================
# @app.route("/api/history", methods=["GET"])
# def get_history():
#     email = request.args.get("email")
#     user = User.query.filter_by(email=email).first() if email else None

#     soil_rows = SoilAnalysis.query.filter_by(user_id=user.id).all() if user else []
#     plant_rows = PlantAnalysis.query.filter_by(user_id=user.id).all() if user else []

#     def soil_to_json(r):
#         return {
#             "id": r.id,
#             "predicted_soil": r.predicted_soil,
#             "soil_info": safe_json_load(r.soil_info),
#             "weather_info": safe_json_load(r.weather_info),
#             "image_url": f"/uploads/{r.image_name}",
#             "created_at": r.created_at.isoformat()
#         }

#     def plant_to_json(r):
#         return {
#             "id": r.id,
#             "predicted_label": r.predicted_label,
#             "confidence": r.confidence,
#             "image_url": f"/uploads/{r.image_name}",
#             "created_at": r.created_at.isoformat()
#         }

#     return jsonify({
#         "user": user.to_dict() if user else None,
#         "soil_history": [soil_to_json(r) for r in soil_rows],
#         "plant_history": [plant_to_json(r) for r in plant_rows]
#     })


# # =============================
# # Run
# # =============================
# if __name__ == "__main__":
#     print("Starting Flask app")
#     print("Instance path:", app.instance_path)
#     print("DB path:", DB_PATH)
#     app.run(host="0.0.0.0", port=5000, debug=True)








# # app.py
# import os
# import json
# from datetime import datetime
# from difflib import get_close_matches

# from flask import Flask, request, jsonify, send_from_directory
# from flask_cors import CORS
# from flask_sqlalchemy import SQLAlchemy
# from werkzeug.security import generate_password_hash, check_password_hash
# from werkzeug.utils import secure_filename

# # Try importing TF/Keras optional pieces
# try:
#     import tensorflow as tf
#     from tensorflow.keras.models import load_model
#     from tensorflow.keras.preprocessing import image
# except Exception:
#     tf = None
#     load_model = None
#     image = None

# import numpy as np
# import pandas as pd
# import requests

# # -----------------------------
# # Flask app + instance setup
# # -----------------------------
# app = Flask(__name__, instance_relative_config=True)
# CORS(app)

# # Ensure instance folder exists
# os.makedirs(app.instance_path, exist_ok=True)

# # DB inside instance to avoid permission issues
# DB_PATH = os.path.join(app.instance_path, "agro_optics.db")
# app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
# app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# # Uploads dir inside instance
# UPLOAD_DIR = os.path.join(app.instance_path, "uploads")
# os.makedirs(UPLOAD_DIR, exist_ok=True)

# db = SQLAlchemy(app)

# # -----------------------------
# # Database models
# # -----------------------------
# class User(db.Model):
#     __tablename__ = "user"
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(150), nullable=False)
#     email = db.Column(db.String(200), unique=True, nullable=False)
#     password_hash = db.Column(db.String(300), nullable=False)
#     photo = db.Column(db.String(400), nullable=True)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)

#     soil_analyses = db.relationship("SoilAnalysis", backref="user", lazy=True)
#     plant_analyses = db.relationship("PlantAnalysis", backref="user", lazy=True)

#     def check_password(self, password):
#         return check_password_hash(self.password_hash, password)

#     def to_dict(self):
#         return {
#             "id": self.id,
#             "name": self.name,
#             "email": self.email,
#             "photo": self.photo,
#             "created_at": self.created_at.isoformat()
#         }

# class SoilAnalysis(db.Model):
#     __tablename__ = "soil_analysis"
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
#     predicted_soil = db.Column(db.String(200))
#     soil_info = db.Column(db.Text)
#     weather_info = db.Column(db.Text)
#     image_name = db.Column(db.String(400))
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)

# class PlantAnalysis(db.Model):
#     __tablename__ = "plant_analysis"
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
#     predicted_label = db.Column(db.String(200))
#     confidence = db.Column(db.Float)
#     image_name = db.Column(db.String(400))
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)

# with app.app_context():
#     db.create_all()
#     print("DB initialized at:", DB_PATH)

# # -----------------------------
# # Optional models + datasets
# # -----------------------------
# tf_get_logger = None
# soil_model = None
# plant_model = None
# plant_labels = {}
# df = pd.DataFrame()

# MODELS_DIR = os.path.join(app.instance_path, "models")
# possible_soil = [
#     os.path.join(MODELS_DIR, "soil3_vision_model_v1.h5"),
#     os.path.join("models", "soil3_vision_model_v1.h5")
# ]
# possible_plant = [
#     os.path.join(MODELS_DIR, "plant_disease_prediction_model.h5"),
#     os.path.join("models", "plant_disease_prediction_model.h5"),
#     os.path.join(MODELS_DIR, "plant_disease_model.h5"),
#     os.path.join("models", "plant_disease_model.h5"),
# ]
# possible_labels = os.path.join(MODELS_DIR, "class_labels.json")
# possible_dataset_csv = [
#     os.path.join(MODELS_DIR, "Cleaned3_Soil_Vision_Dataset.csv"),
#     os.path.join("models", "Cleaned3_Soil_Vision_Dataset.csv")
# ]

# if tf is not None:
#     tf_get_logger = tf.get_logger()
#     tf_get_logger.setLevel('ERROR')

# # Try loading soil model (optional)
# for p in possible_soil:
#     if os.path.exists(p):
#         try:
#             print("Loading soil model from:", p)
#             soil_model = load_model(p)
#             break
#         except Exception as e:
#             print("Could not load soil model from", p, "-", e)

# # Try loading plant model (optional)
# for p in possible_plant:
#     if os.path.exists(p):
#         try:
#             print("Loading plant model from:", p)
#             plant_model = tf.keras.models.load_model(p)
#             break
#         except Exception as e:
#             print("Could not load plant model from", p, "-", e)

# # Load class_labels.json if present
# if os.path.exists(possible_labels):
#     try:
#         with open(possible_labels, "r", encoding="utf-8") as f:
#             plant_labels = json.load(f)
#             print("Loaded class_labels.json with", len(plant_labels), "labels")
#     except Exception as e:
#         print("Could not load class_labels.json:", e)

# # Load soil dataset CSV if present
# for p in possible_dataset_csv:
#     if os.path.exists(p):
#         try:
#             df = pd.read_csv(p)
#             df.columns = (
#                 df.columns
#                 .str.strip()
#                 .str.replace(" ", "_")
#                 .str.replace("-", "_")
#                 .str.replace("(", "")
#                 .str.replace(")", "")
#             )
#             if "Soil_Type" in df.columns:
#                 df['Soil_Type'] = df['Soil_Type'].str.strip()
#             print("Loaded soil dataset from:", p)
#         except Exception as e:
#             print("Could not read dataset CSV:", e)
#         break

# # Soil class list & mapping (used when model available)
# soil_classes = ['Alluvial soil', 'Black Soil', 'Clay soil', 'Gravel', 'Red soil', 'Silt', 'Sand']
# soil_label_map = {
#     "Alluvial soil": "alluvial soil",
#     "Black Soil": "black soil",
#     "Clay soil": "clay soil",
#     "Gravel": "gravel",
#     "Red soil": "red soil",
#     "Silt": "silt",
#     "Sand": "sand"
# }

# # -----------------------------
# # Disease solutions CSV loader
# # -----------------------------
# POSSIBLE_SOLUTIONS_CSV = [
#     os.path.join(app.instance_path, "models", "disease_solutions.csv"),
#     os.path.join(app.instance_path, "disease_solutions.csv"),
#     os.path.join("models", "disease_solutions.csv"),
#     os.path.join(".", "disease_solutions.csv"),
# ]

# solutions_dict = {}
# solutions_keys = []

# for p in POSSIBLE_SOLUTIONS_CSV:
#     if os.path.exists(p):
#         try:
#             sol_df = pd.read_csv(p)
#             # expect columns 'label' and 'solution'
#             if "label" in sol_df.columns and "solution" in sol_df.columns:
#                 sol_df["label"] = sol_df["label"].astype(str)
#                 for _, row in sol_df.iterrows():
#                     key = row["label"].strip()
#                     val = row["solution"] if not pd.isna(row["solution"]) else ""
#                     solutions_dict[key] = val
#                 solutions_keys = list(solutions_dict.keys())
#                 print("Loaded disease_solutions from:", p, "entries:", len(solutions_keys))
#                 break
#             else:
#                 print("disease_solutions.csv found but missing expected columns 'label' and 'solution' -", p)
#         except Exception as e:
#             print("Could not load disease_solutions.csv:", e)

# # -----------------------------
# # Optional fallback mapping (only if you want a baked-in fallback)
# # -----------------------------
# PLANT_CLASSES = {
#     0: "Apple___Apple_scab",
#     1: "Apple___Black_rot",
#     2: "Apple___Cedar_apple_rust",
#     3: "Apple___healthy",
#     4: "Blueberry___healthy",
#     5: "Cherry_(including_sour)_Powdery_mildew",
#     6: "Cherry_(including_sour)_healthy",
#     7: "Corn_(maize)_Cercospora_leaf_spot_Gray_leaf_spot",
#     8: "Corn_(maize)Common_rust",
#     9: "Corn_(maize)_Northern_Leaf_Blight",
#     10: "Corn_(maize)_healthy",
#     11: "Grape___Black_rot",
#     12: "Grape__Esca(Black_Measles)",
#     13: "Grape__Leaf_blight(Isariopsis_Leaf_Spot)",
#     14: "Grape___healthy",
#     15: "Orange__Haunglongbing(Citrus_greening)",
#     16: "Peach___Bacterial_spot",
#     17: "Peach___healthy",
#     18: "Pepper,bell__Bacterial_spot",
#     19: "Pepper,bell__healthy",
#     20: "Potato___Early_blight",
#     21: "Potato___Late_blight",
#     22: "Potato___healthy",
#     23: "Raspberry___healthy",
#     24: "Soybean___healthy",
#     25: "Squash___Powdery_mildew",
#     26: "Strawberry___Leaf_scorch",
#     27: "Strawberry___healthy",
#     28: "Tomato___Bacterial_spot",
#     29: "Tomato___Early_blight",
#     30: "Tomato___Late_blight",
#     31: "Tomato___Leaf_Mold",
#     32: "Tomato___Septoria_leaf_spot",
#     33: "Tomato___Spider_mites_Two-spotted_spider_mite",
#     34: "Tomato___Target_Spot",
#     35: "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
#     36: "Tomato___Tomato_mosaic_virus",
#     37: "Tomato___healthy"
# }

# # -----------------------------
# # Utility helpers
# # -----------------------------
# def safe_json_load(s):
#     try:
#         return json.loads(s) if s else None
#     except Exception:
#         return None

# def preprocess_plant(path, img_size=224):
#     if image is None:
#         raise RuntimeError("Keras image utilities not available")
#     img = tf.keras.utils.load_img(path, target_size=(img_size, img_size))
#     arr = tf.keras.utils.img_to_array(img) / 255.0
#     return np.expand_dims(arr, axis=0)

# # -----------------------------
# # Serve files
# # -----------------------------
# @app.route("/uploads/<path:filename>")
# def uploaded_file(filename):
#     return send_from_directory(UPLOAD_DIR, filename, as_attachment=False)

# # -----------------------------
# # Simple test
# # -----------------------------
# @app.route("/api/hello")
# def hello():
#     return jsonify({"message": "Backend is working perfectly!", "instance_uploads": UPLOAD_DIR})

# # -----------------------------
# # Seasons & crop mapping
# # -----------------------------
# @app.route("/api/seasons")
# def get_seasons():
#     return jsonify({"seasons": ["Summer", "Winter", "Rainy"]})

# @app.route("/api/crop-by-season", methods=["POST"])
# def crop_by_season():
#     season = request.json.get("season")
#     season_crop_map = {
#         "Summer": ["Sugarcane", "Maize", "Bajra", "Groundnut", "Sesame"],
#         "Winter": ["Wheat", "Mustard", "Barley", "Peas", "Garlic"],
#         "Rainy": ["Rice", "Cotton", "Soybean", "Tur", "Moong"]
#     }
#     return jsonify({"season": season, "recommended_crops": season_crop_map.get(season, [])})

# # -----------------------------
# # Auth (signup/login)
# # -----------------------------
# @app.route("/api/signup", methods=["POST"])
# def signup():
#     name = request.form.get("name") or (request.json and request.json.get("name"))
#     email = request.form.get("email") or (request.json and request.json.get("email"))
#     password = request.form.get("password") or (request.json and request.json.get("password"))

#     if not name or not email or not password:
#         return jsonify({"error": "name, email and password required"}), 400

#     if User.query.filter_by(email=email).first():
#         return jsonify({"error": "Email already registered"}), 400

#     photo_filename = None
#     if "photo" in request.files:
#         photo = request.files["photo"]
#         safe_name = secure_filename(photo.filename) if photo.filename else "photo"
#         photo_filename = f"photo_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{safe_name}"
#         photo.save(os.path.join(UPLOAD_DIR, photo_filename))

#     user = User(
#         name=name,
#         email=email,
#         password_hash=generate_password_hash(password),
#         photo=photo_filename
#     )
#     db.session.add(user)
#     db.session.commit()
#     print("New user created:", user.email, "id:", user.id)
#     return jsonify({"message": "signup successful", "user": user.to_dict()}), 201

# @app.route("/api/login", methods=["POST"])
# def login():
#     data = request.get_json() or {}
#     email = data.get("email") or request.form.get("email")
#     password = data.get("password") or request.form.get("password")
#     if not email or not password:
#         return jsonify({"error": "email and password required"}), 400

#     user = User.query.filter_by(email=email).first()
#     if not user or not user.check_password(password):
#         return jsonify({"error": "invalid credentials"}), 401

#     return jsonify({"message": "login successful", "user": user.to_dict()})

# # -----------------------------
# # Soil prediction
# # -----------------------------
# @app.route("/api/soil", methods=["POST"])
# def predict_soil():
#     # allow endpoint even if model missing
#     if soil_model is None:
#         print("WARNING: soil_model not loaded; endpoint will still run but predictions will be fallback")

#     city = request.form.get("city", "Belagavi")
#     user_email = request.form.get("user_email") or request.headers.get("X-User-Email")
#     print("DEBUG /api/soil: received user_email ->", repr(user_email))

#     user = None
#     if user_email:
#         user = User.query.filter_by(email=user_email).first()
#         print("DEBUG /api/soil: user matched ->", getattr(user, "id", None))

#     if "file" not in request.files:
#         return jsonify({"error": "No file uploaded", "received_user_email": user_email}), 400

#     file = request.files["file"]
#     filename = secure_filename(file.filename) if file.filename else "uploaded"
#     timestamped = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
#     saved_path = os.path.join(UPLOAD_DIR, timestamped)
#     file.save(saved_path)
#     print("Saved file to:", saved_path)

#     predicted_soil = "Unknown"
#     try:
#         if soil_model is not None and image is not None:
#             img = image.load_img(saved_path, target_size=(150, 150))
#             img_arr = np.expand_dims(image.img_to_array(img), axis=0) / 255.0
#             prediction = soil_model.predict(img_arr)
#             idx = int(np.argmax(prediction.squeeze()))
#             predicted_soil = soil_classes[idx] if idx < len(soil_classes) else "Unknown"
#     except Exception as e:
#         print("ERROR during soil prediction:", e)
#         predicted_soil = "Unknown"

#     mapped = soil_label_map.get(predicted_soil, predicted_soil).lower()
#     row = None
#     if not df.empty and "Soil_Type" in df.columns:
#         try:
#             match = get_close_matches(mapped, df['Soil_Type'].str.lower(), n=1)
#             row = df[df['Soil_Type'].str.lower() == match[0]].iloc[0] if match else df.iloc[0]
#         except Exception as e:
#             print("WARN: dataset matching failed:", e)
#             row = None

#     def safe(v):
#         return None if pd.isna(v) else v

#     soil_info = {}
#     if row is not None:
#         soil_info = {
#             "soil_type": safe(row.get("Soil_Type")),
#             "ph": f"{safe(row.get('pH_Range_min'))}–{safe(row.get('pH_Range_max'))}" if safe(row.get('pH_Range_min')) and safe(row.get('pH_Range_max')) else safe(row.get('pH_Range')),
#             "npk": {
#                 "N": f"{safe(row.get('Nitrogen_mg/kg_min'))}–{safe(row.get('Nitrogen_mg/kg_max'))}" if safe(row.get('Nitrogen_mg/kg_min')) and safe(row.get('Nitrogen_mg/kg_max')) else safe(row.get('Nitrogen_mg/kg')),
#                 "P": f"{safe(row.get('Phosphorus_mg/kg_min'))}–{safe(row.get('Phosphorus_mg/kg_max'))}" if safe(row.get('Phosphorus_mg/kg_min')) and safe(row.get('Phosphorus_mg/kg_max')) else safe(row.get('Phosphorus_mg/kg')),
#                 "K": f"{safe(row.get('Potassium_mg/kg_min'))}–{safe(row.get('Potassium_mg/kg_max'))}" if safe(row.get('Potassium_mg/kg_min')) and safe(row.get('Potassium_mg/kg_max')) else safe(row.get('Potassium_mg/kg')),
#             },
#             "recommended_crops": safe(row.get("Crop_Recommendations")),
#             "recommended_fertilizers": safe(row.get("Fertilizer_Recommendations"))
#         }

#     # weather (best-effort)
#     API_KEY = os.getenv("OPENWEATHER_API_KEY") or "d9c834bc3e00761992fc6cb1ab2e60bd"
#     weather = {}
#     try:
#         url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
#         w = requests.get(url, timeout=5)
#         if w.status_code == 200:
#             j = w.json()
#             weather = {
#                 "current_temperature": j.get("main", {}).get("temp"),
#                 "current_humidity": j.get("main", {}).get("humidity"),
#                 "weather_description": j.get("weather", [{}])[0].get("description")
#             }
#     except Exception as e:
#         print("WARN: weather fetch failed:", e)
#         weather = {"error": "Weather fetch failed"}

#     # save to DB
#     try:
#         soil_record = SoilAnalysis(
#             user_id=user.id if user else None,
#             predicted_soil=predicted_soil,
#             soil_info=json.dumps(soil_info),
#             weather_info=json.dumps(weather),
#             image_name=timestamped
#         )
#         db.session.add(soil_record)
#         db.session.commit()
#         print("DEBUG /api/soil: saved soil_analysis id:", soil_record.id, "user_id:", soil_record.user_id)
#     except Exception as e:
#         print("DB soil save error:", e)

#     return jsonify({
#         "predicted_soil": predicted_soil,
#         "soil_info": soil_info,
#         "weather": weather,
#         "image_name": timestamped,
#         "received_user_email": user_email,
#         "user_found": user.id if user else None
#     })

# # -----------------------------
# # Plant prediction
# # -----------------------------
# @app.route("/api/plant", methods=["POST"])
# def predict_plant():
#     if plant_model is None:
#         print("WARNING: plant_model not loaded; endpoint will still run with placeholder")

#     user_email = request.form.get("user_email") or request.headers.get("X-User-Email")
#     print("DEBUG /api/plant: received user_email ->", repr(user_email))

#     user = None
#     if user_email:
#         user = User.query.filter_by(email=user_email).first()
#         print("DEBUG /api/plant: user matched ->", getattr(user, "id", None))

#     file = request.files.get("file") or request.files.get("image")
#     if file is None:
#         return jsonify({"error": "No image uploaded"}), 400

#     filename = secure_filename(file.filename) if file.filename else "uploaded"
#     timestamped = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
#     saved_path = os.path.join(UPLOAD_DIR, timestamped)
#     file.save(saved_path)
#     print("Saved plant file to:", saved_path)

#     try:
#         if plant_model is not None:
#             img = preprocess_plant(saved_path)
#             preds = plant_model.predict(img)
#             idx = int(np.argmax(preds))
#             confidence = float(np.max(preds))
#             # label resolution: try loaded class_labels.json, then fallback PLANT_CLASSES
#             label = None
#             if plant_labels:
#                 label = plant_labels.get(str(idx))
#             if not label:
#                 label = PLANT_CLASSES.get(idx)
#             if not label:
#                 label = f"Class_{idx}"
#         else:
#             label = "Unknown"
#             confidence = 0.0
#     except Exception as e:
#         print("ERROR during plant prediction:", e)
#         return jsonify({"error": "prediction failed", "details": str(e)}), 500

#     # find solution: exact first, then fuzzy match
#     solution = None
#     if label in solutions_dict:
#         solution = solutions_dict[label]
#     else:
#         if solutions_keys:
#             matches = get_close_matches(label, solutions_keys, n=1, cutoff=0.6)
#             if matches:
#                 solution = solutions_dict.get(matches[0])

#     if not solution:
#         solution = "No solution available."

#     # save to DB
#     try:
#         plant_record = PlantAnalysis(
#             user_id=user.id if user else None,
#             predicted_label=label,
#             confidence=confidence,
#             image_name=timestamped
#         )
#         db.session.add(plant_record)
#         db.session.commit()
#         print("DEBUG /api/plant: saved plant_analysis id:", plant_record.id, "user_id:", plant_record.user_id)
#     except Exception as e:
#         print("DB plant save error:", e)

#     return jsonify({
#         "prediction": label,
#         "confidence": round(confidence, 4),
#         "image_name": timestamped,
#         "solution": solution,
#         "received_user_email": user_email,
#         "user_found": user.id if user else None
#     })
# # @app.route("/api/plant", methods=["POST"])
# # def analyze_plant():
# #     if "file" not in request.files:
# #         return jsonify({"error": "No file uploaded"}), 400

# #     file = request.files["file"]
# #     if file.filename == "":
# #         return jsonify({"error": "Empty file"}), 400

# #     # Save the uploaded image temporarily
# #     file_path = "temp_leaf.jpg"
# #     file.save(file_path)

# #     # Load image
# #     img = Image.open(file_path).convert("RGB")
# #     img = img.resize((224, 224))
# #     img_array = img_to_array(img) / 255.0
# #     img_array = np.expand_dims(img_array, axis=0)

# #     # Predict
# #     preds = model.predict(img_array)[0]
# #     class_index = int(np.argmax(preds))
# #     confidence = float(preds[class_index])

# #     # Load class labels
# #     with open("class_labels.json", "r") as f:
# #         labels = json.load(f)

# #     predicted_disease = labels.get(str(class_index), "Unknown")

# #     # Load solutions CSV
# #     solution = "No solution available."
# #     try:
# #         df = pd.read_csv("disease_solutions.csv")
# #         row = df[df["disease"].str.strip() == predicted_disease.strip()]
# #         if not row.empty:
# #             solution = row.iloc[0]["solution"]
# #     except Exception as e:
# #         print("Error reading CSV:", e)

# #     # Save history
# #     user_email = request.form.get("user_email", None)
# #     if user_email:
# #         new_record = PlantHistory(
# #             email=user_email,
# #             image=file_path,
# #             disease=predicted_disease,
# #             confidence=confidence,
# #             solution=solution
# #         )
# #         db.session.add(new_record)
# #         db.session.commit()

# #     # Return JSON response to frontend
# #     return jsonify({
# #         "prediction": predicted_disease,
# #         "confidence": confidence,
# #         "solution": solution
# #     })


# # -----------------------------
# # History route
# # -----------------------------
# @app.route("/api/history", methods=["GET"])
# def get_history():
#     email = request.args.get("email")
#     user = User.query.filter_by(email=email).first() if email else None

#     soil_rows = SoilAnalysis.query.filter_by(user_id=user.id).order_by(SoilAnalysis.created_at.desc()).all() if user else []
#     plant_rows = PlantAnalysis.query.filter_by(user_id=user.id).order_by(PlantAnalysis.created_at.desc()).all() if user else []

#     def soil_to_json(r):
#         return {
#             "id": r.id,
#             "predicted_soil": r.predicted_soil,
#             "soil_info": safe_json_load(r.soil_info),
#             "weather_info": safe_json_load(r.weather_info),
#             "image_url": f"/uploads/{r.image_name}" if r.image_name else None,
#             "created_at": r.created_at.isoformat()
#         }

#     def plant_to_json(r):
#         return {
#             "id": r.id,
#             "predicted_label": r.predicted_label,
#             "confidence": r.confidence,
#             "image_url": f"/uploads/{r.image_name}" if r.image_name else None,
#             "created_at": r.created_at.isoformat()
#         }

#     return jsonify({
#         "user": user.to_dict() if user else None,
#         "soil_history": [soil_to_json(r) for r in soil_rows],
#         "plant_history": [plant_to_json(r) for r in plant_rows]
#     })

# # -----------------------------
# # Run
# # -----------------------------
# if __name__ == "__main__":
#     print("Starting Flask app")
#     print("Instance path:", app.instance_path)
#     print("Uploads dir:", UPLOAD_DIR)
#     print("DB path:", DB_PATH)
#     app.run(host="0.0.0.0", port=5000, debug=True)



# app.py
import os
import json
from datetime import datetime
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
except Exception:
    tf = None
    load_model = None
    image = None

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    soil_analyses = db.relationship("SoilAnalysis", backref="user", lazy=True)
    plant_analyses = db.relationship("PlantAnalysis", backref="user", lazy=True)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        user_dict = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "photo": self.photo,
            "created_at": self.created_at.isoformat()
        }
        # Add photo URL if photo exists
        if self.photo:
            user_dict["photo_url"] = f"/uploads/{self.photo}"
        return user_dict

class SoilAnalysis(db.Model):
    __tablename__ = "soil_analysis"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    predicted_soil = db.Column(db.String(200))
    soil_info = db.Column(db.Text)
    weather_info = db.Column(db.Text)
    image_name = db.Column(db.String(400))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PlantAnalysis(db.Model):
    __tablename__ = "plant_analysis"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    predicted_label = db.Column(db.String(200))
    confidence = db.Column(db.Float)
    image_name = db.Column(db.String(400))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()
    print("DB initialized at:", DB_PATH)

# -----------------------------
# Optional models + datasets
# -----------------------------
tf_get_logger = None
soil_model = None
plant_model = None
plant_labels = {}
df = pd.DataFrame()

MODELS_DIR = os.path.join(app.instance_path, "models")
possible_soil = [
    os.path.join(MODELS_DIR, "soil3_vision_model_v1.h5"),
    os.path.join("models", "soil3_vision_model_v1.h5")
]
possible_plant = [
    os.path.join(MODELS_DIR, "plant_disease_prediction_model.h5"),
    os.path.join("models", "plant_disease_prediction_model.h5"),
    os.path.join(MODELS_DIR, "plant_disease_model.h5"),
    os.path.join("models", "plant_disease_model.h5"),
]
possible_labels = os.path.join(MODELS_DIR, "class_labels.json")
possible_dataset_csv = [
    os.path.join(MODELS_DIR, "Cleaned3_Soil_Vision_Dataset.csv"),
    os.path.join("models", "Cleaned3_Soil_Vision_Dataset.csv")
]

if tf is not None:
    tf_get_logger = tf.get_logger()
    tf_get_logger.setLevel('ERROR')

# Try loading soil model (optional)
for p in possible_soil:
    if os.path.exists(p):
        try:
            print("Loading soil model from:", p)
            soil_model = load_model(p)
            break
        except Exception as e:
            print("Could not load soil model from", p, "-", e)

# Try loading plant model (optional)
for p in possible_plant:
    if os.path.exists(p):
        try:
            print("Loading plant model from:", p)
            plant_model = tf.keras.models.load_model(p)
            break
        except Exception as e:
            print("Could not load plant model from", p, "-", e)

# Load class_labels.json if present
if os.path.exists(possible_labels):
    try:
        with open(possible_labels, "r", encoding="utf-8") as f:
            plant_labels = json.load(f)
            print("Loaded class_labels.json with", len(plant_labels), "labels")
    except Exception as e:
        print("Could not load class_labels.json:", e)

# Load soil dataset CSV if present
for p in possible_dataset_csv:
    if os.path.exists(p):
        try:
            df = pd.read_csv(p)
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
            print("Loaded soil dataset from:", p)
        except Exception as e:
            print("Could not read dataset CSV:", e)
        break

# Soil class list & mapping (used when model available)
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
# Disease solutions CSV loader
# -----------------------------
POSSIBLE_SOLUTIONS_CSV = [
    os.path.join(app.instance_path, "models", "disease_solutions.csv"),
    os.path.join(app.instance_path, "disease_solutions.csv"),
    os.path.join("models", "disease_solutions.csv"),
    os.path.join(".", "disease_solutions.csv"),
]

solutions_dict = {}
solutions_keys = []

for p in POSSIBLE_SOLUTIONS_CSV:
    if os.path.exists(p):
        try:
            sol_df = pd.read_csv(p)
            # expect columns 'label' and 'solution'
            if "label" in sol_df.columns and "solution" in sol_df.columns:
                sol_df["label"] = sol_df["label"].astype(str)
                for _, row in sol_df.iterrows():
                    key = row["label"].strip()
                    val = row["solution"] if not pd.isna(row["solution"]) else ""
                    solutions_dict[key] = val
                solutions_keys = list(solutions_dict.keys())
                print("Loaded disease_solutions from:", p, "entries:", len(solutions_keys))
                break
            else:
                print("disease_solutions.csv found but missing expected columns 'label' and 'solution' -", p)
        except Exception as e:
            print("Could not load disease_solutions.csv:", e)

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
# Optional fallback mapping (only if you want a baked-in fallback)
# -----------------------------
PLANT_CLASSES = {
    0: "Apple___Apple_scab",
    1: "Apple___Black_rot",
    2: "Apple___Cedar_apple_rust",
    3: "Apple___healthy",
    4: "Blueberry___healthy",
    5: "Cherry_(including_sour)_Powdery_mildew",
    6: "Cherry_(including_sour)_healthy",
    7: "Corn_(maize)_Cercospora_leaf_spot_Gray_leaf_spot",
    8: "Corn_(maize)Common_rust",
    9: "Corn_(maize)_Northern_Leaf_Blight",
    10: "Corn_(maize)_healthy",
    11: "Grape___Black_rot",
    12: "Grape__Esca(Black_Measles)",
    13: "Grape__Leaf_blight(Isariopsis_Leaf_Spot)",
    14: "Grape___healthy",
    15: "Orange__Haunglongbing(Citrus_greening)",
    16: "Peach___Bacterial_spot",
    17: "Peach___healthy",
    18: "Pepper,bell__Bacterial_spot",
    19: "Pepper,bell__healthy",
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

def find_solution_for_label(label):
    """Find solution for a given plant disease label"""
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
    return jsonify({"message": "Backend is working perfectly!", "instance_uploads": UPLOAD_DIR})

# -----------------------------
# Health check endpoint
# -----------------------------
@app.route("/api/health")
def health_check():
    return jsonify({
        "status": "ok",
        "models_loaded": {
            "soil_model": soil_model is not None,
            "plant_model": plant_model is not None,
            "plant_labels": len(plant_labels) > 0,
            "solutions": len(solutions_dict) > 0 or len(FALLBACK_SOLUTIONS) > 0,
            "soil_dataset": not df.empty
        },
        "accuracy_note": "AI models provide up to 95% accuracy on standard test datasets"
    })

# -----------------------------
# Seasons & crop mapping
# -----------------------------
@app.route("/api/seasons")
def get_seasons():
    return jsonify({"seasons": ["Summer", "Winter", "Rainy"]})

@app.route("/api/crop-by-season", methods=["POST"])
def crop_by_season():
    season = request.json.get("season")
    season_crop_map = {
        "Summer": ["Sugarcane", "Maize", "Bajra", "Groundnut", "Sesame"],
        "Winter": ["Wheat", "Mustard", "Barley", "Peas", "Garlic"],
        "Rainy": ["Rice", "Cotton", "Soybean", "Tur", "Moong"]
    }
    return jsonify({"season": season, "recommended_crops": season_crop_map.get(season, [])})

# -----------------------------
# Auth (signup/login) - UPDATED with photo validation
# -----------------------------
@app.route("/api/signup", methods=["POST"])
def signup():
    name = request.form.get("name") or (request.json and request.json.get("name"))
    email = request.form.get("email") or (request.json and request.json.get("email"))
    password = request.form.get("password") or (request.json and request.json.get("password"))

    if not name or not email or not password:
        return jsonify({"error": "name, email and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    photo_filename = None
    if "photo" in request.files:
        photo = request.files["photo"]
        
        # Validate photo file size (optional - 2MB limit)
        photo.seek(0, 2)  # Seek to end to get file size
        file_size = photo.tell()
        photo.seek(0)  # Reset file pointer
        
        if file_size > 2 * 1024 * 1024:  # 2MB limit
            return jsonify({"error": "Photo size must be less than 2MB"}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if '.' in photo.filename:
            extension = photo.filename.rsplit('.', 1)[1].lower()
            if extension not in allowed_extensions:
                return jsonify({"error": f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"}), 400
        
        safe_name = secure_filename(photo.filename) if photo.filename else "photo"
        photo_filename = f"photo_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{safe_name}"
        photo.save(os.path.join(UPLOAD_DIR, photo_filename))

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        photo=photo_filename
    )
    db.session.add(user)
    db.session.commit()
    print("New user created:", user.email, "id:", user.id)
    
    # Return user data with photo URL
    user_data = user.to_dict()
    return jsonify({"message": "signup successful", "user": user_data}), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email") or request.form.get("email")
    password = data.get("password") or request.form.get("password")
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "invalid credentials"}), 401

    # Return user data with photo URL
    user_data = user.to_dict()
    return jsonify({"message": "login successful", "user": user_data})

# -----------------------------
# Soil prediction - FIXED: Better user email handling
# -----------------------------
@app.route("/api/soil", methods=["POST"])
def predict_soil():
    # allow endpoint even if model missing
    if soil_model is None:
        print("WARNING: soil_model not loaded; endpoint will still run but predictions will be fallback")

    city = request.form.get("city", "Belagavi")
    user_email = request.form.get("user_email")
    
    # Also check headers and JSON
    if not user_email:
        user_email = request.headers.get("X-User-Email")
    
    print("DEBUG /api/soil: received user_email ->", repr(user_email))

    user = None
    if user_email and user_email != "undefined" and user_email != "null":
        user = User.query.filter_by(email=user_email).first()
        print("DEBUG /api/soil: user matched ->", getattr(user, "id", None))

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded", "received_user_email": user_email}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename) if file.filename else "uploaded"
    timestamped = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
    saved_path = os.path.join(UPLOAD_DIR, timestamped)
    file.save(saved_path)
    print("Saved file to:", saved_path)

    predicted_soil = "Unknown"
    try:
        if soil_model is not None and image is not None:
            img = image.load_img(saved_path, target_size=(150, 150))
            img_arr = np.expand_dims(image.img_to_array(img), axis=0) / 255.0
            prediction = soil_model.predict(img_arr)
            idx = int(np.argmax(prediction.squeeze()))
            predicted_soil = soil_classes[idx] if idx < len(soil_classes) else "Unknown"
    except Exception as e:
        print("ERROR during soil prediction:", e)
        predicted_soil = "Unknown"

    mapped = soil_label_map.get(predicted_soil, predicted_soil).lower()
    row = None
    if not df.empty and "Soil_Type" in df.columns:
        try:
            match = get_close_matches(mapped, df['Soil_Type'].str.lower(), n=1)
            row = df[df['Soil_Type'].str.lower() == match[0]].iloc[0] if match else df.iloc[0]
        except Exception as e:
            print("WARN: dataset matching failed:", e)
            row = None

    def safe(v):
        return None if pd.isna(v) else v

    soil_info = {}
    if row is not None:
        soil_info = {
            "soil_type": safe(row.get("Soil_Type")),
            "ph": f"{safe(row.get('pH_Range_min'))}–{safe(row.get('pH_Range_max'))}" if safe(row.get('pH_Range_min')) and safe(row.get('pH_Range_max')) else safe(row.get('pH_Range')),
            "npk": {
                "N": f"{safe(row.get('Nitrogen_mg/kg_min'))}–{safe(row.get('Nitrogen_mg/kg_max'))}" if safe(row.get('Nitrogen_mg/kg_min')) and safe(row.get('Nitrogen_mg/kg_max')) else safe(row.get('Nitrogen_mg/kg')),
                "P": f"{safe(row.get('Phosphorus_mg/kg_min'))}–{safe(row.get('Phosphorus_mg/kg_max'))}" if safe(row.get('Phosphorus_mg/kg_min')) and safe(row.get('Phosphorus_mg/kg_max')) else safe(row.get('Phosphorus_mg/kg')),
                "K": f"{safe(row.get('Potassium_mg/kg_min'))}–{safe(row.get('Potassium_mg/kg_max'))}" if safe(row.get('Potassium_mg/kg_min')) and safe(row.get('Potassium_mg/kg_max')) else safe(row.get('Potassium_mg/kg')),
            },
            "recommended_crops": safe(row.get("Crop_Recommendations")),
            "recommended_fertilizers": safe(row.get("Fertilizer_Recommendations"))
        }

    # weather (best-effort)
    API_KEY = os.getenv("OPENWEATHER_API_KEY") or "d9c834bc3e00761992fc6cb1ab2e60bd"
    weather = {}
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
        w = requests.get(url, timeout=5)
        if w.status_code == 200:
            j = w.json()
            weather = {
                "current_temperature": j.get("main", {}).get("temp"),
                "current_humidity": j.get("main", {}).get("humidity"),
                "weather_description": j.get("weather", [{}])[0].get("description")
            }
    except Exception as e:
        print("WARN: weather fetch failed:", e)
        weather = {"error": "Weather fetch failed"}

    # save to DB
    try:
        soil_record = SoilAnalysis(
            user_id=user.id if user else None,
            predicted_soil=predicted_soil,
            soil_info=json.dumps(soil_info),
            weather_info=json.dumps(weather),
            image_name=timestamped
        )
        db.session.add(soil_record)
        db.session.commit()
        print("DEBUG /api/soil: saved soil_analysis id:", soil_record.id, "user_id:", soil_record.user_id)
    except Exception as e:
        print("DB soil save error:", e)

    return jsonify({
        "predicted_soil": predicted_soil,
        "soil_info": soil_info,
        "weather": weather,
        "image_name": timestamped,
        "image_url": f"/uploads/{timestamped}",
        "received_user_email": user_email,
        "user_found": user.id if user else None
    })

# -----------------------------
# Plant prediction - FIXED: Better user email handling
# -----------------------------
@app.route("/api/plant", methods=["POST"])
def predict_plant():
    if plant_model is None:
        print("WARNING: plant_model not loaded; using fallback prediction")
        return jsonify({
            "error": "AI model not loaded",
            "prediction": "Model not available",
            "confidence": 0.0,
            "solution": "Please try again later or contact support.",
            "image_url": ""
        }), 503

    user_email = request.form.get("user_email")
    
    # Also check headers and JSON
    if not user_email:
        user_email = request.headers.get("X-User-Email")
    
    print("DEBUG /api/plant: received user_email ->", repr(user_email))

    user = None
    if user_email and user_email != "undefined" and user_email != "null":
        user = User.query.filter_by(email=user_email).first()
        print("DEBUG /api/plant: user matched ->", getattr(user, "id", None))

    file = request.files.get("file") or request.files.get("image")
    if file is None:
        return jsonify({"error": "No image uploaded"}), 400

    filename = secure_filename(file.filename) if file.filename else "uploaded"
    timestamped = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
    saved_path = os.path.join(UPLOAD_DIR, timestamped)
    file.save(saved_path)
    print("Saved plant file to:", saved_path)

    try:
        img = preprocess_plant(saved_path)
        preds = plant_model.predict(img)
        idx = int(np.argmax(preds))
        confidence = float(np.max(preds))
        
        # label resolution: try loaded class_labels.json, then fallback PLANT_CLASSES
        label = None
        if plant_labels:
            label = plant_labels.get(str(idx))
        if not label:
            label = PLANT_CLASSES.get(idx)
        if not label:
            label = f"Class_{idx}"
            
    except Exception as e:
        print("ERROR during plant prediction:", e)
        return jsonify({"error": "prediction failed", "details": str(e)}), 500

    # find solution using improved matching
    solution = find_solution_for_label(label)

    # save to DB
    try:
        plant_record = PlantAnalysis(
            user_id=user.id if user else None,
            predicted_label=label,
            confidence=confidence,
            image_name=timestamped
        )
        db.session.add(plant_record)
        db.session.commit()
        print("DEBUG /api/plant: saved plant_analysis id:", plant_record.id, "user_id:", plant_record.user_id)
    except Exception as e:
        print("DB plant save error:", e)

    return jsonify({
        "prediction": label,
        "confidence": round(confidence, 4),
        "image_name": timestamped,
        "image_url": f"/uploads/{timestamped}",
        "solution": solution,
        "received_user_email": user_email,
        "user_found": user.id if user else None
    })

# -----------------------------
# History route - FIXED: Handle guest users better
# -----------------------------
@app.route("/api/history", methods=["GET"])
def get_history():
    email = request.args.get("email")
    
    # If no email provided, return empty history
    if not email or email == "undefined" or email == "null":
        return jsonify({
            "user": None,
            "soil_history": [],
            "plant_history": []
        })
    
    user = User.query.filter_by(email=email).first()
    
    # If user not found, return empty history
    if not user:
        return jsonify({
            "user": None,
            "soil_history": [],
            "plant_history": []
        })

    soil_rows = SoilAnalysis.query.filter_by(user_id=user.id).order_by(SoilAnalysis.created_at.desc()).all()
    plant_rows = PlantAnalysis.query.filter_by(user_id=user.id).order_by(PlantAnalysis.created_at.desc()).all()

    def soil_to_json(r):
        return {
            "id": r.id,
            "predicted_soil": r.predicted_soil,
            "soil_info": safe_json_load(r.soil_info),
            "weather_info": safe_json_load(r.weather_info),
            "image_url": f"/uploads/{r.image_name}" if r.image_name else None,
            "created_at": r.created_at.isoformat()
        }

    def plant_to_json(r):
        return {
            "id": r.id,
            "predicted_label": r.predicted_label,
            "confidence": r.confidence,
            "image_url": f"/uploads/{r.image_name}" if r.image_name else None,
            "created_at": r.created_at.isoformat()
        }

    return jsonify({
        "user": user.to_dict(),
        "soil_history": [soil_to_json(r) for r in soil_rows],
        "plant_history": [plant_to_json(r) for r in plant_rows]
    })

# -----------------------------
# User profile update
# -----------------------------
@app.route("/api/user/update", methods=["PUT"])
def update_user_profile():
    data = request.get_json() or {}
    email = data.get("email")
    name = data.get("name")
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    if name:
        user.name = name
    
    db.session.commit()
    
    return jsonify({
        "message": "Profile updated successfully",
        "user": user.to_dict()
    })

# -----------------------------
# Get user by email - FIXED: Handle null/undefined
# -----------------------------
@app.route("/api/user/<email>", methods=["GET"])
def get_user_by_email(email):
    if email == "undefined" or email == "null":
        return jsonify({"error": "Invalid email"}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({"user": user.to_dict()})

# -----------------------------
# Delete user account
# -----------------------------
@app.route("/api/user/delete", methods=["DELETE"])
def delete_user_account():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Delete user's analyses
    SoilAnalysis.query.filter_by(user_id=user.id).delete()
    PlantAnalysis.query.filter_by(user_id=user.id).delete()
    
    # Delete user
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({"message": "Account deleted successfully"})

# -----------------------------
# Get all users (for admin/testing)
# -----------------------------
@app.route("/api/users", methods=["GET"])
def get_all_users():
    users = User.query.all()
    return jsonify({
        "users": [user.to_dict() for user in users],
        "count": len(users)
    })

# -----------------------------
# Test endpoint for frontend debugging
# -----------------------------
@app.route("/api/test-auth", methods=["POST"])
def test_auth():
    data = request.get_json() or {}
    user_email = data.get("user_email")
    
    return jsonify({
        "received_user_email": user_email,
        "is_valid": user_email and user_email != "undefined" and user_email != "null",
        "message": "Test endpoint working"
    })

# -----------------------------
# Run
# -----------------------------
if __name__ == "__main__":
    print("Starting Flask app")
    print("Instance path:", app.instance_path)
    print("Uploads dir:", UPLOAD_DIR)
    print("DB path:", DB_PATH)
    app.run(host="0.0.0.0", port=5000, debug=True)