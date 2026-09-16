import DB from "./database/DB.js"
import Helper from "./Helper.js"
import Type from "./database/Type.js"
import Expression from "./database/Expression.js"
import { RedisCache } from "./Cache.js"
import Env from "../Env.js"
import mysql from "mysql"

var DBUtil = {

    _getWeekCycleInfo: async function (baseName, db) {
        const currentDay = new Date().getDay()
        const cacheKey = `Api:CycleTableCurrDay_Week:${baseName}`
        const cacheDay = parseInt(await RedisCache.get(cacheKey))
        const changed = currentDay != cacheDay

        if (!db) {
            db = DB.query()
        }
        const prefix = db.getPrefix()

        let tableName = `${baseName}_0${currentDay}`
        let rawTableName = (prefix ?? '') + tableName

        return { changed, currentDay, cacheDay, tableName, rawTableName, cacheKey, db }
    },

    getWeekCycleTable: async function (baseName, isRawName) {
        const weekCycleTableBlacklists = Env.business?.weekCycleTableBlacklists || []
        if (weekCycleTableBlacklists.includes(baseName)) {
            return isRawName ? (DB.query().getPrefix() + baseName) : baseName
        }

        let { changed, currentDay, tableName, rawTableName, cacheKey, db }
            = await this._getWeekCycleInfo(baseName)

        if (changed) {
            const lockKey = `Api:Lock:TruncateTable:${baseName}`
            const lock = await RedisCache.retryLock(lockKey, 10000, 10000)
            if (lock.isOk) {
                try {
                    let cycleInfo = await this._getWeekCycleInfo(baseName, db) // 再次获取
                    changed = cycleInfo.changed
                    currentDay = cycleInfo.currentDay
                    tableName = cycleInfo.tableName
                    rawTableName = cycleInfo.rawTableName
                    cacheKey = cycleInfo.cacheKey
                    db = cycleInfo.db

                    if (changed) {
                        if (!db) {
                            db = DB.query()
                        }

                        const info = `lock key: ${lock.key}, lock request id: ${lock.requestId}`
                        console.log(`[${Helper.now()}] [DBUtil] Ready to truncate table "${rawTableName}", ${info}`)

                        await db.exec(`TRUNCATE TABLE ${rawTableName}`)
                        await RedisCache.set(cacheKey, currentDay, 86400) // 1 day

                        console.log(`[${Helper.now()}] [DBUtil] truncate table "${rawTableName}" successfully, ${info}`)
                    }
                } finally {
                    const res = await RedisCache.releaseLock(lock.key, lock.requestId)
                    console.log(`[${Helper.now()}] [DBUtil] releaseLock(${lock.key}, ${lock.requestId}) result: `, res)
                }
            }
        }

        return isRawName ? rawTableName : tableName
    },

    updateOrInsert: async function (tableName, wheres, insertValues, updateValues, isUpdateFirst, db) {
        if (!db) {
            db = DB.query()
        } else {
            db = db.newQuery()
        }

        // 先尝试更新
        let affectedRows = 0
        if (isUpdateFirst) {
            affectedRows = await db.table(tableName)
                .where(wheres)
                .update(updateValues)

            if (affectedRows <= 0) {
                db = db.newQuery()
            }
        }

        // 若没更新到记录或未执行更新时，再执行插入更新操作
        if (affectedRows <= 0) {
            let upsertUpdate = updateValues
            if (!Type.isArray(upsertUpdate)) {
                let foundNonExpression = false
                for (let key in upsertUpdate) {
                    if (!(upsertUpdate[key] instanceof Expression)) {
                        foundNonExpression = true
                    }
                }
                if (foundNonExpression) {
                    upsertUpdate = Object.keys(upsertUpdate)
                }
            }
            affectedRows = await db.table(tableName).upsert(insertValues, null, upsertUpdate)
        }

        // 返回结果
        return affectedRows
    },

    execEx: function (sql, params = [], dbConfig) {
        if (dbConfig) {
            return new Promise((resolve, reject) => {
                if (!dbConfig.user && dbConfig.username) {
                    dbConfig.user = dbConfig.username
                    delete dbConfig.username
                }
                const pool = mysql.createPool(dbConfig)

                pool.getConnection(async (err, conn) => {
                    if (err) {
                        if (conn && this.transactions < 1) {
                            await conn.release();
                        }
                        reject(err)
                    } else {
                        conn.query(sql, params, async (error, result) => {
                            await conn.release()
                            if (error) {
                                reject(error)
                            } else {
                                resolve(result)
                            }
                        })
                    }
                })
            })
        } else {
            return DB.query().exec(sql, params)
        }
    },

}

export default DBUtil