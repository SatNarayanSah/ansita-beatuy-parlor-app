"""Set a new password for an account from the server shell (e.g. a forgotten admin password).

    python -m app.set_password admin@example.com

Asks for the new password twice (not shown on screen). Signs the account out everywhere.
"""

import getpass
import sys

from sqlalchemy import select

from .db import SessionLocal, init_db
from .models import User
from .security import hash_password


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m app.set_password <email>")
    email = sys.argv[1].strip().lower()
    init_db()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            raise SystemExit(f"No account with the email {email}.")
        password = getpass.getpass("New password (8+ characters): ")
        if len(password) < 8:
            raise SystemExit("Use at least 8 characters.")
        if getpass.getpass("Repeat it: ") != password:
            raise SystemExit("The passwords don't match.")
        user.password_hash = hash_password(password)
        user.token_version += 1  # every existing login stops working
        db.commit()
    print(f"Password updated for {email} ({user.role}). Sign in again on every device.")


if __name__ == "__main__":
    main()
