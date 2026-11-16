import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import pyodbc


def get_connection():
   
    try:
        server = os.environ["DB_SERVER"]
        database = os.environ["DB_NAME"]
        uid = os.environ["DB_USER"]
        pwd = os.environ["DB_PASSWORD"]
    except KeyError as e:
        raise RuntimeError(
            f"The environment variable {e} is missing. Check the .env file or the environment settings."
        ) from e

    return pyodbc.connect(
        'DRIVER={ODBC Driver 17 for SQL Server};'
        f'SERVER={server},1433;'
        f'DATABASE={database};'
        f'UID={uid};'
        f'PWD={pwd};'
        'Encrypt=yes;'
        'TrustServerCertificate=yes;'
        'Connection Timeout=30;'
    )