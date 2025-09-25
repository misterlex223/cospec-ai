<!-- 功能項目: 3.1.1 顯示目錄結構 -->
<template>
  <div class="file-tree">
    <div class="file-tree-header">
      <h3>文件瀏覽器</h3>
      <button @click="createNewFile" class="btn-new-file">新建文件</button>
    </div>
    <div class="file-tree-content">
      <template v-if="fileStore.isLoading && !fileStore.files.length">
        <div class="loading">加載中...</div>
      </template>
      <template v-else-if="fileStore.error && !fileStore.files.length">
        <div class="error">{{ fileStore.error }}</div>
      </template>
      <template v-else-if="!fileStore.fileTree.length">
        <div class="empty">沒有找到 Markdown 文件</div>
      </template>
      <template v-else>
        <tree-item
          v-for="item in fileStore.fileTree"
          :key="item.path"
          :item="item"
          @select="selectItem"
          @context-menu="showContextMenu"
        />
      </template>
    </div>
    
    <!-- 功能項目: 3.1.4 右鍵菜單操作 -->
    <div v-if="contextMenu.show" class="context-menu" :style="contextMenuStyle">
      <div v-if="contextMenu.item.type === 'file'" class="context-menu-item" @click="renameItem">重命名</div>
      <div v-if="contextMenu.item.type === 'file'" class="context-menu-item" @click="deleteItem">刪除</div>
      <div v-if="contextMenu.item.type === 'directory'" class="context-menu-item" @click="createFileInDir">新建文件</div>
    </div>
    
    <!-- 重命名對話框 -->
    <div v-if="showRenameDialog" class="dialog-overlay">
      <div class="dialog">
        <h3>重命名文件</h3>
        <input v-model="newFileName" type="text" class="dialog-input" />
        <div class="dialog-buttons">
          <button @click="confirmRename" class="dialog-button primary">確定</button>
          <button @click="showRenameDialog = false" class="dialog-button">取消</button>
        </div>
      </div>
    </div>
    
    <!-- 新建文件對話框 -->
    <div v-if="showNewFileDialog" class="dialog-overlay">
      <div class="dialog">
        <h3>新建文件</h3>
        <input v-model="newFileName" type="text" class="dialog-input" placeholder="file.md" />
        <div class="dialog-buttons">
          <button @click="confirmCreateFile" class="dialog-button primary">確定</button>
          <button @click="showNewFileDialog = false" class="dialog-button">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFileStore } from '../stores/fileStore';
import TreeItem from './TreeItem.vue';

export default {
  name: 'FileTree',
  components: {
    TreeItem
  },
  setup() {
    const fileStore = useFileStore();
    const router = useRouter();
    
    // 功能項目: 3.1.4 右鍵菜單操作
    const contextMenu = ref({
      show: false,
      x: 0,
      y: 0,
      item: null
    });
    
    const contextMenuStyle = computed(() => ({
      top: `${contextMenu.value.y}px`,
      left: `${contextMenu.value.x}px`
    }));
    
    // 功能項目: 3.1.3 文件選擇功能
    const selectItem = (item) => {
      if (item.type === 'file') {
        router.push(`/edit/${encodeURIComponent(item.path)}`);
      }
    };
    
    const showContextMenu = (event, item) => {
      event.preventDefault();
      contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        item
      };
    };
    
    // 點擊其他地方關閉右鍵菜單
    const closeContextMenu = () => {
      contextMenu.value.show = false;
    };
    
    // 重命名相關
    const showRenameDialog = ref(false);
    const newFileName = ref('');
    const itemToRename = ref(null);
    
    const renameItem = () => {
      itemToRename.value = contextMenu.value.item;
      newFileName.value = itemToRename.value.name;
      showRenameDialog.value = true;
      closeContextMenu();
    };
    
    // 功能項目: 2.2.5 重命名文件
    const confirmRename = async () => {
      if (!newFileName.value.trim()) return;
      
      try {
        const oldPath = itemToRename.value.path;
        const pathParts = oldPath.split('/');
        pathParts.pop();
        const newPath = [...pathParts, newFileName.value].join('/');
        
        await fileStore.renameFile(oldPath, newPath);
        showRenameDialog.value = false;
      } catch (error) {
        console.error('Failed to rename file:', error);
      }
    };
    
    // 功能項目: 2.2.4 刪除文件
    const deleteItem = async () => {
      if (confirm(`確定要刪除 ${contextMenu.value.item.name} 嗎？`)) {
        try {
          await fileStore.deleteFile(contextMenu.value.item.path);
        } catch (error) {
          console.error('Failed to delete file:', error);
        }
      }
      closeContextMenu();
    };
    
    // 新建文件相關
    const showNewFileDialog = ref(false);
    const newFileDirectory = ref('');
    
    const createNewFile = () => {
      newFileDirectory.value = '';
      newFileName.value = '';
      showNewFileDialog.value = true;
    };
    
    const createFileInDir = () => {
      newFileDirectory.value = contextMenu.value.item.path;
      newFileName.value = '';
      showNewFileDialog.value = true;
      closeContextMenu();
    };
    
    // 功能項目: 2.2.3 創建新文件
    const confirmCreateFile = async () => {
      if (!newFileName.value.trim()) return;
      
      try {
        let filePath = newFileName.value;
        if (!filePath.endsWith('.md')) {
          filePath += '.md';
        }
        
        if (newFileDirectory.value) {
          filePath = `${newFileDirectory.value}/${filePath}`;
        }
        
        await fileStore.createFile(filePath, '# New File\n\nStart writing here...');
        router.push(`/edit/${encodeURIComponent(filePath)}`);
        showNewFileDialog.value = false;
      } catch (error) {
        console.error('Failed to create file:', error);
      }
    };
    
    onMounted(() => {
      document.addEventListener('click', closeContextMenu);
    });
    
    onUnmounted(() => {
      document.removeEventListener('click', closeContextMenu);
    });
    
    return {
      fileStore,
      contextMenu,
      contextMenuStyle,
      selectItem,
      showContextMenu,
      renameItem,
      deleteItem,
      createFileInDir,
      createNewFile,
      showRenameDialog,
      showNewFileDialog,
      newFileName,
      confirmRename,
      confirmCreateFile
    };
  }
};
</script>

<style scoped>
.file-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-tree-header {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.file-tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.loading, .error, .empty {
  padding: 15px;
  text-align: center;
}

.error {
  color: #e53e3e;
}

.btn-new-file {
  background-color: var(--secondary-color);
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog {
  background-color: white;
  padding: 20px;
  border-radius: 4px;
  width: 300px;
}

.dialog h3 {
  margin-bottom: 15px;
}

.dialog-input {
  width: 100%;
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
}

.dialog-button {
  padding: 5px 15px;
  margin-left: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.dialog-button.primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
}
</style>
