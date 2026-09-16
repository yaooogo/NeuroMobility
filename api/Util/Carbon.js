class Carbon {
    date = null

    time = null

    constructor(date) {
        if (date) {
            this.date = this.dateFormat('Y-m-d H:i:s', new Date(date))
        }
        return this
    }

    static now() {
        let _this = new Carbon()
        _this.date = _this.dateFormat('Y-m-d H:i:s', new Date())
        return _this
    }

    static format(date) {
        let _this = new Carbon()
        _this.date = _this.dateFormat('Y-m-d H:i:s', new Date(date))
        return _this
    }

    lt(date) {
        if (date instanceof Carbon) {
            return this.timestamp() < date.timestamp()
        }
        return this.timestamp() < (new Carbon(date).timestamp())
    }

    gt(date) {
        if (date instanceof Carbon) {
            return this.timestamp() > date.timestamp()
        }
        return this.timestamp() > (new Carbon(date).timestamp())
    }

    dateFormat (fmt, date) {
        let ret;
        const opt = {
            "Y+": date.getFullYear().toString(),        // 年
            "m+": (date.getMonth() + 1).toString(),     // 月
            "d+": date.getDate().toString(),            // 日
            "H+": date.getHours().toString(),           // 时
            "i+": date.getMinutes().toString(),         // 分
            "s+": date.getSeconds().toString()          // 秒
            // 有其他格式化字符需求可以继续添加，必须转化成字符串
        };
        for (let k in opt) {
            ret = new RegExp("(" + k + ")").exec(fmt);
            if (ret) {
                fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
            };
        };
        return fmt;
    }

    timestamp(second = false) {
        if (!this.time) {
            this.time = Date.parse(this.date)
        }
        return second ? Math.ceil(this.time / 1000) : this.time
    }
}

export default Carbon