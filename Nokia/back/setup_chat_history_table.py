import pyodbc

conn = pyodbc.connect(
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=synopsis-sql-server.database.windows.net,1433;'
    'DATABASE=DEVELOPMENT;'
    'UID=practica_user;'
    'PWD=Pr@ctikUsr2026!;'
    'Encrypt=yes;'
    'TrustServerCertificate=yes;'
    'Connection Timeout=30;'
)
conn.autocommit = True
cursor = conn.cursor()

print("I create table ST_ALEX.CHAT_HISTORY..")
cursor.execute("""
    CREATE TABLE ST_ALEX.CHAT_HISTORY (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        QUESTION NVARCHAR(1000) NOT NULL,
        ANSWER NVARCHAR(MAX) NOT NULL,
        INTENT VARCHAR(20) NULL,
        RESULT_COUNT INT NULL,
        CREATED_AT DATETIME DEFAULT GETDATE()
    );
""")
print("OK-the table was created successfully.")

conn.close()