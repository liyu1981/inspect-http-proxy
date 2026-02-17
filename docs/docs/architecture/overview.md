# Architecture Overview

`ihpp` is designed as a lightweight, self-contained tool that bridges the gap between a CLI proxy and a full-featured web dashboard.

## System Components

### 1. Go Backend (The Engine)
Built with the [Echo](https://echo.labstack.com/) web framework, the backend handles:
- **Proxy Forwarding**: High-performance reverse proxy using Go's `net/http/httputil`.
- **WebSocket Server**: Real-time broadcasting of request/response data to the UI.
- **REST API**: Management endpoints for proxies, history, and bookmarks.
- **Persistence**: Managing the SQLite database and migrations.

### 2. Next.js Frontend (The Dashboard)
A modern Single Page Application (SPA) built with:
- **Tailwind CSS & Shadcn UI**: For a clean, responsive interface.
- **Jotai**: For lightweight global state management.
- **WebSockets**: For real-time data ingestion.

## Data Flow
1. **Request Ingress**: Client sends a request to an `ihpp` proxy port.
2. **Interception**: `ihpp` captures headers and body.
3. **Forwarding**: Request is sent to the Target URL.
4. **Response Capture**: `ihpp` captures the response from the Target.
5. **Persistence**: The Request/Response pair is saved to SQLite.
6. **Broadcasting**: The data is sent via WebSockets to all connected UI clients.
7. **Delivery**: The original response is returned to the Client.
