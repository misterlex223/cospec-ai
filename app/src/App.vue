<!-- 功能項目: 3.3.1 響應式設計 -->
<template>
  <div class="app-container" :class="{ 'dark-theme': isDarkTheme }">
    <router-view />
  </div>
</template>

<script>
import { ref, provide, onMounted } from 'vue';
import { useFileStore } from './stores/fileStore';

export default {
  name: 'App',
  setup() {
    const fileStore = useFileStore();
    const isDarkTheme = ref(false);
    
    // 功能項目: 3.3.2 主題切換
    const toggleTheme = () => {
      isDarkTheme.value = !isDarkTheme.value;
      localStorage.setItem('darkTheme', isDarkTheme.value);
    };
    
    // 提供主題切換功能給子組件
    provide('toggleTheme', toggleTheme);
    provide('isDarkTheme', isDarkTheme);
    
    onMounted(() => {
      // 從本地存儲中恢復主題設置
      const savedTheme = localStorage.getItem('darkTheme');
      if (savedTheme !== null) {
        isDarkTheme.value = savedTheme === 'true';
      }
      
      // 功能項目: 2.1.3 監控文件變更
      fileStore.fetchFiles();
      fileStore.startFileWatcher();
    });
    
    return {
      isDarkTheme
    };
  }
};
</script>

<style>
@import './assets/main.css';
</style>
