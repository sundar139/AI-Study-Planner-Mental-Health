from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()

# Check if demo user exists
existing = db.query(User).filter(User.email == 'demo@example.com').first()

if not existing:
    user = User(
        email='demo@example.com',
        hashed_password=get_password_hash('demo123'),
        full_name='Demo User',
        is_active=True
    )
    db.add(user)
    db.commit()
    print('✅ Demo user created!')
    print('   Email: demo@example.com')
    print('   Password: demo123')
else:
    print('✅ Demo user already exists')
    print('   Email: demo@example.com')
    print('   Password: demo123')

db.close()
