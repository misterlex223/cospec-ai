# WebSocket Socket.IO Migration

## Issue

The frontend was using native WebSocket while the backend uses Socket.IO, causing connection errors:
- `ws proxy error: socket hang up`
- `WebSocket connection to 'ws://localhost:9280/ws' failed`
- `WebSocket connection closed: 1006`

## Root Cause

Socket.IO requires a specific handshake protocol that native WebSocket doesn't support. The Vite proxy cannot properly proxy Socket.IO connections.

## Solution

Migrated the frontend from native WebSocket to Socket.IO client.

### Changes Made

**1. Installed Socket.IO Client**
```bash
cd app-react
pnpm add socket.io-client
```

**2. Updated `app-react/src/services/websocket.ts`**

Changed from native WebSocket:
```typescript
this.socket = new WebSocket(wsUrl);
this.socket.onopen = () => {...};
this.socket.onmessage = (event) => {...};
this.socket.close();
this.socket.readyState === WebSocket.OPEN
```

To Socket.IO client:
```typescript
import { io, Socket } from 'socket.io-client';

this.socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
  reconnection: false,
});

this.socket.on('connect', () => {...});
this.socket.on('file-change', (data) => {...});
this.socket.on('generation-output', (data) => {...});
this.socket.disconnect();
this.socket.connected
```

**3. Key API Changes**

| Native WebSocket | Socket.IO Client |
|-----------------|------------------|
| `new WebSocket(url)` | `io(url, options)` |
| `.onopen` | `.on('connect', ...)` |
| `.onmessage` | `.on(eventName, ...)` |
| `.ondisconnect` | `.on('disconnect', ...)` |
| `.onerror` | `.on('connect_error', ...)` |
| `.close()` | `.disconnect()` |
| `.readyState === WebSocket.OPEN` | `.connected` |

**4. Event Handling**

Socket.IO uses named events instead of parsing JSON from messages:
```typescript
// Backend emits
io.emit('file-change', { path, type });
io.emit('generation-output', { path, output });

// Frontend listens
socket.on('file-change', (data) => {...});
socket.on('generation-output', (data) => {...});
```

**5. Connection URL**

Changed from WebSocket protocol to HTTP protocol:
```typescript
// Old: ws://localhost:9280/ws
// New: http://localhost:9280
const socketUrl = `${protocol}://${host}:${port}`;
```

### Testing

1. **Build the frontend:**
   ```bash
   cd app-react
   pnpm run build
   ```

2. **Start development servers:**
   ```bash
   pnpm run dev
   ```

3. **Expected behavior:**
   - Frontend connects to backend Socket.IO server
   - Console shows: "Socket.IO connection established"
   - Real-time file changes propagate
   - Generation output streams correctly

### Files Modified

- `app-react/src/services/websocket.ts` - Migrated to Socket.IO client
- `app-react/package.json` - Added socket.io-client dependency
- `CLAUDE.md` - Updated architecture documentation

### Benefits

1. **Protocol Compatibility**: Frontend and backend now use the same Socket.IO protocol
2. **Automatic Fallback**: Socket.IO falls back to polling if WebSocket fails
3. **Better Error Handling**: Named events and typed error callbacks
4. **Reconnection Logic**: Can implement custom reconnection strategies
5. **Room Support**: Future support for room-based broadcasting

## Related Documentation

- Socket.IO Client API: https://socket.io/docs/v4/client-api/
- Socket.IO Server API: https://socket.io/docs/v4/server-api/
- [CLAUDE.md](../CLAUDE.md) - Architecture overview
- [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - Development workflow
