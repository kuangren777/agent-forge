"""Password hashing + session tokens (stdlib PBKDF2 — no native deps)."""
import hashlib
import hmac
import secrets

_ITER = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITER)
    return f"pbkdf2${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt, digest = stored.split("$")
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITER)
    return hmac.compare_digest(dk.hex(), digest)


def new_token() -> str:
    return secrets.token_urlsafe(32)
