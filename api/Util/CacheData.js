import {RedisCache} from "./Cache.js"
import DB from "./database/DB.js"
import {
    WALLET_LEVEL_SYS_CONFIG_NAME,
    getDefaultWalletLevelRules,
    normalizeWalletLevelRules
} from "../config/walletLevel.js"
import {
    INVESTMENT_SYS_CONFIG_NAME,
    getDefaultInvestmentConfig,
    normalizeInvestmentConfig
} from "../config/investmentConfig.js"

export default {

    // 获取缓存键值
    getCacheKey(key, userId) {
        if (userId) {
            key += `:${userId}`
        }
        return key
    },

    // 删除缓存信息
    async removeValue(key, userId) {
        let cacheKey = this.getCacheKey(key, userId)
        await RedisCache.delete(cacheKey)
    },

    // 获取信息。默认先从缓存中获取，取不到时再从表中获取
    async getValue(key, userId, callback, tts) {
        let cacheKey = this.getCacheKey(key, userId)
        let value = await RedisCache.get(cacheKey)
        if (value == undefined || value == null) {
            if (typeof(callback) == 'function') {
                value = await callback(userId)
                await RedisCache.set(cacheKey, value, tts)
            }
        }
        return value
    },

   

    // 删除缓存信息 - 支持的资产链列表
    async removeAssetsChains() {
        await this.removeValue(`Config:AssetsChains`, 0)
    },

    // 获取信息 - 支持的资产链列表
    async getAssetsChains() {
        return this.getValue(`Config:AssetsChains`, 0, async function (userId) {
            const rows = await DB.query()
                .table('assets_chains')
                .select('id', 'name', 'icon', 'type', 'chain_id', 'tx_view_url')
                .where('status', 1)
                .orderBy('sort', 'asc')
                .get()
            return rows
        }, 600)
    },

    // 删除缓存信息 - 支持的资产代币列表
    async removeAssetsTokens() {
        await this.removeValue(`Config:AssetsTokens`, 0)
    },

    // 获取信息 - 支持的资产代币列表
    async getAssetsTokens() {
        return this.getValue(`Config:AssetsTokens`, 0, async function (userId) {
            const columns = [
                'id', 'symbol', 'name', 'decimals', 'contract', 'icon',
                 'recharge_min_amount','rechargeable','withdrawable','withdraw_service_type', 'withdraw_service_fee','withdraw_min_amount','withdraw_daily_limit',
            ]
            const rows = await DB.query()
                .table('assets_tokens')
                .select(columns)
                .where('status', 1)
                .orderBy('sort', 'asc')
                .get()
            return rows
        }, 600)
    },

    // 删除缓存信息 - 链类型
    async removeChainInfo(chainCode) {
        await this.removeValue(`Config:ChainInfo`, chainCode)
    },

    // 获取信息 - 链类型
    async getChainInfo(chainCode) {
        return this.getValue(`Config:ChainInfo`, chainCode, async function (chainCode) {
            const columns = [
                'id', 'name', 'icon', 'type', 'chain_id',
                'tx_view_url', 'sort', 'status',
            ]
            const row = await DB.query()
                .table('assets_chains')
                .select(columns)
                .where('status', 1)
                .where('id', chainCode)
                .first()
            return row
        }, 600)
    },

    // 删除缓存信息 - 链系统配置
    async removeSysConfig(name) {
        await this.removeValue(`Config:SysConfig`, name)
    },

    // 获取信息 - 链系统配置
    async getSysConfig(name, valueType = 'string', defaultValue = null) {
        let row = await this.getValue(`Config:SysConfig`, name, async function (name) {
            return await DB.query()
                .table('sys_config')
                .select('id', 'name', 'value')
                .where('name', name)
                .first()
        }, 600)

        if (row && row.value != null && row.value != undefined) {
            valueType = valueType ? valueType.trim().toLowerCase() : ''
            if (valueType == 'int' || valueType == 'integer') {
                row.value = parseInt(row.value)
                if (isNaN(row.value)) {
                    row.value = defaultValue
                }
            } else if (valueType == 'float' || valueType == 'double') {
                row.value = parseFloat(row.value)
                if (isNaN(row.value)) {
                    row.value = defaultValue
                }
            } else if (valueType == 'object' || valueType == 'json') {
                try {
                    row.value = row.value ? JSON.parse(row.value) : defaultValue
                } catch (err) {
                    console.log(`[CacheData] getSysConfig -> parse to json error[id=${row.id}]: `, err)
                    row.value = defaultValue
                }
            } else {
                row.value = row.value ? row.value : defaultValue
            }
        } else {
            if (row) {
                row.value = defaultValue
            } else {
                row = {
                    id: 0,
                    name: name,
                    value: defaultValue,
                }
            }
        }

        if (!row || row.value == null || row.value == undefined) {
            return defaultValue
        } else {
            return row.value
        }
    },

    // 删除缓存信息 - 挖矿任务映射表
    async removeWalletLevelRules() {
        await this.removeSysConfig(WALLET_LEVEL_SYS_CONFIG_NAME)
    },

    async getWalletLevelRules() {
        const rules = await this.getSysConfig(
            WALLET_LEVEL_SYS_CONFIG_NAME,
            'json',
            getDefaultWalletLevelRules()
        )

        return normalizeWalletLevelRules(rules)
    },

    async getInvestmentConfig() {
        const config = await this.getSysConfig(
            INVESTMENT_SYS_CONFIG_NAME,
            'json',
            getDefaultInvestmentConfig()
        )

        return normalizeInvestmentConfig(config)
    },
}
