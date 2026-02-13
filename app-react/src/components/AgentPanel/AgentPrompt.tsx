import { useEffect, useState, useRef } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import './AgentPrompt.css';
import type { RootState } from '../../store';
import {
  sendAgentChat,
  fetchAgentSuggestions,
  addChatMessage,
  appendToLastMessage,
  setCurrentConversation,
  setStreamingChat
} from '../../store/slices/agentSlice';
import { onChatEvent } from '../../services/agentWebSocket';
import type { ChatMessage } from '../../services/api';

interface AgentPromptProps {
  targetFile: string | null;
  onExecute?: (prompt: string) => void | Promise<void>;
  onReturn?: () => void;
}

export function AgentPrompt({ targetFile, onExecute, onReturn }: AgentPromptProps) {
  const dispatch = useDispatch();

  // Redux state
  const chatMessages = useSelector((state: RootState) => state.agent.chatMessages);
  const isStreamingChat = useSelector((state: RootState) => state.agent.isStreamingChat);
  const currentSuggestions = useSelector((state: RootState) => state.agent.currentSuggestions);
  const currentConversation = useSelector((state: RootState) => state.agent.currentConversation);

  const [input, setInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Fetch suggestions when target file changes
  useEffect(() => {
    if (targetFile) {
      dispatch(fetchAgentSuggestions(targetFile) as any);
    }
  }, [dispatch, targetFile]);

  // Set up WebSocket listeners for streaming responses
  useEffect(() => {
    if (!currentConversation) return;

    const unsubscribeChunk = onChatEvent(
      currentConversation.id,
      'chunk',
      (data: any) => {
        dispatch(appendToLastMessage(data.chunk));
      }
    );

    const unsubscribeComplete = onChatEvent(
      currentConversation.id,
      'complete',
      () => {
        dispatch(setStreamingChat(false));
      }
    );

    const unsubscribeError = onChatEvent(
      currentConversation.id,
      'error',
      (data: any) => {
        dispatch(setStreamingChat(false));
        dispatch(addChatMessage({
          role: 'assistant',
          content: `錯誤：${data.error}`,
          timestamp: new Date().toISOString(),
          id: ''
        } as ChatMessage));
      }
    );

    return () => {
      unsubscribeChunk();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [dispatch, currentConversation]);

  const handleSend = () => {
    if (!input.trim() || isStreamingChat) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      id: ''
    };

    dispatch(addChatMessage(userMessage as any));

    const messageToSend = targetFile
      ? `${input}\n\n參考文件：${targetFile}`
      : input;

    setInput('');
    dispatch(setStreamingChat(true));

    // Send chat message - conversation will be created/updated via response
    dispatch(sendAgentChat({
      message: messageToSend,
      contextFiles: targetFile ? [targetFile] : undefined,
      agentType: 'general',
      conversationId: currentConversation?.id
    }) as any);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setInput(suggestionText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="agent-prompt">
      <div className="agent-prompt-header">
        <h3>AI 助手</h3>
        <button
          className="agent-prompt-close"
          onClick={onReturn}
        >
          <X size={18} />
        </button>
      </div>

      {targetFile && (
        <div className="agent-prompt-context">
          <span className="context-file">{`@${targetFile}`}</span>
          <span className="context-text">參考此文件進行對話</span>
        </div>
      )}

      <div className="agent-prompt-messages" ref={messagesContainerRef}>
        {chatMessages.length === 0 ? (
          <div className="agent-prompt-welcome">
            <p>您好！我是您的 AI 助手。</p>
            <p>您可以：</p>
            <ul>
              <li>直接輸入問題或指令</li>
              {targetFile && <li>使用 <code>{`@${targetFile}`}</code> 參考當前文件</li>}
              <li>我會幫助您處理 Markdown 文件和編輯任務</li>
            </ul>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div key={msg.timestamp || idx} className={`agent-prompt-message ${msg.role}`}>
              <div className="message-content">
                {msg.role === 'user' ? (
                  <>
                    <span className="message-sender">您</span>
                    <span className="message-text">{msg.content}</span>
                  </>
                ) : (
                  <>
                    <span className="message-sender">AI</span>
                    <span className="message-text">
                      {msg.content || (isStreamingChat && chatMessages.length - 1 === idx ? '正在思考中...' : '')}
                    </span>
                  </>
                )}
              </div>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="agent-prompt-input-area">
        <textarea
          className="agent-prompt-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={targetFile
            ? `輸入您的問題... (使用 @${targetFile} 參考文件)`
            : '輸入您的問題...'}
          rows={3}
          disabled={isStreamingChat}
        />
        <button
          className="agent-prompt-send"
          onClick={handleSend}
          disabled={!input.trim() || isStreamingChat}
          title="發送 (Enter)"
        >
          {isStreamingChat ? <Loader2 size={18} /> : <Send size={18} />}
        </button>
      </div>

      {currentSuggestions.length > 0 && (
        <div className="agent-prompt-suggestions">
          {currentSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(suggestion.prompt)}
              title={suggestion.text}
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      )}

      <button
        className="agent-prompt-return-btn"
        onClick={onReturn}
        title="返回編輯器"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 8 2 8 6 10 8 8 14" />
          <polyline points="8 8 15 2 8 12" />
        </svg>
      </button>
    </div>
  );
}
