export const INVESTMENT_SYS_CONFIG_NAME = "investment_config";

const DEFAULT_INVESTMENT_CONFIG = Object.freeze({
  waiting_period_days: 0,
  min_percent: 0,
  max_percent: 100,
  dividend_multiple: 1,
  dividend_min_percent: 0,
  dividend_max_percent: 100,
  exit_multiple: 1
});

export function getDefaultInvestmentConfig() {
  return { ...DEFAULT_INVESTMENT_CONFIG };
}

export function normalizeInvestmentConfig(config) {
  const defaults = getDefaultInvestmentConfig();
  const waitingPeriodDays = Number(config?.waiting_period_days ?? config?.waitingPeriodDays);
  const minPercent = Number(config?.min_percent ?? config?.minPercent);
  const maxPercent = Number(config?.max_percent ?? config?.maxPercent);
  const dividendMultiple = Number(config?.dividend_multiple ?? config?.dividendMultiple);
  const dividendMinPercent = Number(config?.dividend_min_percent ?? config?.dividendMinPercent);
  const dividendMaxPercent = Number(config?.dividend_max_percent ?? config?.dividendMaxPercent);
  const exitMultiple = Number(config?.exit_multiple ?? config?.exitMultiple);

  const normalized = {
    waiting_period_days: Number.isInteger(waitingPeriodDays) && waitingPeriodDays >= 0
      ? waitingPeriodDays
      : defaults.waiting_period_days,
    min_percent: Number.isFinite(minPercent) && minPercent >= 0 && minPercent <= 100
      ? minPercent
      : defaults.min_percent,
    max_percent: Number.isFinite(maxPercent) && maxPercent >= 0 && maxPercent <= 100
      ? maxPercent
      : defaults.max_percent,
    dividend_multiple: Number.isFinite(dividendMultiple) && dividendMultiple > 0
      ? dividendMultiple
      : defaults.dividend_multiple,
    dividend_min_percent: Number.isFinite(dividendMinPercent) && dividendMinPercent >= 0 && dividendMinPercent <= 100
      ? dividendMinPercent
      : defaults.dividend_min_percent,
    dividend_max_percent: Number.isFinite(dividendMaxPercent) && dividendMaxPercent >= 0 && dividendMaxPercent <= 100
      ? dividendMaxPercent
      : defaults.dividend_max_percent,
    exit_multiple: Number.isFinite(exitMultiple) && exitMultiple > 0
      ? exitMultiple
      : defaults.exit_multiple
  };

  if (normalized.min_percent > normalized.max_percent) {
    normalized.min_percent = defaults.min_percent;
    normalized.max_percent = defaults.max_percent;
  }
  if (normalized.dividend_min_percent > normalized.dividend_max_percent) {
    normalized.dividend_min_percent = defaults.dividend_min_percent;
    normalized.dividend_max_percent = defaults.dividend_max_percent;
  }

  return normalized;
}

export function validateInvestmentConfig(config) {
  const hasEmptyValue = [
    config?.waiting_period_days ?? config?.waitingPeriodDays,
    config?.min_percent ?? config?.minPercent,
    config?.max_percent ?? config?.maxPercent,
    config?.dividend_multiple ?? config?.dividendMultiple,
    config?.dividend_min_percent ?? config?.dividendMinPercent,
    config?.dividend_max_percent ?? config?.dividendMaxPercent,
    config?.exit_multiple ?? config?.exitMultiple
  ].some(value => value === null || typeof value === 'undefined' || String(value).trim() === '');
  if (hasEmptyValue) throw new Error('投资配置项不能为空');

  const waitingPeriodDays = Number(config?.waiting_period_days ?? config?.waitingPeriodDays);
  const minPercent = Number(config?.min_percent ?? config?.minPercent);
  const maxPercent = Number(config?.max_percent ?? config?.maxPercent);
  const dividendMultiple = Number(config?.dividend_multiple ?? config?.dividendMultiple);
  const dividendMinPercent = Number(config?.dividend_min_percent ?? config?.dividendMinPercent);
  const dividendMaxPercent = Number(config?.dividend_max_percent ?? config?.dividendMaxPercent);
  const exitMultiple = Number(config?.exit_multiple ?? config?.exitMultiple);

  if (!Number.isInteger(waitingPeriodDays) || waitingPeriodDays < 0) {
    throw new Error('等待期必须为非负整数');
  }
  if (!Number.isFinite(minPercent) || !Number.isFinite(maxPercent)
    || minPercent < 0 || minPercent > 100 || maxPercent < 0 || maxPercent > 100) {
    throw new Error('分红百分比必须在 0% 到 100% 之间');
  }
  if (minPercent > maxPercent) {
    throw new Error('分红百分比起始值不能大于结束值');
  }
  if (!Number.isFinite(dividendMultiple) || dividendMultiple <= 0) {
    throw new Error('分红倍数必须大于 0');
  }
  if (!Number.isFinite(dividendMinPercent) || !Number.isFinite(dividendMaxPercent)
    || dividendMinPercent < 0 || dividendMinPercent > 100
    || dividendMaxPercent < 0 || dividendMaxPercent > 100) {
    throw new Error('分红百分比区间必须在 0% 到 100% 之间');
  }
  if (dividendMinPercent > dividendMaxPercent) {
    throw new Error('分红百分比区间起始值不能大于结束值');
  }
  if (!Number.isFinite(exitMultiple) || exitMultiple <= 0) {
    throw new Error('出局倍数必须大于 0');
  }

  return {
    waiting_period_days: waitingPeriodDays,
    min_percent: minPercent,
    max_percent: maxPercent,
    dividend_multiple: dividendMultiple,
    dividend_min_percent: dividendMinPercent,
    dividend_max_percent: dividendMaxPercent,
    exit_multiple: exitMultiple
  };
}
