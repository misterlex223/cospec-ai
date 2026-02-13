/**
 * Agent WebSocket Service
 *
 * Listens for agent-related WebSocket events and updates Redux store
 */

import { store } from '../store';
import { addExecution, updateExecution } from '../store/slices/agentSlice';
import webSocketService from './websocket';

let isConnected = false;

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

  isConnected = true;
}
