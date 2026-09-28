from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import bcrypt
import psycopg2

from database import get_connection
from middleware.audit_middleware import submit_audit_log
from middleware.auth_middleware import (
    ALL_ROLES, PRIVILEGED_ROLES, SUPER_ADMIN, ADMIN, CUSTOMER,
    create_token, require_admin, verify_token,
)

router = APIRouter()

# Roles anyone can pick on the public Register page. Admin, Super Admin and
# Cashier accounts are created by an administrator from the Users page.
SELF_REGISTER_ROLES = {CUSTOMER, "Restaurant Manager", "Inventory Manager", "analyst"}


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "analyst"


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateUserRequest(BaseModel):
    name: str
    role: str
    is_active: bool


def _audit_auth(request: Request, action: str, email: str, status_code: int, user=None):
    submit_audit_log({
        "user_id": user.get("id") if user else None,
        "user_email": email,
        "user_role": user.get("role") if user else None,
        "action": action,
        "event_type": "auth",
        "method": request.method,
        "endpoint": request.url.path,
        "status_code": status_code,
        "result": "success" if status_code < 400 else "failure",
        "ip_address": request.client.host if request.client else None,
    })


def _check_role_assignment(requested_role: str, caller_role: str):
    if requested_role not in ALL_ROLES:
        raise HTTPException(status_code=400, detail=f"Unknown role '{requested_role}'")
    if requested_role in PRIVILEGED_ROLES and caller_role != SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only a Super Admin can assign the Admin or Super Admin role")


def _insert_user(name, email, password, role):
    conn = get_connection()
    cur = conn.cursor()
    try:
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        cur.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, email, password_hash, role)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        return user_id
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        cur.close()
        conn.close()


@router.post("/register")
def register(req: RegisterRequest, request: Request):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM users")
        count = cur.fetchone()[0]
    finally:
        cur.close()
        conn.close()

    # The very first account on an empty system becomes Super Admin.
    if count == 0:
        actual_role = SUPER_ADMIN
    elif req.role not in SELF_REGISTER_ROLES:
        _audit_auth(request, "auth.register", req.email, 403)
        raise HTTPException(
            status_code=403,
            detail=f"'{req.role}' accounts are created by an administrator. Ask an admin to create your account.")
    else:
        actual_role = req.role

    user_id = _insert_user(req.name, req.email, req.password, actual_role)
    user = {"id": user_id, "name": req.name, "email": req.email, "role": actual_role}
    _audit_auth(request, "auth.register", req.email, 200, user)
    token = create_token({
        "user_id": user_id, "email": req.email, "name": req.name, "role": actual_role
    })
    return {"token": token, "user": user}


@router.post("/login")
def login(req: LoginRequest, request: Request):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, name, email, password_hash, role FROM users WHERE email=%s AND is_active=TRUE",
            (req.email,)
        )
        row = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not row or not bcrypt.checkpw(req.password.encode(), row[3].encode()):
        _audit_auth(request, "auth.login", req.email, 401)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = {"id": row[0], "name": row[1], "email": row[2], "role": row[4]}
    _audit_auth(request, "auth.login", req.email, 200, user)
    token = create_token({
        "user_id": row[0], "email": row[2], "name": row[1], "role": row[4]
    })
    return {"token": token, "user": user}


@router.get("/me")
def get_me(payload: dict = Depends(verify_token)):
    return {
        "user_id": payload.get("user_id"),
        "name": payload.get("name"),
        "email": payload.get("email"),
        "role": payload.get("role")
    }


@router.get("/roles")
def list_roles(payload: dict = Depends(require_admin)):
    return ALL_ROLES


@router.get("/users")
def list_users(payload: dict = Depends(require_admin)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id")
        rows = cur.fetchall()
        return [
            {
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "role": r[3],
                "is_active": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
            }
            for r in rows
        ]
    finally:
        cur.close()
        conn.close()


@router.post("/users")
def create_user(req: RegisterRequest, payload: dict = Depends(require_admin)):
    _check_role_assignment(req.role, payload.get("role"))
    user_id = _insert_user(req.name, req.email, req.password, req.role)
    return {"user": {"id": user_id, "name": req.name, "email": req.email, "role": req.role}}


@router.put("/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest, payload: dict = Depends(require_admin)):
    _check_role_assignment(req.role, payload.get("role"))
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT role FROM users WHERE id=%s", (user_id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        if existing[0] in PRIVILEGED_ROLES and payload.get("role") != SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Only a Super Admin can modify admin accounts")
        cur.execute(
            "UPDATE users SET name=%s, role=%s, is_active=%s WHERE id=%s",
            (req.name, req.role, req.is_active, user_id)
        )
        conn.commit()
        return {"message": "User updated successfully"}
    finally:
        cur.close()
        conn.close()


@router.delete("/users/{user_id}")
def deactivate_user(user_id: int, payload: dict = Depends(require_admin)):
    if user_id == payload.get("user_id"):
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT role FROM users WHERE id=%s", (user_id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        if existing[0] in PRIVILEGED_ROLES and payload.get("role") != SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Only a Super Admin can deactivate admin accounts")
        cur.execute("UPDATE users SET is_active=FALSE WHERE id=%s", (user_id,))
        conn.commit()
        return {"message": "User deactivated successfully"}
    finally:
        cur.close()
        conn.close()
