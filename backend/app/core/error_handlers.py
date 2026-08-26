"""
Global Error Handlers for TariffGuard API
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import os

def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "message": "Validation error",
            "errors": exc.errors()
        }
    )

def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    debug = os.getenv("DEBUG", "false").lower() == "true"
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Database error occurred",
            "detail": str(exc) if debug else "Internal server error"
        }
    )

def generic_error_handler(request: Request, exc: Exception):
    """Handle all other errors"""
    debug = os.getenv("DEBUG", "false").lower() == "true"
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "detail": str(exc) if debug else "An unexpected error occurred"
        }
    )