from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import engine
from app.models import user, user_settings, assignment, schedule, mood, peer_group, chat, intervention
from app.db.base import Base

def reset():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    reset()