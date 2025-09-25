import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { fileApi } from '../../services/api';
import { cn } from '../../lib/utils';
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
 * @see /docs/solved_issues.md#32-vditor-配置錯誤
 * @see /docs/requirements.md#32-vditor-編輯器整合
 */
export function MarkdownEditor({ filePath, className }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const vditorRef = useRef<Vditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 存儲當前編輯器內容，用於初始化編輯器和保存時使用
  const [content, setContent] = useState('');

  // 防抖保存功能
  const saveContent = debounce(async (value: string) => {
    try {
      await fileApi.saveFile(filePath, value);
    } catch (err) {
      setError(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, 1000);

  /**
   * 使用 Promise 封裝編輯器初始化過程
   * @see /docs/solved_issues.md#31-首次加載文件內容不顯示
   * @see /docs/solved_issues.md#32-vditor-配置錯誤
   * @see /docs/requirements.md#325-編輯器同步初始化
   */
  const initEditor = async (fileContent: string): Promise<void> => {
    if (!editorRef.current) {
      console.error('Editor reference is null');
      throw new Error('Editor reference is null');
    }

    try {
      if (vditorRef.current) {
        vditorRef.current.destroy();
        vditorRef.current = null;
      }
      
      // 使用 content 變數來初始化編輯器
      if (content !== fileContent) {
        setContent(fileContent);
      }

      // 確保 DOM 元素存在且已經渲染
      console.log('Initializing Vditor with element:', editorRef.current);
      
      // 使用 Promise 而不是 setTimeout
      return new Promise<void>((resolve, reject) => {
        // 使用 requestAnimationFrame 確保在下一幀渲染前執行
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
            // 使用更簡單的配置，避免自定義工具欄問題
            vditorRef.current = new Vditor(editorRef.current, {
              height: '100%',
              mode: 'wysiwyg',
              value: fileContent, // 直接使用 fileContent 參數
              placeholder: 'Start editing...',
              // 使用基本工具欄，不使用可能導致問題的選項
              toolbar: [
                'emoji', 'headings', 'bold', 'italic', 'strike', 'link',
                'list', 'ordered-list', 'check', 'outdent', 'indent',
                'quote', 'line', 'code', 'inline-code',
                'upload', 'table',
                'undo', 'redo',
                'fullscreen', 'preview'
              ],
              cache: {
                enable: false
              },
              preview: {
                hljs: {
                  enable: true,
                  style: 'github'
                },
                math: {
                  inlineDigit: true
                }
              },
              upload: {
                accept: 'image/*',
                handler: (files) => {
                  console.log('File upload not implemented', files);
                  return 'File upload not implemented';
                }
              },
              input: (value) => {
                setContent(value);
                saveContent(value);
              },
              after: () => {
                setLoading(false);
                resolve(); // 編輯器初始化完成後解析 Promise
              }
            });
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
      setError(`Failed to load file: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    }

    return () => {
      if (vditorRef.current) {
        vditorRef.current.destroy();
        vditorRef.current = null;
      }
    };
  }, [filePath]);

  // 取得檔案名稱，去除路徑
  const fileName = filePath.split('/').pop() || filePath;

  return (
    <div className={cn("relative h-full flex flex-col", className)}>
      {/* 檔案名稱標題 */}
      <div className="p-2 border-b bg-gray-50 dark:bg-gray-800 flex items-center">
        <h2 className="text-lg font-semibold truncate">
          <span className="mr-2">📄</span> {/* 檔案圖標 */}
          {fileName}
        </h2>
      </div>
      
      {/* 編輯器容器 */}
      <div className="relative flex-1">
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
        <div ref={editorRef} className="h-full w-full" />
      </div>
    </div>
  );
}
