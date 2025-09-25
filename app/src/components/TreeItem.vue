<!-- 功能項目: 3.1.2 文件夾展開/折疊功能 -->
<template>
  <div class="tree-node">
    <div 
      class="tree-item" 
      :class="{ active: isActive }"
      @click="handleClick"
      @contextmenu="$emit('context-menu', $event, item)"
    >
      <span class="tree-item-icon">
        <template v-if="item.type === 'directory'">
          <span v-if="isOpen">📂</span>
          <span v-else>📁</span>
        </template>
        <span v-else>📄</span>
      </span>
      <span class="tree-item-name">{{ item.name }}</span>
    </div>
    
    <div v-if="item.type === 'directory' && isOpen" class="tree-item-children">
      <tree-item
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        @select="$emit('select', $event)"
        @context-menu="$emit('context-menu', $event, child)"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'TreeItem',
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  emits: ['select', 'context-menu'],
  setup(props, { emit }) {
    const route = useRoute();
    const isOpen = ref(true); // 默認展開目錄
    
    const isActive = computed(() => {
      if (props.item.type === 'file') {
        const currentPath = decodeURIComponent(route.params.path?.join('/') || '');
        return props.item.path === currentPath;
      }
      return false;
    });
    
    const handleClick = () => {
      if (props.item.type === 'directory') {
        isOpen.value = !isOpen.value;
      } else {
        emit('select', props.item);
      }
    };
    
    return {
      isOpen,
      isActive,
      handleClick
    };
  }
};
</script>

<style scoped>
.tree-node {
  width: 100%;
}

.tree-item {
  padding: 8px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: white;
}

.tree-item:hover {
  background-color: var(--hover-color);
}

.tree-item.active {
  background-color: var(--secondary-color);
}

.tree-item-icon {
  margin-right: 8px;
}

.tree-item-children {
  padding-left: 20px;
}
</style>
