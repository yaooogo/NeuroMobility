export default {
    success(data, message, uts = null) {
        return Object.assign({
            code: 0,
            message: message ? message:  '',
            data: data
        }, uts ? { uts } : {})
    },
    error(code, message = '', data = null, uts = null) {
        return Object.assign({
            code: code,
            message: message ? message :  '',
            data: data
        }, uts ? { uts } : {})
    },
    exception(error, func = '') {
        return this.error(-1, error.message)
    }
}
