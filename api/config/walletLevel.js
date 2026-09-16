export const WALLET_LEVEL_SYS_CONFIG_NAME = "wallet_level_rules";

const DEFAULT_WALLET_LEVEL_RULES = [
  { level: 3, min_price: 5000000 },
  { level: 2, min_price: 2500000 },
  { level: 1, min_price: 500000 }
];

function cloneRule(rule) {
  return {
    level: Number(rule.level || 0),
    min_price: Number(rule.min_price || 0)
  };
}

export function getDefaultWalletLevelRules() {
  return DEFAULT_WALLET_LEVEL_RULES.map(cloneRule);
}

export function normalizeWalletLevelRules(rules) {
  if (!Array.isArray(rules) || rules.length < 1) return getDefaultWalletLevelRules();
  const levelMap = new Map();
  for (const item of rules.slice(0, 100)) {
    const level = Number.parseInt(item?.level, 10);
    const amount = Number(item?.min_price ?? item?.amount ?? item?.minSubRigs);
    if (!Number.isInteger(level) || level < 1 || level > 999 || !Number.isFinite(amount) || amount < 0) continue;
    levelMap.set(level, { level, min_price: amount });
  }
  return [...levelMap.values()].sort((a, b) => b.level - a.level).map(cloneRule);
}

export function validateWalletLevelRules(rules) {
  if (!Array.isArray(rules) || rules.length < 1) throw new Error('至少需要配置一个等级');
  const normalized = normalizeWalletLevelRules(rules);

  if (normalized.length !== rules.length) throw new Error('等级必须唯一且为 1-999，金额必须为非负数');

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
