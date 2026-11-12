import { subtractPercent } from './PerformanceAssessment.js';
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
      level,
      effectivePercent: subtractPercent(rulePercent(level), ancestor[`deduction_${percentField}`] || 0)
    });
  }

  let lowerLevelPercent = 0n;
  const rewards = [];
  for (const recipient of [...recipientsByLevel.values()].sort((a, b) => a.level - b.level)) {
    const configuredPercent = recipient.effectivePercent;
    const rewardPercent = configuredPercent > lowerLevelPercent
      ? configuredPercent - lowerLevelPercent
      : 0n;
    if (configuredPercent > lowerLevelPercent) lowerLevelPercent = configuredPercent;
    if (recipient.wallet) rewards.push({ ...recipient, percent: rewardPercent });
  }
  return rewards;

  function rulePercent(level) {
    const raw = rulesByLevel.get(level) || 0n;
    return `${raw / 10000n}.${String(raw % 10000n).padStart(4, '0')}`;
  }
}
