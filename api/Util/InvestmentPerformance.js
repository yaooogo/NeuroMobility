// Only the USDT principal contributes to an ancestor's team performance.
// Use the order's saved ratio and round down to the smallest investment unit.
export function investmentPerformanceSql(alias = 'investment') {
  return `CASE WHEN ${alias}.token='USDT' THEN ${alias}.amount
    WHEN ${alias}.token='USDT+RUSD'
      THEN FLOOR(${alias}.amount * ${alias}.mixed_usdt_percent / 100)
    ELSE 0 END`;
}
