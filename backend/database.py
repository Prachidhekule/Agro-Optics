import sqlite3

DB_PATH = "agro_optics.db"

def create_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # -------------------------
    # USERS TABLE
    # -------------------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # -------------------------
    # HISTORY TABLE
    # -------------------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """)

    # -------------------------
    # SOIL REPORTS
    # -------------------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS soil_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        image_path TEXT,
        nitrogen TEXT,
        phosphorus TEXT,
        potassium TEXT,
        moisture TEXT,
        ph_value TEXT,
        recommendation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """)

    # -------------------------
    # LEAF REPORTS
    # -------------------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS leaf_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        image_path TEXT,
        disease_name TEXT,
        confidence TEXT,
        solution TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    """)

    # -------------------------
    # SEASONS TABLE
    # -------------------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_name TEXT UNIQUE NOT NULL
    );
    """)

    # Insert default seasons if not exists
    c.execute("SELECT COUNT(*) FROM seasons;")
    count = c.fetchone()[0]
    if count == 0:
        seasons_list = [("Summer",), ("Winter",), ("Rainy",)]
        c.executemany("INSERT INTO seasons (season_name) VALUES (?);", seasons_list)

    # -------------------------
    # PREDICTIONS TABLE
    # -------------------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        image_name TEXT,
        result TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    """)

    conn.commit()
    conn.close()
    print("✅ All tables created successfully!")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

if __name__ == "__main__":
    create_db()