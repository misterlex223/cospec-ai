<!-- 功能項目: 3.3.1 響應式設計 -->
<template>
  <div class="editor-view">
    <!-- 功能項目: 3.1.1 顯示目錄結構 -->
    <div class="sidebar">
      <file-tree />
    </div>
    
    <!-- 功能項目: 3.3.3 編輯器與目錄樹大小調整 -->
    <div class="resizer" @mousedown="startResize"></div>
    
    <div class="content">
      <div class="header">
        <h2 v-if="currentFilePath">{{ getFileName(currentFilePath) }}</h2>
        <h2 v-else>Vditor Markdown 編輯器</h2>
        
        <!-- 功能項目: 3.3.2 主題切換 -->
        <button class="theme-toggle" @click="toggleTheme">
          {{ isDarkTheme ? '☀️' : '🌙' }}
        </button>
      </div>
      
      <!-- 功能項目: 3.2.3 編輯器與文件系統連接 -->
      <div class="editor-container">
        <div v-if="!currentFilePath" class="welcome">
          <h3>歡迎使用 Vditor Markdown 編輯器</h3>
          <p>請從側邊欄選擇一個文件進行編輯，或者創建一個新文件。</p>
        </div>
        <div v-else class="editor-wrapper">
          <markdown-editor 
            ref="markdownEditorRef"
            :file-path="currentFilePath" 
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, inject, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import FileTree from '../components/FileTree.vue';
import MarkdownEditor from '../components/MarkdownEditor.vue';

export default {
  name: 'EditorView',
  components: {
    FileTree,
    MarkdownEditor
  },
  setup() {
    const route = useRoute();
    const sidebarWidth = ref(280); // 默認寬度
    const isDarkTheme = inject('isDarkTheme');
    const toggleTheme = inject('toggleTheme');
    const markdownEditorRef = ref(null);
    
    // 功能項目: 3.2.3 編輯器與文件系統連接
    const currentFilePath = computed(() => {
      console.log('Computing currentFilePath, route.params:', route.params);
      
      if (route.params.path) {
        const path = Array.isArray(route.params.path) 
          ? route.params.path.join('/') 
          : route.params.path;
          
        console.log('Resolved currentFilePath:', path);
        return path;
      }
      
      console.log('No path parameter found in route');
      return null;
    });
    
    const getFileName = (path) => {
      if (!path) return '';
      const parts = path.split('/');
      return parts[parts.length - 1];
    };
    
    // 功能項目: 3.3.3 編輯器與目錄樹大小調整
    const startResize = (e) => {
      e.preventDefault();
      
      const startX = e.clientX;
      const startWidth = sidebarWidth.value;
      
      const doDrag = (e) => {
        const newWidth = startWidth + e.clientX - startX;
        if (newWidth > 100 && newWidth < window.innerWidth / 2) {
          sidebarWidth.value = newWidth;
          document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        }
      };
      
      const stopDrag = () => {
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
      };
      
      document.addEventListener('mousemove', doDrag);
      document.addEventListener('mouseup', stopDrag);
    };
    
    // 監聽文件路徑變化
    watch(() => currentFilePath.value, (newPath, oldPath) => {
      console.log('EditorView: currentFilePath changed from', oldPath, 'to', newPath);
      if (newPath) {
        // 使用 nextTick 確保 DOM 已經更新
        nextTick(() => {
          console.log('EditorView: nextTick after currentFilePath change, markdownEditorRef:', markdownEditorRef.value ? 'available' : 'null');
          if (markdownEditorRef.value) {
            console.log('EditorView: Calling loadFile on markdownEditorRef');
            markdownEditorRef.value.loadFile(newPath);
          } else {
            console.error('EditorView: markdownEditorRef is still null after nextTick');
            // 再嘗試一次，使用更長的延遲
            setTimeout(() => {
              console.log('EditorView: setTimeout after currentFilePath change, markdownEditorRef:', markdownEditorRef.value ? 'available' : 'null');
              if (markdownEditorRef.value) {
                console.log('EditorView: Calling loadFile on markdownEditorRef after timeout');
                markdownEditorRef.value.loadFile(newPath);
              } else {
                console.error('EditorView: markdownEditorRef is still null after extended timeout');
              }
            }, 500);
          }
        });
      }
    }, { immediate: true });
    
    // 在組件渲染後才能訪問 ref
    onMounted(() => {
      console.log('EditorView: onMounted, currentFilePath:', currentFilePath.value);
      if (currentFilePath.value) {
        // 使用 nextTick 確保 DOM 已經更新
        nextTick(() => {
          console.log('EditorView: onMounted nextTick, markdownEditorRef:', markdownEditorRef.value ? 'available' : 'null');
          if (markdownEditorRef.value) {
            console.log('EditorView: onMounted, calling loadFile with', currentFilePath.value);
            markdownEditorRef.value.loadFile(currentFilePath.value);
          } else {
            console.error('EditorView: markdownEditorRef is null in onMounted nextTick');
            // 再嘗試一次，使用更長的延遲
            setTimeout(() => {
              console.log('EditorView: onMounted setTimeout, markdownEditorRef:', markdownEditorRef.value ? 'available' : 'null');
              if (markdownEditorRef.value) {
                console.log('EditorView: onMounted, calling loadFile with', currentFilePath.value, 'after timeout');
                markdownEditorRef.value.loadFile(currentFilePath.value);
              } else {
                console.error('EditorView: markdownEditorRef is still null in onMounted after timeout');
              }
            }, 1000);
          }
        });
      }
    });
    
    onMounted(() => {
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth.value}px`);
    });
    
    return {
      sidebarWidth,
      currentFilePath,
      isDarkTheme,
      toggleTheme,
      startResize,
      getFileName,
      markdownEditorRef
    };
  }
};
</script>

<style scoped>
.editor-view {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background-color: var(--primary-color);
  color: white;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
}

.resizer {
  width: 5px;
  height: 100%;
  background-color: var(--border-color);
  cursor: col-resize;
}

.content {
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.header {
  height: var(--header-height);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: var(--primary-color);
  color: white;
}

.theme-toggle {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: white;
}

.editor-container {
  flex: 1;
  overflow: auto;
}

.welcome {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 20px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .editor-view {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .resizer {
    width: 100%;
    height: 5px;
    cursor: row-resize;
  }
}
</style>
