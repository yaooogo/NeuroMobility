<script setup>
import { useRouter } from 'vue-router';
import { clearAuth } from '../lib/auth.js';
const router = useRouter();
function logout() { clearAuth(); router.replace('/login'); }
</script>
<template><div class="empty-permission-shell"><section class="login-card"><h1>暂无后台权限</h1><p>请联系管理员分配管理员或管理员类型权限。</p><button class="ghost-button" type="button" style="margin-top: 24px" @click="logout">退出登录</button></section></div></template>
