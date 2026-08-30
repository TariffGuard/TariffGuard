---
kind: error_handling
name: FastAPI Global Exception Handlers with HTTPException and Frontend Error Mapping
category: error_handling
scope:
    - '**'
source_files:
    - backend/main.py
    - backend/app/core/error_handlers.py
    - backend/app/api/auth.py
    - frontend/lib/api.ts
---

## Overview

The TariffGuard backend uses FastAPI's built-in exception handling system to centralize error responses, while the Next.js frontend maps HTTP status codes into user-facing errors. There is no custom domain-specific error type hierarchy; errors are expressed via FastAPI `HTTPException` instances and caught by global handlers registered in `main.py`.

## Backend: Centralized Exception Handlers

**Registration point:** `backend/main.py` registers three global exception handlers on the FastAPI app:
- `RequestValidationError` → `validation_error_handler`
- `SQLAlchemyError` → `sqlalchemy_error_handler`
- `Exception` (catch-all) → `generic_error_handler`

**Handler implementation:** `backend/app/core/error_handlers.py` defines each handler as a function that returns a `JSONResponse` with a uniform shape:
```json
{
  "status": "error",
  "message": "...",
  "detail": "..." // only when DEBUG=true
}
```

Key behaviors:
- Validation errors return **422** with Pydantic validation details (`exc.errors()`).
- Database errors return **500** with a generic message; raw exception text is included only when the `DEBUG` environment variable is set to `true`.
- The catch-all `Exception` handler also returns **500** and similarly gates stack-trace-level detail behind `DEBUG`.

This pattern ensures unhandled exceptions never leak internal details to clients in production.

## Business Logic Errors: HTTPException Usage

Business-layer errors are raised directly in route handlers using FastAPI's `HTTPException`, most notably in `backend/app/api/auth.py`:
- `400` for duplicate registration (`Username or email already exists`).
- `401` for invalid credentials, missing/invalid/expired tokens, and unknown users.
- `403` for insufficient role permissions (`Requires {role} role`).

These are thrown from both endpoint functions and reusable dependencies (`get_current_user`, `require_role`), so authorization failures propagate uniformly through the same global handler pipeline.

No other API modules were found raising explicit `HTTPException`s in the scanned scope; they rely on the global handlers for unexpected failures.

## Frontend Error Handling

The centralized API client in `frontend/lib/api.ts` wraps every request and converts non-OK responses into thrown `Error` objects:
- **403** → `"You don't have permission to perform this action."`
- **401** → `"Please login again."`
- Other statuses → attempts to parse JSON body and extract `detail`; falls back to `API Error: <statusText>` if parsing fails.

All current exported API methods (`getMachines`, `getOrders`, etc.) currently resolve mock data rather than calling the backend, but the error-mapping path is in place for when real endpoints are wired up.

## Conventions Observed

1. **Centralized over local try/catch**: Unhandled exceptions are funneled through the three global handlers in `main.py`; business errors are signaled by raising `HTTPException` rather than returning error response dicts.
2. **Uniform error envelope**: All server-side error responses use `{ status: "error", message, detail? }`, making client-side parsing predictable.
3. **Debug-gated detail leakage**: Sensitive exception messages are only exposed when `DEBUG=true`; otherwise a safe fallback string is returned.
4. **Status-code-driven client mapping**: The frontend treats 401 and 403 as special cases (auth/session errors) and generalizes others by reading the response body's `detail` field.
5. **No custom exception classes**: The codebase does not define application-specific exception types; it relies entirely on FastAPI's built-in exceptions and `HTTPException`.
6. **No middleware-based error wrapping**: Error handling is done exclusively via `app.add_exception_handler`; no custom middleware intercepts or transforms errors.