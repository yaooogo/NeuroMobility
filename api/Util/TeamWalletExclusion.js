// Exclude only the listed wallets, preserving their descendants in team results.
export function teamWalletExclusion(searchTeam, value) {
  if (!searchTeam) return { sql: '', bindings: [] };
  const values = Array.isArray(value) ? value : [value];
  const wallets = [...new Set(values.flatMap(item => String(item || '').split(/[\s,，;；]+/u))
    .map(item => item.trim().toLowerCase()).filter(Boolean))];
  return {
    sql: wallets.length ? `LOWER(wallet) NOT IN (${wallets.map(() => '?').join(',')})` : '',
    bindings: wallets
  };
}

export function applyTeamWalletExclusion(query, searchTeam, value) {
  const exclusion = teamWalletExclusion(searchTeam, value);
  if (exclusion.sql) query.whereRaw(exclusion.sql, exclusion.bindings);
  return query;
}
