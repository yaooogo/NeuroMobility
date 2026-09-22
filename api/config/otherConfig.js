export const OTHER_SYS_CONFIG_NAME = 'other_config';

const DEFAULT_OTHER_CONFIG = Object.freeze({
  platform_operated_vehicles: 1258,
  virtual_users: 56320
});

export function getDefaultOtherConfig() {
  return { ...DEFAULT_OTHER_CONFIG };
}

export function normalizeOtherConfig(config) {
  const defaults = getDefaultOtherConfig();
  const platformOperatedVehicles = Number(config?.platform_operated_vehicles ?? config?.platformOperatedVehicles);
  const virtualUsers = Number(config?.virtual_users ?? config?.virtualUsers);
  return {
    platform_operated_vehicles: Number.isSafeInteger(platformOperatedVehicles) && platformOperatedVehicles >= 0
      ? platformOperatedVehicles
      : defaults.platform_operated_vehicles,
    virtual_users: Number.isSafeInteger(virtualUsers) && virtualUsers >= 0
      ? virtualUsers
      : defaults.virtual_users
  };
}

export function validateOtherConfig(config) {
  const platformOperatedVehicles = Number(config?.platform_operated_vehicles ?? config?.platformOperatedVehicles);
  const virtualUsers = Number(config?.virtual_users ?? config?.virtualUsers);
  if (!Number.isSafeInteger(platformOperatedVehicles) || platformOperatedVehicles < 0) {
    throw new Error('平台运营车辆必须为非负整数');
  }
  if (!Number.isSafeInteger(virtualUsers) || virtualUsers < 0) {
    throw new Error('虚拟用户必须为非负整数');
  }
  return { platform_operated_vehicles: platformOperatedVehicles, virtual_users: virtualUsers };
}
