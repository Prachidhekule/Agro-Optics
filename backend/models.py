# model.py
from database import get_connection

def create_predictions_table():
    """Creates the predictions table if it doesn't exist."""
    conn = None
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                image_name TEXT,
                result TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        conn.commit()
        print("✅ Predictions table created successfully!")
    except Exception as e:
        print("❌ Error creating predictions table:", e)
    finally:
        if conn:
            conn.close()

def save_prediction(user_id, image_name, result):
    """
    Saves a prediction record to the predictions table.
    :param user_id: ID of the user who made the prediction
    :param image_name: Name of the uploaded image
    :param result: Predicted result (soil type or disease)
    """
    conn = None
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute(
            "INSERT INTO predictions (user_id, image_name, result) VALUES (?, ?, ?)",
            (user_id, image_name, result)
        )
        conn.commit()
        print(f"✅ Prediction saved for user_id={user_id}")
    except Exception as e:
        print("❌ Error saving prediction:", e)
    finally:
        if conn:
            conn.close()

def get_predictions_by_user(user_id):
    """
    Fetches all predictions made by a specific user.
    :param user_id: ID of the user
    :return: List of prediction dicts
    """
    conn = None
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM predictions WHERE user_id=? ORDER BY date DESC", (user_id,))
        rows = c.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        print("❌ Error fetching predictions:", e)
        return []
    finally:
        if conn:
            conn.close()

# --------------------------
# Auto-create predictions table on module load
# --------------------------
create_predictions_table()