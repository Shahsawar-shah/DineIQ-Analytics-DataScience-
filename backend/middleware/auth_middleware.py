"""
JWT verification and role-based access control (RBAC).

Routers attach one of the dependencies below so every analytics endpoint
checks both the token and the caller's role.
"""

from datetime import datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from settings import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY

SUPER_ADMIN = "Super Admin"
ADMIN = "Admin"
RESTAURANT_MANAGER = "Restaurant Manager"
INVENTORY_MANAGER = "Inventory Manager"
CASHIER = "Cashier"
CUSTOMER = "Customer"
ANALYST = "analyst"  # legacy default role from early registrations

ALL_ROLES = [SUPER_ADMIN, ADMIN, RESTAURANT_MANAGER, INVENTORY_MANAGER, CASHIER, CUSTOMER, ANALYST]

# Who may call what
ADMIN_ROLES = {SUPER_ADMIN, ADMIN}
ANALYTICS_ROLES = ADMIN_ROLES | {RESTAURANT_MANAGER, INVENTORY_MANAGER, ANALYST}
OPERATIONS_ROLES = ANALYTICS_ROLES | {CASHIER}  # orders + menu only for Cashier

# Only a Super Admin may hand out the two admin roles
PRIVILEGED_ROLES = {SUPER_ADMIN, ADMIN}

security = HTTPBearer()


def create_token(data: dict):
    payload = dict(data)
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_roles(allowed_roles):
    allowed = set(allowed_roles)

    def checker(payload: dict = Depends(verify_token)):
        if payload.get("role") not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{payload.get('role')}' is not allowed to access this resource")
        return payload

    return checker


require_admin = require_roles(ADMIN_ROLES)
require_analytics = require_roles(ANALYTICS_ROLES)
require_operations = require_roles(OPERATIONS_ROLES)
