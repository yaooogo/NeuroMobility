export const GROWTH_REWARD_SYS_CONFIG_NAME = 'growth_reward_rules';

export function getDefaultGrowthRewardRules() {
  return [];
}

export function normalizeGrowthRewardRules(rules) {
  if (!Array.isArray(rules)) return getDefaultGrowthRewardRules();
  return rules.map(item => ({
    level: Number.parseInt(item?.level, 10),
    whole_vehicle_count: Number.parseInt(item?.whole_vehicle_count ?? item?.wholeVehicleCount, 10),
    bonus_percent: Number(item?.bonus_percent ?? item?.bonusPercent)
  })).filter(item => Number.isInteger(item.level)
    && item.level >= 1
    && item.level <= 3
    && Number.isSafeInteger(item.whole_vehicle_count)
    && item.whole_vehicle_count > 0
    && Number.isFinite(item.bonus_percent)
    && item.bonus_percent >= 0
    && item.bonus_percent <= 100);
}

export function validateGrowthRewardRules(rules) {
  if (!Array.isArray(rules)) throw new Error('成长奖励配置格式不正确');
  const normalized = normalizeGrowthRewardRules(rules);
  if (normalized.length !== rules.length) {
    throw new Error('成长奖励的等级须为 1-3 级，整车数须为正整数，加成须在 0% 到 100% 之间');
  }
  const keys = normalized.map(item => `${item.level}:${item.whole_vehicle_count}`);
  if (new Set(keys).size !== keys.length) throw new Error('同一等级和整车数不能重复配置');
  return normalized;
}
