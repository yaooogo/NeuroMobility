export function validatePerformanceDeductions(rules) {
  if (!Array.isArray(rules)) throw new Error('业绩不足扣减配置格式不正确');
  const seen = new Set();
  return rules.map(item => {
    if (!item || ![1,2,3].includes(Number(item.level))) throw new Error('扣减等级必须为1至3级');
    const row = { level: Number(item.level) };
    for (const key of ['target_amount','differential_percent','expansion_reward_percent','bonus_percent','direct_dividend_reward_percent']) {
      const value = key === 'direct_dividend_reward_percent' && item[key] === undefined ? 0 : item[key];
      if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || (key !== 'target_amount' && Number(value) > 100)) throw new Error('达标金额必须为非负数，扣减比例必须在0%至100%之间');
      row[key] = Number(value);
    }
    const key = row.level + ':' + row.target_amount;
    if (seen.has(key)) throw new Error('同一等级和达标金额不能重复配置');
    seen.add(key);
    return row;
  });
}
