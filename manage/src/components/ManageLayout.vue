<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ManageSidebar from './ManageSidebar.vue';
import { clearAuth, getUser } from '../lib/auth.js';
import { post } from '../lib/http.js';

defineProps({ title: String, description: String });
const router = useRouter();
const user = ref(getUser());

async function logout() {
  try { await post('/logout'); } catch { /* 仍清除本地会话 */ }
  clearAuth();
  await router.replace('/login');
}
</script>

<template>
  <div class="admin-shell">
    <ManageSidebar />
    <main class="content-shell">
      <header class="content-header">
        <div><h1>{{ title }}</h1><p>{{ description }}</p></div>
        <div class="header-actions">
          <span class="profile-chip">{{ user?.name || user?.username || '管理员' }}</span>
          <button class="ghost-button" type="button" @click="logout">退出登录</button>
        </div>
      </header>
      <slot />
    </main>
  </div>
</template>
