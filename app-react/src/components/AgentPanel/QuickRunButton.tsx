/**
 * Quick Run Button Component
 *
 * Button to execute agent or send chat message with loading state
 * Supports both execution mode and conversation mode
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { Play, MessageSquare } from 'lucide-react';
import { sendAgentChat } from '../../store/slices/agentSlice';
import { toast } from 'react-toastify';

interface QuickRunButtonProps {
  selectedAgent: string | null;
  targetFile: string | null;
  inputMessage?: string;
  conversationId?: string | null;
  mode?: 'execution' | 'chat';
  disabled?: boolean;
}

export function QuickRunButton({
  selectedAgent,
  targetFile,
  inputMessage,
  conversationId,
  mode = 'execution',
  disabled
}: QuickRunButtonProps) {
  const dispatch = useDispatch();
  const isLoading = useSelector((state: RootState) => state.agent.isLoading);
  const currentConversation = useSelector((state: RootState) => state.agent.currentConversation);

  const [isSending, setIsSending] = useState(false);

  const canRun = selectedAgent && !isLoading && !disabled && !isSending;

  // In chat mode, can send if there's an input message
  const canSendChat = mode === 'chat' && inputMessage?.trim() && !isLoading && !disabled && !isSending;

  // In execution mode, can run if there's a target file
  const canExecute = mode === 'execution' && targetFile && selectedAgent && !isLoading && !disabled;

  const handleClick = async () => {
    if (mode === 'chat' && inputMessage?.trim()) {
      setIsSending(true);
      try {
        await dispatch(sendAgentChat({
          message: inputMessage,
          contextFiles: targetFile ? [targetFile] : [],
          agentType: selectedAgent || 'general',
          conversationId: conversationId || currentConversation?.id
        })).unwrap();
        toast.success('訊息已發送');
      } catch (error: any) {
        toast.error(error.message || '發送失敗');
      } finally {
        setIsSending(false);
      }
    }
  };

  if (mode === 'chat') {
    return (
      <button
        className={`pe-btn pe-btn-primary ${canSendChat ? '' : 'disabled'}`}
        onClick={handleClick}
        disabled={!canSendChat}
        title={conversationId ? '發送到當前對話' : '發送訊息'}
      >
        {isSending || isLoading ? (
          <>
            <div className="btn-spinner"></div>
            發送中...
          </>
        ) : (
          <>
            <MessageSquare size={18} />
            發送
          </>
        )}
      </button>
    );
  }

  return (
    <button
      className={`pe-btn pe-btn-primary ${canExecute ? '' : 'disabled'}`}
      onClick={handleClick}
      disabled={!canExecute}
      title="執行 Agent"
    >
      <Play size={18} />
      {isLoading ? '執行中...' : '執行 Agent'}
    </button>
  );
}
