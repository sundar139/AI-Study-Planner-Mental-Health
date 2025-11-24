import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SERVER = os.getenv("POSTGRES_SERVER")
USER = os.getenv("POSTGRES_USER")
PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB = os.getenv("POSTGRES_DB")
PORT = os.getenv("POSTGRES_PORT", "5432")

print(f"Attempting to connect to:")
print(f"Server: {SERVER}")
print(f"User: {USER}")
print(f"Database: {DB}")
print(f"Port: {PORT}")
print("-" * 20)

try:
    conn = psycopg2.connect(
        host=SERVER,
        user=USER,
        password=PASSWORD,
        dbname=DB,
        port=PORT,
        connect_timeout=5
    )
    print("✅ SUCCESS! Connection established.")
    conn.close()
except Exception as e:
    print("❌ FAILED! Could not connect.")
    print(f"Error: {e}")
