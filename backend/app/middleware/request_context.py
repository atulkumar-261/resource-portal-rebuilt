import contextvars
import logging
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

# Context variable to hold the request ID for the current thread/coroutine context
request_id_var = contextvars.ContextVar("request_id", default="")

class RequestIdFilter(logging.Filter):
    """
    Python Logging Filter to automatically inject the context-local request_id
    into any log record.
    """
    def filter(self, record):
        record.request_id = request_id_var.get() or "system"
        return True

class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    FastAPI/Starlette middleware that extracts or generates a unique correlation ID
    for each incoming request and sets it in the request state and context variables.
    """
    async def dispatch(self, request, call_next):
        # Check if an upstream correlation ID exists, otherwise generate one
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # Set context variable for asynchronous logs
        token = request_id_var.set(req_id)
        request.state.request_id = req_id
        
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            # Reset context variable after request lifecycle
            request_id_var.reset(token)
