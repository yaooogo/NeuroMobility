export function can(user, key) {
  return Number(user?.is_super || 0) === 1 || (Array.isArray(user?.permissions) && user.permissions.includes(key));
}

export function firstPage(user) {
  if (can(user, 'admins')) return '/admins';
  if (can(user, 'admin-types')) return '/admin-types';
  if (can(user, 'admin-operation-logs')) return '/operation-logs';
  if (can(user, 'asset-tokens')) return '/asset-tokens';
  if (can(user, 'user-asset-logs')) return '/asset-logs';
  if (can(user, 'user-frozen-asset-logs')) return '/frozen-asset-logs';
  if (can(user, 'parameter-config')) return '/parameter-config/levels';
  return '/no-permission';
}
