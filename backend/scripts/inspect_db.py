from pathlib import Path
import sys
import json

# Ensure backend package is importable when running as a script
sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy import inspect
from app.db.session import SessionLocal
from app.models import user, assignment, schedule, mood, peer_group, chat, intervention, user_settings


def serialize_row(obj):
    insp = inspect(obj)
    return {c.key: getattr(obj, c.key) for c in insp.mapper.column_attrs}


def main():
    db = SessionLocal()
    try:
        tables = {
            "users": user.User,
            "courses": assignment.Course,
            "assignments": assignment.Assignment,
            "subtasks": assignment.Subtask,
            "schedule_blocks": schedule.ScheduleBlock,
            "mood_checkins": mood.MoodCheckin,
            "peer_groups": peer_group.PeerGroup,
            "group_members": peer_group.GroupMember,
            "group_messages": peer_group.GroupMessage,
            "interventions": intervention.Intervention,
            "intervention_sessions": intervention.InterventionSession,
            "chat_sessions": chat.ChatSession,
            "user_settings": user_settings.UserSettings,
        }

        summary = {}
        for name, model in tables.items():
            q = db.query(model)
            count = q.count()
            rows = [serialize_row(r) for r in q.limit(5).all()]
            summary[name] = {"count": count, "sample": rows}

        print(json.dumps(summary, default=str))
    finally:
        db.close()


if __name__ == "__main__":
    main()