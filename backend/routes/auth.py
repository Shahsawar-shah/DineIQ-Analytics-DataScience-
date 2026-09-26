from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import psycopg2
import bcrypt
import os
from jose import jwt, JWTError
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent.parent / "config" / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "dineiq-secret-key-2024")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

router = APIRouter()
security = HTTPBearer()


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "analyst"


class LoginRequest(BaseModel):
    email: str
    password: str


def get_db():
    return psycopg2.connect(DATABASE_URL)


def create_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/register")
def register(req: RegisterRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        # The very first account on the system becomes Admin automatically.
        # After that, self-registration cannot grant Admin — every other
        # requested role (Customer / Restaurant Manager / Inventory Manager)
        # is honored as-is.
        cur.execute("SELECT COUNT(*) FROM users")
        count = cur.fetchone()[0]
        if count == 0:
            actual_role = "Admin"
        elif req.role == "Admin":
            raise HTTPException(
                status_code=403,
                detail="Admin registration is closed — ask an existing admin to create your account")
        else:
            actual_role = req.role

        password_hash = bcrypt.hashpw(
            req.password.encode(), bcrypt.gensalt()).decode()
        cur.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id",
            (req.name, req.email, password_hash, actual_role)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        token = create_token({
            "user_id": user_id,
            "email": req.email,
            "name": req.name,
            "role": actual_role
        })
        return {
            "token": token,
            "user": {"id": user_id, "name": req.name,
                     "email": req.email, "role": actual_role}
        }
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        cur.close()
        conn.close()


@router.post("/login")
def login(req: LoginRequest):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, name, email, password_hash, role FROM users WHERE email=%s AND is_active=TRUE",
            (req.email,)
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not bcrypt.checkpw(req.password.encode(), user[3].encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_token({
            "user_id": user[0],
            "email": user[2],
            "name": user[1],
            "role": user[4]
        })
        return {
            "token": token,
            "user": {"id": user[0], "name": user[1],
                     "email": user[2], "role": user[4]}
        }
    finally:
        cur.close()
        conn.close()


@router.get("/me")
def get_me(payload: dict = Depends(verify_token)):
    return {
        "user_id": payload.get("user_id"),
        "name": payload.get("name"),
        "email": payload.get("email"),
        "role": payload.get("role")
    }
