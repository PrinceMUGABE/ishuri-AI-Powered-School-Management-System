import { websocketUrl } from '../config/api';
// hooks/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';

const LOG = (...args) => console.log(`%c[WS ${new Date().toLocaleTimeString()}]`, 'color:#4caf50;font-weight:bold', ...args);
const ERR = (...args) => console.error(`%c[WS ${new Date().toLocaleTimeString()}]`, 'color:#ef4444;font-weight:bold', ...args);

export const useWebSocket = (chatroomId, onMessageReceived) => {
  const [isConnected, setIsConnected] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const chatroomIdRef = useRef(chatroomId);
  const onMessageRef = useRef(onMessageReceived);

  const addDebug = useCallback((msg, type = 'info') => {
    const entry = { msg, type, time: new Date().toLocaleTimeString() };
    setDebugLog(prev => [...prev.slice(-49), entry]); // keep last 50
    if (type === 'error') ERR(msg);
    else LOG(msg);
  }, []);

  useEffect(() => { chatroomIdRef.current = chatroomId; }, [chatroomId]);
  useEffect(() => { onMessageRef.current = onMessageReceived; }, [onMessageReceived]);

  const connect = useCallback(() => {
    const roomId = chatroomIdRef.current;
    if (!roomId) { LOG('connect() called but no chatroomId — skipping'); return; }

    // Close existing connection cleanly before reconnecting
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      LOG('Closing existing connection before reconnect');
      wsRef.current.onclose = null; // prevent reconnect loop from old handler
      wsRef.current.close();
    }

    const token = localStorage.getItem('access_token');
    if (!token) { ERR('No access_token in localStorage — WS will be rejected'); return; }

    const wsUrl = websocketUrl(`/ws/chat/${roomId}/?token=${encodeURIComponent(token)}`);
    addDebug(`Connecting to room ${roomId} (attempt #${++reconnectCountRef.current})`, 'info');
    LOG(`Opening WebSocket: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectCountRef.current = 0;
      setIsConnected(true);
      addDebug(`Connected to room ${roomId} ✓`, 'success');
      LOG(`Connected — readyState: ${ws.readyState}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addDebug(`← ${data.event || data.type || 'unknown'} event`, 'recv');
        LOG('Received:', data);

        if (data.event === 'new_message' && data.message) {
          LOG('Dispatching new_message, id:', data.message.id);
          onMessageRef.current({ message: data.message });

        } else if (data.event === 'receipt_update') {
          LOG('Dispatching receipt_update for msg:', data.message_id, 'status:', data.status);
          onMessageRef.current({ type: 'receipt_update', data });

        } else if (data.event === 'message_deleted') {
          LOG('Dispatching message_deleted, id:', data.message_id);
          onMessageRef.current({ type: 'message_deleted', messageId: data.message_id });

        } else if (data.event === 'message_updated') {
          LOG('Dispatching message_updated, id:', data.message_id);
          onMessageRef.current({ type: 'message_updated', data });

        } else if (data.event === 'member_update') {
          LOG('Member update:', data.action, 'user:', data.user_id);
          addDebug(`Member ${data.action}: user ${data.user_id}`, 'info');

        } else {
          addDebug(`Unknown event: ${JSON.stringify(data).slice(0, 80)}`, 'warn');
          ERR('Unhandled WS event:', data);
        }
      } catch (error) {
        ERR('Failed to parse WS message:', event.data, error);
        addDebug(`Parse error: ${error.message}`, 'error');
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      const reason = event.reason || (event.code === 1006 ? 'Abnormal closure (check CORS/token)' : `Code ${event.code}`);
      addDebug(`Disconnected — ${reason}`, 'warn');
      LOG(`Closed — code: ${event.code}, reason: "${reason}", clean: ${event.wasClean}`);

      // Exponential backoff: 3s, 6s, 12s, max 30s
      const delay = Math.min(3000 * Math.pow(2, reconnectCountRef.current), 30000);
      LOG(`Reconnecting in ${delay / 1000}s...`);
      addDebug(`Reconnecting in ${delay / 1000}s...`, 'info');
      reconnectTimeoutRef.current = setTimeout(() => {
        if (chatroomIdRef.current) connect();
      }, delay);
    };

    ws.onerror = (error) => {
      ERR('WebSocket error event fired (check network tab for details)', error);
      addDebug('WS error — see browser Network tab → WS', 'error');
    };
  }, [addDebug]);

  const disconnect = useCallback(() => {
    LOG(`Disconnecting from room ${chatroomIdRef.current}`);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // suppress auto-reconnect on manual disconnect
      wsRef.current.close(1000, 'Component unmounted');
    }
    setIsConnected(false);
  }, []);

  const sendReadReceipt = useCallback((messageId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = { type: 'read_receipt', message_id: messageId };
      LOG('Sending read_receipt for msg:', messageId);
      wsRef.current.send(JSON.stringify(payload));
    } else {
      LOG('sendReadReceipt skipped — WS not open, state:', wsRef.current?.readyState);
    }
  }, []);

  useEffect(() => {
    if (chatroomId) {
      reconnectCountRef.current = 0;
      connect();
    }
    return () => disconnect();
  }, [chatroomId, connect, disconnect]);

  return { isConnected, sendReadReceipt, debugLog };
};