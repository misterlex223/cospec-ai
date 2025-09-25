<!-- 功能項目: 3.2.1 初始化 Vditor 編輯器 -->
<template>
  <div class="markdown-editor">
    <div v-if="loading" class="editor-loading">
      加載中...
    </div>
    <div v-else-if="error" class="editor-error">
      {{ error }}
    </div>
    <!-- 確保 editorRef 始終存在，不要使用 v-else -->
    <div ref="editorRef" class="vditor-container" :style="{ display: !loading && !error ? 'block' : 'none' }"></div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { useFileStore } from '../stores/fileStore';
import { debounce } from '../utils/helpers';

export default {
  name: 'MarkdownEditor',
  props: {
    filePath: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const fileStore = useFileStore();
    const editorRef = ref(null);
    const vditor = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const content = ref('');
    
    // 暴露給父組件的方法
    const loadFile = async (filePath) => {
      console.log('MarkdownEditor.loadFile called with path:', filePath);
      if (vditor.value) {
        vditor.value.destroy();
        vditor.value = null;
      }
      
      loading.value = true;
      error.value = null;
      
      try {
        // 獲取文件內容
        console.log('MarkdownEditor.loadFile: Fetching file content for path:', filePath);
        const fileContent = await fileStore.fetchFileContent(filePath);
        console.log('MarkdownEditor.loadFile: File content received:', fileContent ? 'Content available' : 'No content');
        
        if (!fileContent) {
          error.value = `無法加載文件: ${filePath}`;
          loading.value = false;
          return;
        }
        
        content.value = fileContent;
        
        // 等待 DOM 更新
        nextTick(() => {
          console.log('MarkdownEditor.loadFile: nextTick, editorRef:', editorRef.value ? 'available' : 'null');
          if (editorRef.value) {
            initEditor(fileContent);
          } else {
            console.error('MarkdownEditor.loadFile: editorRef is null after nextTick, trying with timeout');
            // 再嘗試一次，使用更長的延遲
            setTimeout(() => {
              console.log('MarkdownEditor.loadFile: setTimeout, editorRef:', editorRef.value ? 'available' : 'null');
              if (editorRef.value) {
                initEditor(fileContent);
              } else {
                console.error('MarkdownEditor.loadFile: editorRef is still null after timeout');
                error.value = 'Editor reference is not available after timeout';
                loading.value = false;
              }
            }, 500);
          }
        });
      } catch (err) {
        console.error('MarkdownEditor.loadFile: Error loading file:', err);
        error.value = `加載失敗: ${err.message}`;
        loading.value = false;
      }
    };
    
    // 功能項目: 3.2.4 即時保存功能
    const saveContent = debounce(async (value) => {
      console.log('saveContent called with value:', value ? 'Content available' : 'No content');
      try {
        await fileStore.saveFile(props.filePath, value);
      } catch (err) {
        error.value = `保存失敗: ${err.message}`;
      }
    }, 1000);
    
    // 功能項目: 3.2.2 配置編輯器選項
    const initEditor = (fileContent) => {
      console.log('initEditor called with fileContent:', fileContent ? 'Content available' : 'No content');
      
      if (!editorRef.value) {
        console.error('editorRef is null, cannot initialize editor');
        error.value = 'Editor reference is not available';
        return;
      }
      
      try {
        // 初始化編輯器
        vditor.value = new Vditor(editorRef.value, {
          height: '100%',
          mode: 'wysiwyg', // 所見即所得模式
          value: content.value,
          placeholder: '開始編輯...',
          toolbar: [
            'headings', 'bold', 'italic', 'strike', 'link', '|',
            'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
            'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
            'upload', 'table', '|',
            'undo', 'redo', '|',
            'fullscreen', 'edit-mode', 'both', 'preview', 'outline', 'export'
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
              // 在實際應用中，這裡應該處理文件上傳
              console.log('File upload not implemented', files);
              return 'File upload not implemented';
            }
          },
          input: (value) => {
            console.log('Vditor input event triggered with value length:', value ? value.length : 0);
            content.value = value;
            saveContent(value);
          },
          after: () => {
            loading.value = false;
          }
        });
      } catch (err) {
        error.value = `加載失敗: ${err.message}`;
        loading.value = false;
      }
    };
    
    // 監聽文件路徑變化
    watch(() => props.filePath, (newPath) => {
      console.log('MarkdownEditor: props.filePath changed to:', newPath);
      // 父組件會調用 loadFile 方法，所以這裡不需要做任何事情
    });
    
    onMounted(() => {
      console.log('MarkdownEditor mounted, props.filePath:', props.filePath);
      // 初始加載會由父組件調用 loadFile 方法處理
    });
    
    onUnmounted(() => {
      if (vditor.value) {
        vditor.value.destroy();
        vditor.value = null;
      }
    });
    
    return {
      editorRef,
      loading,
      error,
      loadFile // 暴露給父組件的方法
    };
  }
};
</script>

<style scoped>
.markdown-editor {
  height: 100%;
  width: 100%;
}

.editor-loading, .editor-error {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
}

.editor-error {
  color: #e53e3e;
}

.vditor-container {
  height: 100%;
}

:deep(.vditor) {
  border: none;
}
</style>
