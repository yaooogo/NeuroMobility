import DB from "./database/DB.js";
import Helper from "./Helper.js";
import Type from "./Type.js";

var ErrorLogs = {

    /**
     * 记录错误日志信息到错误日志表error_logs中
     * @param action 操作行为
     * @param clazz 类名
     * @param method 方法名
     * @param params 参数
     * @param result 结果
     * @param traceLog 堆栈日志
     */
    write(action, clazz, method, params, result, traceLog = null) {
        try {
            let db = DB.query();
            db.table('error_logs').insert({
                'action': action,
                'class': clazz,
                'function': method,
                'params': Type.isJSON(params) ? JSON.stringify(params) : params,
                'result': Type.isJSON(result) ? JSON.stringify(result) : result,
                'trace_log': traceLog,
                'status': 0,
                'created_at': DB.raw('NOW()'),
                'updated_at': DB.raw('NOW()'),
            });
        } catch (error) {
            console.error(Helper.logNow() + 'ErrorLogs.write error: ', error);
        }
    }

};

export default ErrorLogs
