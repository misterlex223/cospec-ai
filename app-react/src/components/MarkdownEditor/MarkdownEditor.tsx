import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { fileApi } from '../../services/api';
import { cn } from '../../lib/utils';
import { AIAssistant } from '../AIAssistant/AIAssistant';
import { RequirementsView } from '../RequirementsView/RequirementsView';
import { SystemDesignView } from '../SystemDesignView/SystemDesignView';
import '../AIAssistant/AIAssistant.css';
import './MarkdownEditorStyles.css';

// 簡單的防抖函數實現
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};

interface MarkdownEditorProps {
  filePath: string;
  className?: string;
}

/**
 * Markdown 編輯器組件
 * @see /docs/solved_issues.md#31-首次加載文件內容不顯示
 * @see /docs/solved_issues.md#32-cospec-ai-配置錯誤
 * @see /docs/requirements.md#32-cospec-ai-編輯器整合
 */
export function MarkdownEditor({ filePath, className }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const vditorRef = useRef<Vditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 存儲當前編輯器內容，用於初始化編輯器和保存時使用
  const [content, setContent] = useState('');
  // 控制檔案資訊區塊的顯示
  const [showFileInfo, setShowFileInfo] = useState(true);
  const navigate = useNavigate();

  // 獲取當前文件的目錄路徑
  const getCurrentDirectory = () => {
    const lastSlashIndex = filePath.lastIndexOf('/');
    return lastSlashIndex > -1 ? filePath.substring(0, lastSlashIndex) : '';
  };

  // 防抖保存功能
  const saveContent = debounce(async (value: string) => {
    try {
      await fileApi.saveFile(filePath, value);
    } catch (err) {
      console.error('Failed to save file:', err);
      // Error is handled by the API interceptor, so no need to setError here
    }
  }, 1000);

  // 防抖滾動事件處理
  const handleScrollDebounced = debounce((scrollTop: number) => {
    if (scrollTop <= 50) {
      setShowFileInfo(true);
    } else if (scrollTop > 50) {
      setShowFileInfo(false);
    }
  }, 200);  // 增加防抖時間以減少更新频率

  /**
   * 使用 Promise 封裝編輯器初始化過程
   * @see /docs/solved_issues.md#31-首次加載文件內容不顯示
   * @see /docs/solved_issues.md#32-cospec-ai-配置錯誤
   * @see /docs/requirements.md#325-編輯器同步初始化
   */
  const initEditor = async (fileContent: string): Promise<void> => {
    if (!editorRef.current) {
      console.error('Editor reference is null');
      throw new Error('Editor reference is null');
    }

    try {
      if (vditorRef.current && vditorRef.current.element) {
        try {
          vditorRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying Vditor instance:', error);
        }
        vditorRef.current = null;
      }

      // 使用 content 變數來初始化編輯器
      if (content !== fileContent) {
        setContent(fileContent);
      }

      // 確保 DOM 元素存在且已經渲染
      console.log('Initializing Vditor with element:', editorRef.current);

      // 使用 requestAnimationFrame 確保在下一幀渲染前執行
      return new Promise<void>((resolve, reject) => {
        requestAnimationFrame(() => {
          if (!editorRef.current) {
            const error = new Error('Editor reference is null after requestAnimationFrame');
            console.error(error);
            setError('Failed to initialize editor: DOM element not available');
            setLoading(false);
            reject(error);
            return;
          }

          try {
            // 使用最簡化的配置，避免可能引發錯誤的選項
            const vditorConfig: any = {
              height: '100%',
              mode: 'wysiwyg',
              value: fileContent, // 直接使用 fileContent 參數
              placeholder: 'Start editing...',
              // 只使用最基本的工具欄按鈕，避免複雜的配置選項
              toolbar: ['bold', 'italic', 'headings', 'link', 'upload', 'undo', 'redo'],
              cache: { enable: false },
              input: (value: string) => {
                setContent(value);
                saveContent(value);
              },
              // 添加安全的初始化完成回調
              after: () => {
                // 確保在正確的上下文中執行
                setTimeout(() => {
                  setLoading(false);
                  
                  // 在編輯器初始化後，添加連結點擊事件監聽器
                  if (vditorRef.current) {
                    const editorElement = document.querySelector('.vditor-content');
                    if (editorElement) {
                      editorElement.addEventListener('click', (event) => {
                        const mouseEvent = event as MouseEvent;
                        const target = mouseEvent.target as HTMLElement;
                        if (target.tagName === 'A') {
                          event.preventDefault();

                          const href = target.getAttribute('href');
                          if (href) {
                            const isExternalUrl = new RegExp('^(https?://|mailto:|tel:|ftp:)', 'i').test(href);

                            if (isExternalUrl) {
                              window.open(href, '_blank', 'noopener,noreferrer');
                            } else if (href.startsWith('#')) {
                              const targetId = href.substring(1);
                              const targetElement = document.getElementById(targetId);
                              if (targetElement) {
                                targetElement.scrollIntoView({ behavior: 'smooth' });
                              }
                            } else {
                              // 處理相對路徑
                              const currentDir = getCurrentDirectory();
                              let absolutePath;

                              if (href.startsWith('./')) {
                                absolutePath = `${currentDir}/${href.substring(2)}`;
                              } else if (href.startsWith('../')) {
                                const parentDir = currentDir.substring(0, currentDir.lastIndexOf('/'));
                                absolutePath = `${parentDir}/${href.substring(3)}`;
                              } else if (href.startsWith('/')) {
                                absolutePath = href.substring(1);
                              } else {
                                absolutePath = `${currentDir}/${href}`;
                              }

                              // 正規化路徑，移除多餘的 './' 和 '../'
                              const normalizedPath = absolutePath
                                .replace(/\/\.\//g, '/')
                                .replace(/\/[^\/]+\/\.\.\//g, '/');

                              console.log(`Navigating to internal path: /edit/${normalizedPath}`);
                              navigate(`/edit/${normalizedPath}`);
                            }
                          }
                        }
                      });
                    }
                  }

                  // 確保工具欄正確顯示
                  setTimeout(() => {
                    const toolbar = document.querySelector('.vditor-toolbar');
                    if (toolbar) {
                      (toolbar as HTMLElement).style.position = 'sticky';
                      (toolbar as HTMLElement).style.top = '0';
                      (toolbar as HTMLElement).style.zIndex = '100';
                      (toolbar as HTMLElement).style.display = 'flex';
                    }

                    const content = document.querySelector('.vditor-content');
                    if (content) {
                      (content as HTMLElement).style.overflow = 'auto';
                    }

                    const vditorElements = document.querySelectorAll('.vditor, .vditor-reset, .vditor-wysiwyg');
                    vditorElements.forEach(el => {
                      (el as HTMLElement).style.transition = 'none';
                    });
                  }, 100);

                  // 解決 Promise，標記初始化完成
                  resolve();
                }, 0);
              },
              // 添加錯誤處理
              ctrlEnter: (event: KeyboardEvent) => {
                console.log('Ctrl+Enter pressed', event);
              }
            };

            // 在初始化前驗證配置對象
            try {
              // 確保工具欄是數組
              if (vditorConfig.toolbar && !Array.isArray(vditorConfig.toolbar)) {
                console.error('Vditor toolbar config is not an array:', typeof vditorConfig.toolbar, vditorConfig.toolbar);
                vditorConfig.toolbar = [];
              }

              // 初始化 Vditor
              vditorRef.current = new Vditor(editorRef.current, vditorConfig);
            } catch (error) {
              console.error('Error initializing Vditor:', error);
              setError(`Failed to initialize editor: ${error instanceof Error ? error.message : String(error)}`);
              setLoading(false);
              reject(error);
            }
          } catch (innerErr) {
            console.error('Error initializing Vditor:', innerErr);
            setError(`Failed to initialize editor: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
            setLoading(false);
            reject(innerErr);
          }
        });
      });
    } catch (err) {
      setError(`Failed to initialize editor: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
      throw err;
    }
  };

  /**
   * 加載文件內容
   * @see /docs/solved_issues.md#31-首次加載文件內容不顯示
   * @see /docs/requirements.md#326-文件內容正確加載
   */
  const loadFile = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fileApi.getFileContent(path);
      // 設置內容變數
      const fileContent = response.content || '';

      // 使用 flushSync 確保狀態更新已完成
      flushSync(() => {
        setContent(fileContent);
      });
      console.log(`Content set to ${fileContent.length} characters`);

      // 使用 requestAnimationFrame 確保 DOM 已更新
      requestAnimationFrame(async () => {
        try {
          if (editorRef.current) {
            await initEditor(fileContent);
          } else {
            setError('Editor reference is not available');
            setLoading(false);
          }
        } catch (err) {
          console.error('Error in loadFile requestAnimationFrame:', err);
          setError(`Failed to initialize editor: ${err instanceof Error ? err.message : String(err)}`);
          setLoading(false);
        }
      });
    } catch (err) {
      console.error(`Failed to load file: ${err}`);
      setError(`Failed to load file: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // 載入文件的 useEffect
  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    }

    // 清理編輯器
    return () => {
      if (vditorRef.current && vditorRef.current.element) {
        try {
          vditorRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying Vditor instance in cleanup:', error);
        }
        vditorRef.current = null;
      }
    };
  }, [filePath]); // 只在 filePath 變化時重新載入文件

  // 處理滾動事件的 useEffect
  useEffect(() => {
    // 如果還在載入或編輯器未初始化，則不設置監聽器
    if (loading || !vditorRef.current) return;

    // 滾動事件處理函數
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const scrollTop = target.scrollTop || 0;
      handleScrollDebounced(scrollTop);
    };

    // 找到可滾動的內容元素
    const contentElement = document.querySelector('.vditor-content');
    if (contentElement) {
      // 添加滾動事件監聽
      contentElement.addEventListener('scroll', handleScroll, { passive: true });

      // 確保內容可以滾動
      (contentElement as HTMLElement).style.overflow = 'auto';
    }

    // 視窗大小變化處理
    const handleResize = debounce(() => {
      const content = document.querySelector('.vditor-content');
      if (content) {
        (content as HTMLElement).style.overflow = 'auto';
      }
    }, 200);

    window.addEventListener('resize', handleResize);

    // 清理函數
    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [loading, handleScrollDebounced]);

  // 取得檔案名稱，去除路徑
  const fileName = filePath.split('/').pop() || filePath;

  return (
    <div className={cn("relative h-full flex flex-col", className)}>
      {/* 檔案名稱標題 - 只在滑到頂部時顯示，但不會影響工具欄操作 */}
      <div className={`file-info-header ${showFileInfo ? 'visible' : 'hidden'}`}>
        <h2 className="text-lg font-semibold truncate" title={fileName}>
          <span className="mr-2">📄</span> {/* 檔案圖標 */}
          {fileName}
        </h2>
      </div>

      {/* 編輯器容器 - 確保工具欄可見 */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-lg">Loading...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-lg text-red-500">{error}</div>
          </div>
        )}
        {/* 確保編輯器容器沒有遮擋工具欄的元素 */}
        <div ref={editorRef} className="h-full w-full" style={{ position: 'relative', zIndex: 1 }} />
      </div>

      {/* 系統設計和需求追蹤視圖容器 - 確保可見且有適當的滾動行為 */}
      <div className="relative">
        {/* System Design View - shown when editing system design files */}
        <SystemDesignView
          content={content}
          onUpdateContent={(newContent) => {
            setContent(newContent);
            if (vditorRef.current && vditorRef.current.element) {
              try {
                vditorRef.current.setValue(newContent);
              } catch (error) {
                console.warn('Error setting Vditor value:', error);
              }
              saveContent(newContent); // 使用防抖保存
            }
          }}
        />

        {/* Requirements View - shown when editing requirements files */}
        <RequirementsView
          content={content}
          onUpdateContent={(newContent) => {
            setContent(newContent);
            if (vditorRef.current && vditorRef.current.element) {
              try {
                vditorRef.current.setValue(newContent);
              } catch (error) {
                console.warn('Error setting Vditor value:', error);
              }
              saveContent(newContent); // 使用防抖保存
            }
          }}
        />
      </div>

      {/* AI 助理組件 */}
      <AIAssistant
        currentContent={content}
        onContentUpdate={(newContent) => {
          setContent(newContent);
          if (vditorRef.current && vditorRef.current.element) {
            try {
              vditorRef.current.setValue(newContent);
            } catch (error) {
              console.warn('Error setting Vditor value:', error);
            }
            saveContent(newContent); // 使用防抖保存
          }
        }}
      />
    </div>
  );
}