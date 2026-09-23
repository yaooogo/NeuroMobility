import ApiResult from '../../Util/ApiResult.js';
import Database from '../../Util/Database.js';
import DB from '../../Util/database/DB.js';
import { formatAssetAmount } from '../../Util/AssetAmount.js';
import { ensureInvestmentOrderTable } from '../../Util/InvestmentSchema.js';
import { toDappApiError } from '../../Util/DappApiMessage.js';

const INVESTMENT_DECIMALS = 18;

function address(value) {
  return String(value || '').trim().toLowerCase();
}

async function overview(req, res) {
  try {
    await ensureInvestmentOrderTable();
    const wallet = address(req.auth?.address());
    if (!wallet) return res.send(ApiResult.error(400, 'Invalid wallet address'));
    const prefix = Database.prefix('default') || '';
    const [summaryRows, directRows] = await Promise.all([
      DB.query().exec(
        `SELECT COUNT(DISTINCT LOWER(team.wallet)) AS team_count,
                COALESCE(SUM((
                  SELECT COALESCE(SUM(investment.amount), 0)
                  FROM ${prefix}investment_order AS investment
                  WHERE LOWER(investment.wallet)=LOWER(team.wallet)
                    AND investment.status IN (0, 1)
                )), 0) AS total_contribution
         FROM (
           SELECT DISTINCT relation.wallet
           FROM ${prefix}wallet_relation AS relation
           WHERE LOWER(relation.inviter)=?
         ) AS team`,
        [wallet]
      ),
      DB.query().exec(
        `SELECT member.wallet,
                member.created_at,
                COALESCE((
                  SELECT SUM(investment.amount)
                  FROM ${prefix}investment_order AS investment
                  WHERE LOWER(investment.wallet)=LOWER(member.wallet)
                    AND investment.status IN (0, 1)
                ), 0) AS amount,
                (
                  SELECT COUNT(DISTINCT LOWER(subordinate.wallet))
                  FROM ${prefix}wallet_relation AS subordinate
                  WHERE LOWER(subordinate.inviter)=LOWER(member.wallet)
                ) AS team_size
         FROM ${prefix}wallet_relation AS direct
         INNER JOIN ${prefix}wallet AS member
           ON LOWER(member.wallet)=LOWER(direct.wallet)
         WHERE LOWER(direct.inviter)=?
           AND direct.lv=1
         ORDER BY member.created_at DESC, member.id DESC`,
        [wallet]
      )
    ]);
    const summary = summaryRows?.[0] || {};
    return res.send(ApiResult.success({
      total_contribution: formatAssetAmount(summary.total_contribution || '0', INVESTMENT_DECIMALS),
      team_count: Number(summary.team_count || 0),
      records: (directRows || []).map(row => ({
        time: row.created_at || '',
        address: row.wallet || '',
        amount: formatAssetAmount(row.amount || '0', INVESTMENT_DECIMALS),
        team_size: Number(row.team_size || 0)
      }))
    }, 'Team data retrieved successfully'));
  } catch (error) {
    return res.send(ApiResult.exception(toDappApiError(error), 'TeamService.overview'));
  }
}

export default { overview };
