from app.db.session import engine
from app.db.base import Base
from app.models import user, assignment, mood, intervention, chat, user_settings, schedule, activity

# Create all tables
Base.metadata.create_all(bind=engine)
print("✅ Database tables created successfully!")
