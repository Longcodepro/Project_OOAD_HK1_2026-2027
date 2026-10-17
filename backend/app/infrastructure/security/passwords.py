from argon2 import PasswordHasher as _Argon2
from argon2.exceptions import InvalidHashError, VerificationError


class Argon2Hasher:
    def __init__(self):
        self._h = _Argon2()

    def hash(self, plain: str) -> str:
        return self._h.hash(plain)

    def verify(self, plain: str, hashed: str) -> bool:
        try:
            return self._h.verify(hashed, plain)
        except (VerificationError, InvalidHashError):
            return False
