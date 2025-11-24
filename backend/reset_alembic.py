import sys
import os
from sqlalchemy import create_engine, text
from app.core.config import settings

def reset_alembic():
    print(f"Connecting to {settings.SQLALCHEMY_DATABASE_URI}")
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    with engine.begin() as connection:
        try:
            connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
            print("Dropped alembic_version table.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    reset_alembic()
