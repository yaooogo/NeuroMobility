import { createRouter, createWebHistory } from 'vue-router';
import { clearAuth, getToken, getUser, setUser } from '../lib/auth.js';
import { post } from '../lib/http.js';
import { can, firstPage } from '../lib/permissions.js';
import LoginPage from '../views/LoginPage.vue';
import AdminsPage from '../views/AdminsPage.vue';
import AdminTypesPage from '../views/AdminTypesPage.vue';
import OperationLogsPage from '../views/OperationLogsPage.vue';
import AssetTokensPage from '../views/AssetTokensPage.vue';
import AssetLogsPage from '../views/AssetLogsPage.vue';
import LevelConfigPage from '../views/LevelConfigPage.vue';
import NoPermissionPage from '../views/NoPermissionPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: () => firstPage(getUser()) },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/admins', component: AdminsPage, meta: { permission: 'admins' } },
    { path: '/admin-types', component: AdminTypesPage, meta: { permission: 'admin-types' } },
    { path: '/operation-logs', component: OperationLogsPage, meta: { permission: 'admin-operation-logs' } },
    { path: '/asset-tokens', component: AssetTokensPage, meta: { permission: 'asset-tokens' } },
    { path: '/asset-logs', component: AssetLogsPage, props: { frozen: false }, meta: { permission: 'user-asset-logs' } },
    { path: '/frozen-asset-logs', component: AssetLogsPage, props: { frozen: true }, meta: { permission: 'user-frozen-asset-logs' } },
    { path: '/parameter-config/levels', component: LevelConfigPage, meta: { permission: 'parameter-config' } },
    { path: '/no-permission', component: NoPermissionPage },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

router.beforeEach(async (to) => {
  if (!getToken()) return to.name === 'login' ? true : '/login';
  let user;
  try {
    user = await post('/user/info');
    setUser(user);
  } catch {
    clearAuth();
    return '/login';
  }
  if (to.name === 'login') return firstPage(user);
  if (to.meta.permission && !can(user, to.meta.permission)) return firstPage(user);
  return true;
});

export default router;
