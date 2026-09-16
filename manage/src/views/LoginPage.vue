<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { post } from '../lib/http.js';
import { clearAuth, setToken, setUser } from '../lib/auth.js';
import { firstPage } from '../lib/permissions.js';

const router = useRouter();
const form = reactive({ username: '', password: '' });
const loading = ref(false);
const error = ref('');

async function login() {
  if (loading.value) return;
  error.value = '';
  loading.value = true;
  try {
    const data = await post('/login', form, { auth: false });
    setToken(data.token);
    const user = await post('/user/info');
    setUser(user);
    await router.replace(firstPage(user));
  } catch (err) {
    clearAuth();
    error.value = err.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-shell">
    <section class="login-card">
      <div class="login-brand">NeuroMobility</div>
      <h1>后台登录</h1>
      <p>使用管理员账号登录。</p>
      <form class="login-form" @submit.prevent="login">
        <label class="field-block"><span>账号</span><input v-model.trim="form.username" class="text-input" type="text" autocomplete="username" required placeholder="请输入管理员账号" /></label>
        <label class="field-block"><span>密码</span><input v-model="form.password" class="text-input" type="password" autocomplete="current-password" required placeholder="请输入密码" /></label>
        <div v-if="error" class="alert-box alert-box--error">{{ error }}</div>
        <button class="submit-button" type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
      </form>
    </section>
  </div>
</template>
