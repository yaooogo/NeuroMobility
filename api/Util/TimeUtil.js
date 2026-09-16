export default {
    diffDays: function (d1, d2) {
        const s = Date.parse(d1)
        const e = Date.parse(d2)
        return Math.floor((e - s) / (86400 * 1000))
    },
    addDays: function (baseDate, incDays) {
        const date = new Date(Date.parse(baseDate) + incDays * 86400 * 1000)
        const y = date.getFullYear()
        const m = date.getMonth() + 1
        const d = date.getDate()
        return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`
    },
    currentDay: function (timestamp) {
        const date = timestamp ? new Date(timestamp) : new Date()
        const y = date.getUTCFullYear()
        const m = date.getUTCMonth() + 1
        const d = date.getUTCDate()
        return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`
    },
    formatDateTime: function (timestamp) {
        const date = timestamp ? new Date(timestamp) : new Date()
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // 月份是从0开始的
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
}