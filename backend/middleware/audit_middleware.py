"""
FastAPI middleware that writes one audit_logs row per /api request:
timestamp, user, action, endpoint, status and duration.

The DB insert runs on a small thread pool so logging never adds database
latency to the response.
"""

import time
from concurrent.futures import ThreadPoolExecutor

from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware

from middleware.auth_middleware import decode_token
from models.audit import write_audit_log

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="audit")

# First path segment after /api -> audit event type (matches AdminAuditLogs filters)
EVENT_TYPES = {
    "auth": "auth",
    "admin": "system",
    "forecast": "ml",
    "basket": "ml",
    "dual-pipeline": "ml",
    "pricing": "ml",
    "whatif": "ml",
    "anomalies": "ml",
}


def classify(method: str, path: str):
    parts = [p for p in path.split("/") if p]
    section = parts[1] if len(parts) > 1 else "root"
    action = f"{section}.{parts[2]}" if len(parts) > 2 else section
    if section == "auth":
        return "auth", action
    if method in ("POST", "PUT", "PATCH", "DELETE"):
        return "crud", action
    if section == "dashboard" and "ml-metrics" in path:
        return "ml", action
    if "export" in path or "download" in path:
        return "data", action
    return EVENT_TYPES.get(section, "view"), action


# Login/register carry no token yet; routes/auth.py logs them with the email.
SELF_LOGGED_PATHS = {"/api/auth/login", "/api/auth/register"}


def submit_audit_log(entry: dict):
    _executor.submit(write_audit_log, entry)


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path
        if (not path.startswith("/api") or request.method == "OPTIONS"
                or path in SELF_LOGGED_PATHS):
            return await call_next(request)

        started = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            user = {}
            auth_header = request.headers.get("authorization", "")
            if auth_header.lower().startswith("bearer "):
                try:
                    user = decode_token(auth_header[7:])
                except JWTError:
                    user = {}
            event_type, action = classify(request.method, path)
            entry = {
                "user_id": user.get("user_id"),
                "user_email": user.get("email") or "anonymous",
                "user_role": user.get("role"),
                "action": action,
                "event_type": event_type,
                "method": request.method,
                "endpoint": path,
                "status_code": status_code,
                "result": "success" if status_code < 400 else "failure",
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                "ip_address": request.client.host if request.client else None,
                "details": str(request.url.query) or None,
            }
            submit_audit_log(entry)
