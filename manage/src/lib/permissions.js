export function can(user, key) {
  return Number(user?.is_super || 0) === 1 || (Array.isArray(user?.permissions) && user.permissions.includes(key));
}

export function firstPage(user) {
  if (can(user, 'overview')) return '/overview';
  if (can(user, 'wallets')) return '/wallets';
  if (can(user, 'wallet-network')) return '/wallet-network';
  if (can(user, 'wallet-assets')) return '/wallet-assets';
  if (can(user, 'deposit-orders')) return '/deposit-orders';
  if (can(user, 'withdrawal-orders')) return '/withdrawal-orders';
  if (can(user, 'investment-orders')) return '/investment-orders';
  if (can(user, 'position-salary-records')) return '/position-salary-records';
  if (can(user, 'help-articles')) return '/help-articles';
  if (can(user, 'announcements')) return '/announcements';
  if (can(user, 'about')) return '/about';
  if (can(user, 'vehicles')) return '/vehicles';
  if (can(user, 'admins')) return '/admins';
  if (can(user, 'admin-types')) return '/admin-types';
  if (can(user, 'admin-operation-logs')) return '/operation-logs';
  if (can(user, 'asset-tokens')) return '/asset-tokens';
  if (can(user, 'user-asset-logs')) return '/asset-logs';
  if (can(user, 'user-frozen-asset-logs')) return '/frozen-asset-logs';
  if (can(user, 'parameter-config')) return '/parameter-config/levels';
  return '/no-permission';
}
