import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import type { RootState } from '../../store';

interface AIAssistantProps {
  currentContent: string;
  onContentUpdate: (newContent: string) => void;
}

interface ToolCall {
  function: string;
  arguments: any;
  result: any;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export function AIAssistant({ currentContent, onContentUpdate }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filePath = useSelector((state: RootState) => state.editor.filePath);

  // 自動滾動到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 添加用戶消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const newMessages = [...messages, userMessage];
    setInput('');
    setIsLoading(true);

    try {
      // 向後端發送請求
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: currentContent,
          filePath: filePath,
          conversation: newMessages,
          systemPrompt: `你是一個 Markdown 文件編輯助手。你可以幫助用戶總結、重寫、格式化 Markdown 文件，回答有關文件內容的問題，以及提供其他文本相關的幫助。當前編輯的文件是 ${filePath || '未指定'}。文件內容是：\n\n${currentContent || '無內容'}`
        }),
      });

      if (!response.ok) {
        throw new Error(`AI 服務錯誤: ${response.status}`);
      }

      const data = await response.json();

      // 添加 AI 回復
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        toolCalls: data.toolCalls || [] // Include tool calls if available
      };

      setMessages(prev => [...prev, aiMessage]);

      // 如果 AI 提供了新的內容，更新編輯器
      if (data.updatedContent) {
        onContentUpdate(data.updatedContent);
      }
    } catch (error) {
      console.error('AI 服務錯誤:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，AI 服務暫時無法使用，請稍後再試。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIFunction = async (functionName: string) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/functions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: functionName,
          context: currentContent,
          filePath: filePath,
          systemPrompt: '你是一個專業的 Markdown 文件處理助手。根據用戶的請求，對 Markdown 文件進行相應處理，並返回適當格式的結果。'
        }),
      });

      if (!response.ok) {
        throw new Error(`AI 服務錯誤: ${response.status}`);
      }

      const data = await response.json();

      // 添加功能請求消息
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `使用 ${functionName} 功能`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);

      // 添加 AI 回復
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // 如果 AI 提供了新的內容，更新編輯器
      if (data.updatedContent) {
        onContentUpdate(data.updatedContent);
      }
    } catch (error) {
      console.error('AI 服務錯誤:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，AI 服務暫時無法使用，請稍後再試。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        onClick={togglePanel}
        className="ai-assistant-toggle"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ffffff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        ) : isOpen ? '✕' : '🤖'}
      </button>

      {isOpen && (
        <div
          className="ai-assistant-panel"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '400px',
            height: '500px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            AI 助理
            {isLoading && (
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #3b82f6',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
          </div>

          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              backgroundColor: '#fafafa',
              maxHeight: '350px',
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '20px' }}>
                <p>我可以幫您：</p>
                <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                  <li>總結文件內容</li>
                  <li>優化文字表達</li>
                  <li>格式化 Markdown</li>
                  <li>回答關於文件的問題</li>
                </ul>

                <div style={{ marginTop: '20px', textAlign: 'left', fontSize: '13px' }}>
                  <h4>可用工具：</h4>
                  <ul style={{ paddingInlineStart: '20px', marginTop: '8px' }}>
                    <li><strong>list_files</strong>: 列出所有 Markdown 文件</li>
                    <li><strong>read_file</strong>: 讀取特定文件內容</li>
                    <li><strong>write_file</strong>: 寫入內容到文件</li>
                    <li><strong>create_file</strong>: 創建新文件</li>
                    <li><strong>delete_file</strong>: 刪除文件</li>
                    <li><strong>search_content</strong>: 搜尋內容</li>
                    <li><strong>get_requirements</strong>: 提取需求資訊</li>
                    <li><strong>get_system_design</strong>: 提取系統設計元件</li>
                  </ul>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4>快速功能：</h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <button
                      onClick={() => handleAIFunction('summarize')}
                      disabled={isLoading}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: isLoading ? '#93c5fd' : '#e0f2fe',
                        border: '1px solid #7dd3fc',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              border: '2px solid #ffffff',
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                          處理中...
                        </div>
                      ) : '總結文件'}
                    </button>
                    <button
                      onClick={() => handleAIFunction('rewrite')}
                      disabled={isLoading}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: isLoading ? '#93c5fd' : '#e0f2fe',
                        border: '1px solid #7dd3fc',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              border: '2px solid #ffffff',
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                          處理中...
                        </div>
                      ) : '重寫優化'}
                    </button>
                    <button
                      onClick={() => handleAIFunction('format')}
                      disabled={isLoading}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: isLoading ? '#93c5fd' : '#e0f2fe',
                        border: '1px solid #7dd3fc',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              border: '2px solid #ffffff',
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                          處理中...
                        </div>
                      ) : '格式化'}
                    </button>
                    <button
                      onClick={() => handleAIFunction('explain')}
                      disabled={isLoading}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: isLoading ? '#93c5fd' : '#e0f2fe',
                        border: '1px solid #7dd3fc',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              border: '2px solid #ffffff',
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                          處理中...
                        </div>
                      ) : '解釋內容'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      marginBottom: '12px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor:
                        message.role === 'user' ? '#dbeafe' : '#f3f4f6',
                      alignSelf:
                        message.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 'bold',
                        marginBottom: '4px',
                        color: message.role === 'user' ? '#1d4ed8' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {message.role === 'user' ? '您' : 'AI 助理'}
                      {message.role === 'assistant' && isLoading && messages[messages.length - 1]?.id === message.id && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            border: '2px solid #374151',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.role === 'assistant' ? (
                        <>
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                          {/* Display tool calls if they exist */}
                          {message.toolCalls && message.toolCalls.length > 0 && (
                            <div style={{
                              marginTop: '8px',
                              paddingTop: '8px',
                              borderTop: '1px solid #e5e7eb',
                              fontSize: '12px'
                            }}>
                              <strong>工具使用:</strong>
                              {message.toolCalls.map((toolCall, index) => (
                                <div key={index} style={{ marginTop: '4px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '4px' }}>
                                  <div><strong>{toolCall.function}</strong> 使用了</div>
                                  <details style={{ marginTop: '4px' }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#6b7280' }}>查看詳情</summary>
                                    <div style={{ fontSize: '10px', marginTop: '4px' }}>
                                      <div><strong>參數:</strong> {JSON.stringify(toolCall.arguments, null, 2)}</div>
                                      <div><strong>結果:</strong> {JSON.stringify(toolCall.result, null, 2)}</div>
                                    </div>
                                  </details>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        textAlign: 'right',
                        marginTop: '4px',
                      }}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              padding: '12px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isLoading ? "AI 處理中，請稍候..." : "向 AI 提問或請求..."}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: isLoading ? '#f3f4f6' : 'white',
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isLoading ? '#93c5fd' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isLoading ? (
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                ) : '發送'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}