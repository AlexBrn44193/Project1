
from werkzeug.security import generate_password_hash
from db import get_connection

username = input("Username: ").strip()
new_password = input("New password: ").strip()

if not username or not new_password:
    print("Username and password cannot be empty.")
    raise SystemExit(1)

hashed = generate_password_hash(new_password)

conn = get_connection()
try:
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE ST_ALEX.USERS SET PASSWORD = ? WHERE LOWER(FIRST_NAME) = LOWER(?)",
        hashed, username
    )
    if cursor.rowcount == 0:
        print(f"No user found with username '{username}'.")
    else:
        conn.commit()
        print(f"OK - password for '{username}' has been reset.")
finally:
    conn.close()