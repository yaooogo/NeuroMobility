export const INVESTMENT_SYS_CONFIG_NAME = "investment_config";

const DEFAULT_INVESTMENT_CONFIG = Object.freeze({
  whole_vehicle_tier: 50000,
  minimum_investment_amount: 1000,
  waiting_period_days: 0,
  dividend_cycle_days: 30,
  min_percent: 0,
  max_percent: 100,
  dividend_multiple: 1,
  dividend_min_percent: 0,
  dividend_max_percent: 100,
  exit_multiple: 1,
  guaranteed_dividend_percent: 3
});

export function getDefaultInvestmentConfig() {
  return { ...DEFAULT_INVESTMENT_CONFIG };
}

export function normalizeInvestmentConfig(config) {
  const defaults = getDefaultInvestmentConfig();
  const wholeVehicleTier = Number(config?.whole_vehicle_tier ?? config?.wholeVehicleTier);
  const minimumInvestmentAmount = Number(config?.minimum_investment_amount ?? config?.minimumInvestmentAmount);
  const waitingPeriodDays = Number(config?.waiting_period_days ?? config?.waitingPeriodDays);
  const dividendCycleDays = Number(config?.dividend_cycle_days ?? config?.dividendCycleDays);
  const minPercent = Number(config?.min_percent ?? config?.minPercent);
  const maxPercent = Number(config?.max_percent ?? config?.maxPercent);
  const dividendMultiple = Number(config?.dividend_multiple ?? config?.dividendMultiple);
  const dividendMinPercent = Number(config?.dividend_min_percent ?? config?.dividendMinPercent);
  const dividendMaxPercent = Number(config?.dividend_max_percent ?? config?.dividendMaxPercent);
  const exitMultiple = Number(config?.exit_multiple ?? config?.exitMultiple);
  const guaranteedDividendPercent = Number(config?.guaranteed_dividend_percent ?? config?.guaranteedDividendPercent);

  const normalized = {
    whole_vehicle_tier: Number.isFinite(wholeVehicleTier) && wholeVehicleTier > 0
      ? wholeVehicleTier
      : defaults.whole_vehicle_tier,
    minimum_investment_amount: Number.isInteger(minimumInvestmentAmount) && minimumInvestmentAmount > 0
      ? minimumInvestmentAmount
      : defaults.minimum_investment_amount,
    waiting_period_days: Number.isInteger(waitingPeriodDays) && waitingPeriodDays >= 0
      ? waitingPeriodDays
      : defaults.waiting_period_days,
    dividend_cycle_days: Number.isInteger(dividendCycleDays) && dividendCycleDays > 0
      ? dividendCycleDays
      : defaults.dividend_cycle_days,
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
      : defaults.exit_multiple,
    guaranteed_dividend_percent: Number.isFinite(guaranteedDividendPercent)
      && guaranteedDividendPercent >= 0 && guaranteedDividendPercent <= 100
      ? guaranteedDividendPercent
      : defaults.guaranteed_dividend_percent
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
    config?.whole_vehicle_tier ?? config?.wholeVehicleTier,
    config?.minimum_investment_amount ?? config?.minimumInvestmentAmount,
    config?.waiting_period_days ?? config?.waitingPeriodDays,
    config?.dividend_cycle_days ?? config?.dividendCycleDays,
    config?.min_percent ?? config?.minPercent,
    config?.max_percent ?? config?.maxPercent,
    config?.dividend_multiple ?? config?.dividendMultiple,
    config?.dividend_min_percent ?? config?.dividendMinPercent,
    config?.dividend_max_percent ?? config?.dividendMaxPercent,
    config?.exit_multiple ?? config?.exitMultiple,
    config?.guaranteed_dividend_percent ?? config?.guaranteedDividendPercent
  ].some(value => value === null || typeof value === 'undefined' || String(value).trim() === '');
  if (hasEmptyValue) throw new Error('投资配置项不能为空');

  const wholeVehicleTier = Number(config?.whole_vehicle_tier ?? config?.wholeVehicleTier);
  const minimumInvestmentAmount = Number(config?.minimum_investment_amount ?? config?.minimumInvestmentAmount);
  const waitingPeriodDays = Number(config?.waiting_period_days ?? config?.waitingPeriodDays);
  const dividendCycleDays = Number(config?.dividend_cycle_days ?? config?.dividendCycleDays);
  const minPercent = Number(config?.min_percent ?? config?.minPercent);
  const maxPercent = Number(config?.max_percent ?? config?.maxPercent);
  const dividendMultiple = Number(config?.dividend_multiple ?? config?.dividendMultiple);
  const dividendMinPercent = Number(config?.dividend_min_percent ?? config?.dividendMinPercent);
  const dividendMaxPercent = Number(config?.dividend_max_percent ?? config?.dividendMaxPercent);
  const exitMultiple = Number(config?.exit_multiple ?? config?.exitMultiple);
  const guaranteedDividendPercent = Number(config?.guaranteed_dividend_percent ?? config?.guaranteedDividendPercent);

  if (!Number.isFinite(wholeVehicleTier) || wholeVehicleTier <= 0) {
    throw new Error('整车挡位必须大于 0');
  }
  if (!Number.isInteger(minimumInvestmentAmount) || minimumInvestmentAmount <= 0) {
    throw new Error('最低投资金额必须为正整数');
  }
  if (!Number.isInteger(waitingPeriodDays) || waitingPeriodDays < 0) {
    throw new Error('等待期必须为非负整数');
  }
  if (!Number.isInteger(dividendCycleDays) || dividendCycleDays <= 0) {
    throw new Error('分红周期必须为正整数');
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
  if (!Number.isFinite(guaranteedDividendPercent)
    || guaranteedDividendPercent < 0 || guaranteedDividendPercent > 100) {
    throw new Error('保底分红必须在 0% 到 100% 之间');
  }

  return {
    whole_vehicle_tier: wholeVehicleTier,
    minimum_investment_amount: minimumInvestmentAmount,
    waiting_period_days: waitingPeriodDays,
    dividend_cycle_days: dividendCycleDays,
    min_percent: minPercent,
    max_percent: maxPercent,
    dividend_multiple: dividendMultiple,
    dividend_min_percent: dividendMinPercent,
    dividend_max_percent: dividendMaxPercent,
    exit_multiple: exitMultiple,
    guaranteed_dividend_percent: guaranteedDividendPercent
  };
}
