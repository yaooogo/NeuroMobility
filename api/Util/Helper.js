import crypto  from "crypto"
import bcrypt from "bcryptjs";
import util from 'util';
import fs from 'fs';
import xss from "xss";

var Helper = {
    now: function(prefix, suffix) {
        return (prefix ? prefix : '') + this.dateFormat("YYYY-mm-dd HH:MM:SS", new Date()) + (suffix ? suffix : '');
    },
    logNow: function() {
        return this.now('[', '] ');
    },
    getUtcTime: function(date){
        date = date || '';
        if(!date){
            date = new Date().getTime();
        }else{
            date = new Date(date).getTime();
        }
        return parseInt(date / 1000)
    },
    getRand(min,max){
        return Math.floor(Math.random() * (max - min)) + min;
    },
    getColor:function(){
        let colorList = [
            "#608c4d",
            "#674849",
            "#6497df",
            "#586c4c",
            "#cf5fa7",
            "#68243d",
            "#5dd095",
            "#6f2f6c",
            "#6b8586"
        ]  
        let idx =  this.getRand(0,colorList.length - 1)
        return colorList[idx];
    },
    dateFormat: function(fmt, date) {
        date = date || new Date();
        fmt = fmt || 'YYYY-mm-dd HH:MM:SS';
        let ret;
        const opt = {
            "Y+": date.getFullYear().toString(),        // 年
            "m+": (date.getMonth() + 1).toString(),     // 月
            "d+": date.getDate().toString(),            // 日
            "H+": date.getHours().toString(),           // 时
            "M+": date.getMinutes().toString(),         // 分
            "S+": date.getSeconds().toString()          // 秒
            // 有其他格式化字符需求可以继续添加，必须转化成字符串
        };
        for (let k in opt) {
            ret = new RegExp("(" + k + ")").exec(fmt);
            if (ret) {
                fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
            };
        };
        return fmt;
    },
    randomNo:function(e) {
        e = e || 32;
        let value = '';
        for (let i = 0; i < e; i++) {
          value += Math.floor(Math.random() * 10);
        }
        return value;
    },
    randomStr(e) {
        e = e || 32;
        var t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678",
            a = t.length,
            n = "";
        for (let i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
        return n
    },
    sortObjectByKey:function(obj) {
        return Object.keys(obj).sort().reduce((sortedObj, key) => {
            sortedObj[key] = obj[key];
            return sortedObj;
        }, {});
    },
    camelToUnderline: function(str) {
        return str ? str.replace(/([A-Z])/g, "_$1").toLowerCase() : str;
    },
    keyToUnderline: function(map) {
        if (!map) {
            return map;
        }
        let res = {};
        for (let k in map) {
            res[this.camelToUnderline(k)] = map[k];
        }
        return res;
    },
    sliceArray: function(arr, sliceSize) {
        if (!arr) {
            return [];
        }
        if (sliceSize <= 0) {
            return [arr];
        }
        let res = [];
        let offset = 0;
        while (true) {
            let item = arr.slice(offset, offset + sliceSize);
            if (item && item.length > 0) {
                res.push(item);
            } else {
                break;
            }
            offset += sliceSize;
        }
        return res;
    },
    createHmacSha256:function (message, secret) {  
        const hmac = crypto.createHmac('sha256', secret);  
        hmac.update(message);  
        const hash = hmac.digest('hex');  
        return hash;  
    },
    checkMakeDir: async function (dir) {
        const access = util.promisify(fs.access);
        const mkdir = util.promisify(fs.mkdir);
        try {
            await access(dir);
            // The folder already exists, return true
            return true;
        } catch (error) {
            // The folder does not exist, Error code is 'ENOENT'
            if (error.code === 'ENOENT') {
                await mkdir(dir, { recursive: true });
                return true;
            } else {
                // Other error
                throw error;
            }
        }
    },
    /**
     * 大于1k会自动转换为1k digits是小数点保留位数
     * @param {*} num 
     * @param {*} digits 
     * @returns 
     */
    nFormatter:function(num, digits) {
        const si = [
            { value: 1, symbol: "" },
            { value: 1E3, symbol: "K" },
            { value: 1E6, symbol: "M" },
            { value: 1E9, symbol: "G" },
            { value: 1E12, symbol: "T" },
            { value: 1E15, symbol: "P" },
            { value: 1E18, symbol: "E" }
        ];
        const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
        let i;
        for (i = si.length - 1; i > 0; i--) {
            if (num >= si[i].value) {
                break;
            }
        }
        return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
    },  
    toThousands:function(num) {
        return (num || 0).toString().replace(/(\d)(?=(?:\d{3})+$)/g, '$1,');
    },
    camelToSnake: function (string) {
        return string.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    },
    trim: function (str, trimChars) {
        trimChars = trimChars ? trimChars : ' '
        const regex = new RegExp(`^[${trimChars}]+|[${trimChars}]+$`, 'g')
        return str.replace(regex, '')
    },
    trimQuotes: function(str) {
        return str && typeof(str) == 'string' ? str.replace(/^['"]|['"]$/g, '') : str;
    },
    parseInt: function(value, defaultValue = 0) {
        value = value ? parseInt(value) : defaultValue
        if (isNaN(value)) {
            value = defaultValue
        }
        return value
    },
    parseFloat: function(value, defaultValue = 0) {
        value = value ? parseFloat(value) : defaultValue
        if (isNaN(value)) {
            value = defaultValue
        }
        return value
    },
    formatNumber: function(value, decimals) {
        const si = [
            { value: 1, symbol: "" },
            { value: 1E3, symbol: "K" },
            { value: 1E6, symbol: "M" },
            { value: 1E9, symbol: "G" },
            { value: 1E12, symbol: "T" },
            { value: 1E15, symbol: "P" },
            { value: 1E18, symbol: "E" }
        ];
        const rx = /\.0+$|(\.[0-9]*[1-9])0+$/
        let i
        for (i = si.length - 1; i > 0; i--) {
            if (value >= si[i].value) {
                break
            }
        }
        return (value / si[i].value).toFixed(decimals).replace(rx, "$1") + si[i].symbol
    },
     xss(obj){
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'string') {
                    obj[key] = xss(obj[key]);
                }else if (typeof obj[key] === 'object' && obj[key] !== null){
                    obj[key] = Helper.xss(obj[key])
                }
            }
        }
        return obj;
    },
    sprintf:function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/%s/g, function() {
            return args.shift();
        });
    },
    sleep:function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    //生成MD5
    md5: function(str){
        return crypto.createHash('md5').update(str).digest('hex');
    },
    //生成HASH 密码
    async password_hash(password){
        return await bcrypt.hash(password,8);
    },
    //验证hash密码
    async password_verify(password,hash){
        return await bcrypt.compare(password,hash);
    },
    // 截断字符串到指定长度，非字符串会被强制转换为字符串
    safeString: function(value, max = 255) {
        return String(value ?? '').slice(0, max);
    },
    // 从请求头/IP中获取客户端真实IP
    getClientIp: function(req) {
        const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
        return forwarded || req?.ip || req?.connection?.remoteAddress || '';
    }
};

export default Helper
