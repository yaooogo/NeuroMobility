// Integer arithmetic keeps the distributed total exact at the USDT token precision.
export function allocatePerShareDividend(rate, holders, stockDecimals) {
  rate = BigInt(rate);
  if (rate <= 0n || !holders.length) throw new Error('每股金额及全网股份必须大于0');
  const unit = 10n ** BigInt(stockDecimals);
  const items = holders.map(row => ({ ...row, amount: rate * BigInt(row.shares) / unit }));
  if (!items.some(row => row.amount > 0n)) throw new Error('分红金额低于 USDT 最小精度');
  return items;
}
export function allocateStockDividend(total, holders) {
  total = BigInt(total);
  const shares = holders.reduce((sum, row) => sum + BigInt(row.shares), 0n);
  if (total <= 0n || shares <= 0n) throw new Error('分红金额及全网股份必须大于0');
  const items = holders.map(row => ({ ...row, amount: total * BigInt(row.shares) / shares,
    remainder: total * BigInt(row.shares) % shares }));
  let remaining = total - items.reduce((sum, row) => sum + row.amount, 0n);
  const ranked = [...items].sort((a, b) => a.remainder === b.remainder ? a.wallet.localeCompare(b.wallet) : a.remainder > b.remainder ? -1 : 1);
  for (const row of ranked) { if (!remaining) break; row.amount++; remaining--; }
  return items;
}
