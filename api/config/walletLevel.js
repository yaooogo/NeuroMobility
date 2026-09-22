export const WALLET_LEVEL_SYS_CONFIG_NAME = "wallet_level_rules";

const DEFAULT_WALLET_LEVEL_RULES = [
  { level: 3, min_price: 5000000, differential_percent: 0 },
  { level: 2, min_price: 2500000, differential_percent: 0 },
  { level: 1, min_price: 500000, differential_percent: 0 }
];

const FIXED_WALLET_LEVELS = DEFAULT_WALLET_LEVEL_RULES.map(rule => rule.level);

function cloneRule(rule) {
  return {
    level: Number(rule.level || 0),
    min_price: Number(rule.min_price || 0),
    differential_percent: Number(rule.differential_percent || 0)
  };
}

export function getDefaultWalletLevelRules() {
  return DEFAULT_WALLET_LEVEL_RULES.map(cloneRule);
}

export function normalizeWalletLevelRules(rules) {
  if (!Array.isArray(rules) || rules.length < 1) return getDefaultWalletLevelRules();
  const amountMap = new Map();
  const differentialPercentMap = new Map();
  for (const item of rules) {
    const level = Number.parseInt(item?.level, 10);
    const amount = Number(item?.min_price ?? item?.amount ?? item?.minSubRigs);
    if (!FIXED_WALLET_LEVELS.includes(level) || !Number.isFinite(amount) || amount < 0) continue;
    amountMap.set(level, amount);
    const differentialPercent = Number(item?.differential_percent ?? item?.differentialPercent ?? 0);
    if (Number.isFinite(differentialPercent) && differentialPercent >= 0 && differentialPercent <= 100) {
      differentialPercentMap.set(level, differentialPercent);
    }
  }
  return DEFAULT_WALLET_LEVEL_RULES.map(rule => ({
    level: rule.level,
    min_price: amountMap.has(rule.level) ? amountMap.get(rule.level) : rule.min_price,
    differential_percent: differentialPercentMap.has(rule.level)
      ? differentialPercentMap.get(rule.level)
      : rule.differential_percent
  }));
}

export function validateWalletLevelRules(rules) {
  if (!Array.isArray(rules) || rules.length !== FIXED_WALLET_LEVELS.length) {
    throw new Error('等级配置固定为 1、2、3 级');
  }

  const levels = rules.map(item => Number(item?.level));
  if (levels.some(level => !Number.isInteger(level))
    || new Set(levels).size !== FIXED_WALLET_LEVELS.length
    || FIXED_WALLET_LEVELS.some(level => !levels.includes(level))) {
    throw new Error('等级配置固定为 1、2、3 级，只能修改金额');
  }

  const hasInvalidAmount = rules.some((item) => {
    const amount = Number(item?.min_price ?? item?.amount ?? item?.minSubRigs);
    return !Number.isFinite(amount) || amount < 0;
  });
  if (hasInvalidAmount) throw new Error('金额必须为非负数');

  const hasInvalidDifferentialPercent = rules.some((item) => {
    const percent = Number(item?.differential_percent ?? item?.differentialPercent);
    return !Number.isFinite(percent) || percent < 0 || percent > 100;
  });
  if (hasInvalidDifferentialPercent) throw new Error('极差收益必须在 0% 到 100% 之间');

  const normalized = normalizeWalletLevelRules(rules);

  for (let i = 0; i < normalized.length - 1; i += 1) {
    const currentRule = normalized[i];
    const nextRule = normalized[i + 1];

    if (currentRule.min_price <= nextRule.min_price) {
      throw new Error(`等级 ${currentRule.level} 的金额必须高于等级 ${nextRule.level}`);
    }
  }

  return normalized;
}

export function buildWalletLevelCaseSql(totalRigsExpr, rules) {
  const normalized = normalizeWalletLevelRules(rules);
  const lines = ["CASE"];

  for (const rule of normalized) {
    lines.push(`WHEN ${totalRigsExpr} >= ${rule.min_price} THEN ${rule.level}`);
  }

  lines.push("ELSE 0");
  lines.push("END");

  return lines.join("\n      ");
}
