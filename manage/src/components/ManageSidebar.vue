<script setup>
import { getUser } from '../lib/auth.js';
import { can } from '../lib/permissions.js';

const user = getUser();
</script>

<template>
  <aside class="sidebar-card">
    <div>
      <div class="sidebar-brand">NEURO</div>
      <p class="sidebar-caption">Manage Console</p>
    </div>
    <nav class="menu-list">
      <router-link v-if="can(user, 'wallets')" class="menu-item" active-class="menu-item--active" to="/wallets">钱包管理</router-link>
      <router-link v-if="can(user, 'wallet-assets')" class="menu-item" active-class="menu-item--active" to="/wallet-assets">钱包资产管理</router-link>
      <router-link v-if="can(user, 'asset-tokens')" class="menu-item" active-class="menu-item--active" to="/asset-tokens">资产类型</router-link>
      <router-link v-if="can(user, 'user-asset-logs')" class="menu-item" active-class="menu-item--active" to="/asset-logs">资产变更记录</router-link>
      <router-link v-if="can(user, 'user-frozen-asset-logs')" class="menu-item" active-class="menu-item--active" to="/frozen-asset-logs">冻结资产变更记录</router-link>
      <router-link v-if="can(user, 'announcements')" class="menu-item" active-class="menu-item--active" to="/announcements">公告管理</router-link>
      <router-link v-if="can(user, 'admins')" class="menu-item" active-class="menu-item--active" to="/admins">管理员</router-link>
      <router-link v-if="can(user, 'admin-types')" class="menu-item" active-class="menu-item--active" to="/admin-types">管理员类型</router-link>
      <router-link v-if="can(user, 'admin-operation-logs')" class="menu-item" active-class="menu-item--active" to="/operation-logs">操作日志</router-link>
      <router-link v-if="can(user, 'parameter-config')" class="menu-item" active-class="menu-item--active" to="/parameter-config/levels">参数配置</router-link>
    </nav>
  </aside>
</template>
