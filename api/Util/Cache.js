import crypto from "crypto"
import Redis from "./Redis.js"
import LRU from "lru-cache"
import Config from "./Config.js";
import fs from "fs";
import {fileURLToPath} from "url";
import {dirname} from "path";

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const __appdir = dirname(__filename) + '/../'

const DEFAULT_REDIS_TTS = 3600          // ttl is seconds
const DEFAULT_LRU_TTS = 3600 * 1000     // ttl is ms
const MAX_LRU_SIZE = 50000
const VALUE_TYPE_MAP = {
    'string': 0,
    'number': 1,
    'object': 2,
    'undefined': 3,
    'null': 4,
}

const DEFAULT_LOCK_MS = 2000            // 默认上锁超时时间，超过时间在自动解锁
const DEFAULT_LOCK_TIMEOUT = 6000       // 默认上锁重试时间，超过时间则放弃重试，返回错误
const DEFAULT_WAIT_MS = 1000            // 默认两次重试之间的间隔时间

const LOCK_DEBUG = false

export class RedisCache {
    static _cache = null
    static _client = null
    static _luaScripts = {}

    static async set(key, value, tts, renew = false) {
        try {
            const cache = await RedisCache._getCache(renew)
            key = cache.toKey(key)
            await cache.set(key, RedisCache._encodeValue(value), tts)
        } catch (error) {
            if (renew) {
                throw error
            } else {
                return await RedisCache.set(key, value, tts, true)
            }
        }
    }

    static async get(key, renew = false) {
        try {
            const cache = await RedisCache._getCache(renew)
            key = cache.toKey(key)
            const value = await cache.get(key)
            return RedisCache._decodeValue(value)
        } catch (error) {
            if (renew) {
                throw error
            } else {
                return await RedisCache.get(key, true)
            }
        }
    }

    static async delete(key, renew = false) {
        try {
            const cache = await RedisCache._getCache(renew)
            key = cache.toKey(key)
            await cache.delete(key)
        } catch (error) {
            if (renew) {
                throw error
            } else {
                return await RedisCache.delete(key, true)
            }
        }
    }

    static async deleteByPattern(pattern, renew = false) {
        try {
            const cache = await RedisCache._getCache(renew)
            const keyPattern = cache.toKey(pattern)
            const keys = await cache.sendCommand('keys', [keyPattern])
            const keyList = Array.isArray(keys) ? keys : []

            if (keyList.length < 1) {
                return 0
            }

            await cache.sendCommand('del', keyList)
            return keyList.length
        } catch (error) {
            if (renew) {
                throw error
            } else {
                return await RedisCache.deleteByPattern(pattern, true)
            }
        }
    }

    static sleep(time) {
        return new Promise((resolve) => {
            setTimeout(function () {
                resolve()
            }, time || DEFAULT_WAIT_MS)
        })
    }

    static async setLock(key, expireMs) {
        try {
            let pxTime = expireMs || DEFAULT_LOCK_MS
            const requestId = crypto.randomBytes(15).toString('hex')

            let cache = await RedisCache._getCache()
            let ret = await cache.sendCommand('set', [key, requestId, 'PX', pxTime, 'NX'])

            return {
                key,
                requestId,
                isOk: ret == "OK"
            }
        } catch (error) {
            return {
                key,
                isOk: false,
                error
            }
        }
    }

    static async releaseLock(key, requestId) {
        try {
            const unlockScript = `if
                redis.call("get", KEYS[1]) == ARGV[1]
            then
                return redis.call("del", KEYS[1])
            else
                return 0 end`

            const cache = await RedisCache._getCache()
            let ret = await cache.doeval(unlockScript, 1, key, requestId)

            return {
                key,
                requestId,
                isOk: ret == 1
            }
        } catch (error) {
            return {
                key,
                isOk: false,
                error
            }
        }
    }

    static async retryLock(key, expireMs, retryTimeout) {
        const start = Date.now()
        return (async function tryLock() {
            try {
                const result = await RedisCache.setLock(key, expireMs)
                if (result.isOk) {
                    LOCK_DEBUG && console.log(`[RedisCache] Locked successfully: ${key}`)
                    return result
                }

                if (Math.floor(Date.now() - start) > (retryTimeout || DEFAULT_LOCK_TIMEOUT)) {
                    LOCK_DEBUG && console.log(`[RedisCache] Lock retry timeout: ${key}`)
                    return result
                }

                LOCK_DEBUG && console.log(`[RedisCache] Waiting for retry: ${key}`)
                await RedisCache.sleep()
                LOCK_DEBUG && console.log(`[RedisCache] Start retry: ${key}`)
                return tryLock()
            } catch (error) {
                throw error
            }
        })()
    }

    static loadLuaScript(file) {
        if (!RedisCache._luaScripts[file]) {
            if (!file.startsWith('/') && !file.startsWith('\\') && file.indexOf(':') < 0) {
                file = __appdir + file
            }
            RedisCache._luaScripts[file] = fs.readFileSync(file)
        }
        return RedisCache._luaScripts[file]
    }

    static async doeval(script, numberOfKeys, ...rest) {
        const cache = await RedisCache._getCache()
        return await cache.doeval(script, numberOfKeys, ...rest)
    }

    static _toKey(key) {
        return `${Config.redis.prefix}${key}`
    }

    static async synchronize(objectName, timeout) {
        const keyPrefix = Config.redis.prefix || ''
        const luaScript = RedisCache.loadLuaScript('lua/Synchronize.lua')
        const currentTime = Date.now()
        return await RedisCache.doeval(luaScript, 2, keyPrefix, objectName, currentTime, timeout * 1000)
    }

    static async synchronizeClean(objectName) {
        await RedisCache.delete('Synchronized:' + (objectName || 'default'))
    }

    static async _getCache(renew = false) {
        if (renew || !RedisCache._cache) {
            const r = new Redis(false, DEFAULT_REDIS_TTS)
            await r.connect()
            RedisCache._cache = r
            RedisCache._client = r.client
        }
        return RedisCache._cache
    }

    static _getType(value) {
        let t = typeof(value)
        if (t === 'object' && !value) {
            t = 'null'
        }
        return VALUE_TYPE_MAP[t] ?? 0
    }

    static _encodeValue(value) {
        const t = RedisCache._getType(value)
        let strValue
        if (t == 0) { // string
            strValue = value
        } else if (t == 1) { // number
            strValue = `${value}`
        } else if (t == 2) { // object
            strValue = JSON.stringify(value)
        } else if (t == 3) { // undefined
            strValue = ''
        } else if (t == 4) { // null
            strValue = ''
        } else {
            strValue = `${value}`
        }
        return `${t}:${strValue}`
    }

    static _decodeValue(value) {
        if (typeof(value) != 'string') {
            return value
        }
        const p = value.indexOf(':')
        if (p < 0) {
            return value
        }

        const typeText = value.substring(0, p)
        if (!/^[0-4]$/.test(typeText)) {
            return value
        }

        const t = Number(typeText)
        const v = value.substring(p + 1)
        if (t == 0) { // string
            return v
        } else if (t == 1) { // number
            return Number(v)
        } else if (t == 2) { // object
            return JSON.parse(v)
        } else if (t == 3) { // undefined
            return undefined
        } else if (t == 4) { // null
            return null
        } else {
            return v
        }
    }

}

export class LRUCache {
    static _cache = null

    // tts is seconds
    static set(key, value, tts) {
        key = LRUCache._toKey(key)
        if (tts) {
            LRUCache._getCache().set(key, value, { ttl: tts * 1000 })
        } else {
            LRUCache._getCache().set(key, value)
        }
    }

    static get(key) {
        key = LRUCache._toKey(key)
        return LRUCache._getCache().get(key)
    }

    static delete(key) {
        key = LRUCache._toKey(key)
        LRUCache._getCache().delete(key)
    }

    static synchronize(objectName, timeout) {
        let cacheKey = 'Synchronized:' + (objectName || 'default')
        let refresh = LRUCache.get(cacheKey) || 0
        let interval = Date.now() - refresh

        if (interval < timeout * 1000) {
            return false
        }

        LRUCache.set(cacheKey, Date.now(), timeout)

        return true
    }

    static synchronizeClean(objectName) {
        LRUCache.delete('Synchronized:' + (objectName || 'default'))
    }

    static _getCache() {
        if (!LRUCache._cache) {
            LRUCache._cache = new LRU({ max: MAX_LRU_SIZE, ttl: DEFAULT_LRU_TTS }) // ttl is ms
        }
        return LRUCache._cache
    }

    static _toKey(key) {
        return `${Config.redis.prefix}${key}`
    }

}

export default { RedisCache, LRUCache }
