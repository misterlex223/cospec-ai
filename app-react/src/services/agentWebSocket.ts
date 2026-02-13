/**
 * Agent WebSocket Service
 *
 * Listens for agent-related WebSocket events and updates Redux store
 */

import { store } from '../store';
import { addExecution, updateExecution } from '../store/slices/agentSlice';
import type { ChatMessage } from './api';
import webSocketService from './websocket';

let isConnected = false;

// Event callbacks registry for chat events
const chatEventCallbacks = new Map<string, Set<(data: any) => void>>();

export function onChatEvent(conversationId: string, event: string, callback: (data: any) => void) {
  const key = `${conversationId}:${event}`;
  if (!chatEventCallbacks.has(key)) {
    chatEventCallbacks.set(key, new Set());
  }
  chatEventCallbacks.get(key)!.add(callback);

  // Return unsubscribe function
  return () => {
    const callbacks = chatEventCallbacks.get(key);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        chatEventCallbacks.delete(key);
      }
    }
  };
}

export function connectAgentWebSocket() {
  if (isConnected) {
    return;
  }

  // Agent status update
  webSocketService.addEventListener('agent-status-update', (data: any) => {
    store.dispatch(addExecution({
      id: data.executionId,
      agentType: data.agentType,
      targetFiles: [],
      status: data.status,
      summary: '',
      outputFilePath: null,
      startTime: data.startTime,
      retryCount: 0
    }));
  });

  // Agent complete
  webSocketService.addEventListener('agent-complete', (data: any) => {
    store.dispatch(updateExecution({
      id: data.executionId,
      status: data.status,
      outputFilePath: data.outputFilePath,
      summary: data.summary
    }));
  });

  // Agent error
  webSocketService.addEventListener('agent-error', (data: any) => {
    store.dispatch(updateExecution({
      id: data.executionId,
      status: 'failed',
      error: data.error
    }));
  });

  // Agent progress
  webSocketService.addEventListener('agent-progress', (data: any) => {
    // Update summary with latest output
    store.dispatch(updateExecution({
      id: data.executionId,
      summary: data.output.slice(0, 200)
    }));
  });

  // ========================================================================
  // Chat-related WebSocket events
  // ========================================================================

  // Chat message received (user message confirmation)
  webSocketService.addEventListener('agent-chat-message', (data: any) => {
    const { conversationId, message } = data;
    const key = `${conversationId}:message`;
    const callbacks = chatEventCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  });

  // Chat streaming chunk
  webSocketService.addEventListener('agent-chat-chunk', (data: any) => {
    const { conversationId, messageId, chunk, done } = data;
    const key = `${conversationId}:chunk`;
    const callbacks = chatEventCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  });

  // Chat complete
  webSocketService.addEventListener('agent-chat-complete', (data: any) => {
    const { conversationId, messageId, response } = data;
    const key = `${conversationId}:complete`;
    const callbacks = chatEventCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  });

  // Chat error
  webSocketService.addEventListener('agent-chat-error', (data: any) => {
    const { conversationId, messageId, error } = data;
    const key = `${conversationId}:error`;
    const callbacks = chatEventCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  });

  isConnected = true;
}
