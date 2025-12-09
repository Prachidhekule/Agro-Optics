from werkzeug.security import generate_password_hash
import sqlite3
import os

db_path = 'agro_optics.db'
print("Database exists:", os.path.exists(db_path))

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create user
password_hash = generate_password_hash('test123')
cursor.execute("INSERT OR IGNORE INTO user (name, email, password_hash) VALUES (?, ?, ?)",
              ('Test User', 'test@test.com', password_hash))
conn.commit()

# List users
cursor.execute('SELECT * FROM user')
for row in cursor.fetchall():
    print(row)

conn.close()
exit()