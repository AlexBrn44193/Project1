
from werkzeug.security import generate_password_hash
from db import get_connection

conn = get_connection()
try:
    cursor = conn.cursor()
    cursor.execute("SELECT ID, PASSWORD FROM ST_ALEX.USERS")
    rows = cursor.fetchall()

    updated = 0
    skipped = 0
    for id_, password in rows:
        if not password:
            continue
        if password.startswith("pbkdf2:") or password.startswith("scrypt:"):
            skipped += 1
            continue
        hashed = generate_password_hash(password)
        cursor.execute("UPDATE ST_ALEX.USERS SET PASSWORD = ? WHERE ID = ?", hashed, id_)
        updated += 1

    conn.commit()
    print(f"OK - {updated} parole au fost hash-uite, {skipped} erau deja hash-uite.")
finally:
    conn.close()