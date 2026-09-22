export const LEVEL_REWARD_PERCENT_DECIMALS = 4;
export const LEVEL_REWARD_PERCENT_DENOMINATOR = 100n * (10n ** BigInt(LEVEL_REWARD_PERCENT_DECIMALS));

function scaledPercent(value) {
  const text = String(value ?? '0').trim();
  if (!/^\d+(?:\.\d+)?$/u.test(text)) return 0n;
  const [integer, fraction = ''] = text.split('.');
  return BigInt(`${integer}${fraction.slice(0, LEVEL_REWARD_PERCENT_DECIMALS).padEnd(LEVEL_REWARD_PERCENT_DECIMALS, '0')}`);
}

export function calculateLevelRewardRates(ancestors, levelRules, percentField) {
  const rulesByLevel = new Map((levelRules || []).map(rule => [
    Number(rule.level || 0),
    scaledPercent(rule?.[percentField] || '0')
  ]));
  const recipientsByLevel = new Map();
  for (const ancestor of ancestors || []) {
    const level = Number(ancestor.is_manual_level) === 1
      ? Number(ancestor.manual_level || 0)
      : Number(ancestor.level || 0);
    if (!rulesByLevel.has(level) || recipientsByLevel.has(level)) continue;
    recipientsByLevel.set(level, {
      wallet: String(ancestor.wallet || ancestor.inviter || '').trim().toLowerCase(),
      level
    });
  }

  let lowerLevelPercentTotal = 0n;
  const rewards = [];
  for (const recipient of [...recipientsByLevel.values()].sort((a, b) => a.level - b.level)) {
    const configuredPercent = rulesByLevel.get(recipient.level) || 0n;
    const rewardPercent = configuredPercent > lowerLevelPercentTotal
      ? configuredPercent - lowerLevelPercentTotal
      : 0n;
    lowerLevelPercentTotal += configuredPercent;
    if (recipient.wallet) rewards.push({ ...recipient, percent: rewardPercent });
  }
  return rewards;
}
