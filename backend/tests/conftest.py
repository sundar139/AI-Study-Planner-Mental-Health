import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import warnings

from app.main import app
from app.db.base import Base
from app import models  # ensure models are imported so tables are registered
from app.api import deps

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db() -> Generator:
    Base.metadata.create_all(bind=engine)
    yield TestingSessionLocal()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db) -> Generator:
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db) -> dict:
    # Create a user and return token headers
    # This assumes you have a way to create a user or mock auth
    # For simplicity, we might need to mock the get_current_active_user dependency
    # or actually create a user via API if available.
    # Let's try to mock the dependency for now to avoid auth complexity in unit tests
    return {"Authorization": "Bearer test_token"}

# Mock auth dependency
from app.models.user import User
def override_get_current_active_user():
    return User(id=1, email="test@example.com", is_active=True)

app.dependency_overrides[deps.get_current_active_user] = override_get_current_active_user

# Override DB dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[deps.get_db] = override_get_db
# Suppress noisy library warnings to keep test output clean
os.environ.setdefault("SQLALCHEMY_SILENCE_UBER_WARNING", "1")
warnings.filterwarnings("ignore", module="pydantic._internal_config")
warnings.filterwarnings("ignore", message=".*Pydantic.*", category=UserWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning, module="pydantic._internal_config")
