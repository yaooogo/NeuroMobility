import redis from "redis"
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import Helper from "./Helper.js"
import Config from "./Config.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const __appdir = dirname(__filename) + '/../'

class Redis {

    /**
     * 构造函数
     * @param autoConnect 是否自动连接
     */
    constructor(autoConnect = true, defaultTTS) {
        let options = {
            socket: {
                host: Config.REDIS_HOST,
                port: Config.REDIS_PORT
            },
            legacyMode: true,
        }
        // if (Config.REDIS_PASSWORD) {
        //     options.socket.auth_pass = Config.REDIS_PASSWORD
        // }
        this.client = redis.createClient(options)
        this.client.on('error', err => {
            console.error(Helper.logNow() + " Redis create client error: ", err)
        })
        if (autoConnect) {
            this.connect()
        }
        this.luaScripts = {}

        this.defaultTTS = defaultTTS
    }

    /**
     * 建立链接
     * @returns {Promise<void>}
     */
    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect()
            if (Config.REDIS_PASSWORD) {
                await this.client.auth(Config.REDIS_PASSWORD)
            }
        }
    }

    toKey(key) {
        return `${Config.REDIS_PREFIX}${key}`
    }

    /**
     * 断开链接
     */
    disconnect() {
        this.client.disconnect()
    }

    /**
     * 退出，说明：退出后就不可再连接
     */
    qiut() {
        this.client.quit()
    }

    /**
     * 判断是否已连接
     * @returns {*}
     */
    isOpen() {
        return this.client.isOpen
    }

    /**
     * 设置值
     * @param key 键
     * @param value 值
     * @param ttl 过期时间（秒）
     * @returns {Promise<void>}
     */
    async set(key, value, ttl) {
        if (!ttl && this.defaultTTS) {
            ttl = this.defaultTTS
        }

        // 判断value值是否是对象类型
        if (typeof value === 'object') {
            value = JSON.stringify(value)
        }
        // 设置过期时间
        // ttl ? await this.client.set(key, value, {
        //     EX: ttl,
        //     NX: false
        // }) : await this.client.set(key, value, {NX: false})
        ttl ? await this.client.set(key, value, 'EX', ttl) : await this.client.set(key, value)
    }

    /**
     * 设置值。当key不存在时设置，存在时不操作
     * @param key 键
     * @param value 值
     * @param ttl 过期时间（秒）
     * @returns {Promise<void>}
     */
    async setNX(key, value, ttl) {
        if (!ttl && this.defaultTTS) {
            ttl = this.defaultTTS
        }

        // 判断value值是否是对象类型
        if (typeof value === 'object') {
            value = JSON.stringify(value)
        }
        // 设置过期时间
        ttl ? await this.client.set(key, value, {
            EX: ttl,
            NX: true
        }) : await this.client.set(key, value, {NX: true})
    }

    /**
     * 读取值
     * @param key 键
     * @returns {Promise<unknown>}
     */
    async get(key) {
        return new Promise((resolve, reject) => {
            this.client.get(key, function (err, reply) {
                if (err) {
                    reject(err)
                } else {
                    resolve(reply)
                }
            })
        })
    }

    async doeval(script, numberOfKeys, ...rest) {
        return new Promise((resolve, reject) => {
            this.client.eval(script, numberOfKeys, ...rest, function (err, reply) {
                if (err) {
                    reject(err)
                } else {
                    resolve(reply)
                }
            })
        })
    }

    /**
     * 删除值
     * @param key
     * @returns {Promise<void>}
     */
    async delete(key) {
        return new Promise((resolve, reject) => {
            this.client.del(key, function (err, reply) {
                if (err) {
                    reject(err)
                } else {
                    resolve(reply)
                }
            })
        })
    }

    /**
     * 发送命令
     * @param cmd 命令，如：rpush, lpop, lrange, ltrim
     * @param args 参数。
     *  rpush命令参数如： ["seckill:orderlist_1", {"id": "1", "status": 0, "order_no": "100001"}, {"id": "2", "status": 0, "order_no": "100002"}]
     *  lpop命令参数如： ["seckill:orderlist_1"]
     *  lrange命令参数如： ["seckill:orderlist_1", 0, 2]
     *  ltrim命令参数如： ["seckill:orderlist_1", 3, -1]
     * @returns {Promise<unknown>}
     */
    async sendCommand(cmd, args) {
        return new Promise((resolve, reject) => {
            if (args && Object.prototype.toString.call(args).toLowerCase() === '[object array]') {
                for (let i in args) {
                    if (typeof args[i] === 'object') {
                        args[i] = JSON.stringify(args[i])
                    }
                }
            }
            this.client.sendCommand(cmd, args, function (err, reply) {
                if (err) {
                    reject(err)
                } else {
                    resolve(reply)
                }
            })
        })
    }

    /**
     * 从文件中加载lua脚本（会进行缓存）
     * @param lua脚本文件路径
     * @returns {Promise<void>}
     */
    loadLuaScript(file) {
        if (!this.luaScripts[file]) {
            if (!file.startsWith('/') && !file.startsWith('\\') && file.indexOf(':') < 0) {
                file = __appdir + file
            }
            this.luaScripts[file] = fs.readFileSync(file)
        }
        return this.luaScripts[file]
    }

    /**
     * 更新过期时间
     * @param key 键
     * @param tts 过期时间（秒）
     * @returns {Promise<unknown>}
     */
    async expire(key, tts) {
        return new Promise((resolve, reject) => {
            this.client.expire(key, tts, function (err, reply) {
                if (err) {
                    reject(err)
                } else {
                    resolve(reply)
                }
            })
        })
    }

}

export default Redis;
