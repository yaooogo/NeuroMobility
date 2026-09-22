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
import WalletsPage from '../views/WalletsPage.vue';
import WalletAssetsPage from '../views/WalletAssetsPage.vue';
import AnnouncementsPage from '../views/AnnouncementsPage.vue';
import HelpArticlesPage from '../views/HelpArticlesPage.vue';
import AboutPage from '../views/AboutPage.vue';
import VehiclesPage from '../views/VehiclesPage.vue';
import DepositOrdersPage from '../views/DepositOrdersPage.vue';
import WithdrawalOrdersPage from '../views/WithdrawalOrdersPage.vue';
import OverviewPage from '../views/OverviewPage.vue';
import WalletNetworkPage from '../views/WalletNetworkPage.vue';
import InvestmentOrdersPage from '../views/InvestmentOrdersPage.vue';
import PositionSalaryRecordsPage from '../views/PositionSalaryRecordsPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: () => firstPage(getUser()) },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/overview', component: OverviewPage, meta: { permission: 'overview' } },
    { path: '/admins', component: AdminsPage, meta: { permission: 'admins' } },
    { path: '/admin-types', component: AdminTypesPage, meta: { permission: 'admin-types' } },
    { path: '/operation-logs', component: OperationLogsPage, meta: { permission: 'admin-operation-logs' } },
    { path: '/asset-tokens', component: AssetTokensPage, meta: { permission: 'asset-tokens' } },
    { path: '/wallets', component: WalletsPage, meta: { permission: 'wallets' } },
    { path: '/wallet-network', component: WalletNetworkPage, meta: { permission: 'wallet-network' } },
    { path: '/wallet-assets', component: WalletAssetsPage, meta: { permission: 'wallet-assets' } },
    { path: '/deposit-orders', component: DepositOrdersPage, meta: { permission: 'deposit-orders' } },
    { path: '/withdrawal-orders', component: WithdrawalOrdersPage, meta: { permission: 'withdrawal-orders' } },
    { path: '/investment-orders', component: InvestmentOrdersPage, meta: { permission: 'investment-orders' } },
    { path: '/position-salary-records', component: PositionSalaryRecordsPage, meta: { permission: 'position-salary-records' } },
    { path: '/announcements', component: AnnouncementsPage, meta: { permission: 'announcements' } },
    { path: '/help-articles', component: HelpArticlesPage, meta: { permission: 'help-articles' } },
    { path: '/about', component: AboutPage, meta: { permission: 'about' } },
    { path: '/vehicles', component: VehiclesPage, meta: { permission: 'vehicles' } },
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
