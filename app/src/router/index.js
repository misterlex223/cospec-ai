// 功能項目: 3.3.1 響應式設計
import { createRouter, createWebHistory } from 'vue-router';
import EditorView from '../views/EditorView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: EditorView
    },
    {
      path: '/edit/:path*',
      name: 'edit',
      component: EditorView,
      props: true
    }
  ]
});

export default router;
