from pathlib import Path
import sys
import os
import json
import csv

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.models import user, assignment, schedule, mood, peer_group, chat, intervention, user_settings


def main():
    out_dir = Path(__file__).resolve().parents[1] / "exports"
    os.makedirs(out_dir, exist_ok=True)

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
            cols = [c.name for c in model.__table__.columns]
            rows = db.query(model).all()
            path = out_dir / f"{name}.csv"
            with path.open("w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(cols)
                for r in rows:
                    w.writerow([str(getattr(r, c)) if getattr(r, c) is not None else "" for c in cols])
            summary[name] = {"count": len(rows), "file": str(path)}

        print(json.dumps(summary))
    finally:
        db.close()


if __name__ == "__main__":
    main()