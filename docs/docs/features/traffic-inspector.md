# Traffic Inspection

The core of `ihpp` is its powerful traffic inspection engine.

## Real-time Streaming
Requests appear in the dashboard as they happen via WebSockets. No refreshing required.

### [Screenshot Placeholder: Main Dashboard with active traffic stream]

## Deep Inspection
Clicking on any request opens the detailed viewer, which provides:
- **Headers**: Complete request and response headers (with sensitive ones redacted).
- **Body Viewer**:
  - Automatic decompression (`gzip`, `br`, `deflate`).
  - Syntax highlighting for JSON, HTML, XML, and more.
  - Pretty-printing for minified payloads.
- **Timing**: Precise measurement of how long the target server took to respond.

### [Screenshot Placeholder: Detailed Request/Response Viewer]

## Bookmarks
Save important requests for later by clicking the star icon. These are stored permanently in your history.
