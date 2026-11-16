
from db import get_connection

conn = get_connection()
try:
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE ST_ALEX.USERS ALTER COLUMN PASSWORD NVARCHAR(255) NOT NULL")
    conn.commit()
    print("OK - PASSWORD column widened to NVARCHAR(255).")
finally:
    conn.close()