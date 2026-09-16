import mysql from "mysql";
import Config from "./Config.js";

const Database = {
    pool: {},
    dbConfig:{
        'default': {
            host: Config.DB_HOST,
            port: Config.DB_PORT,
            database: Config.DB_DATABASE,
            user:  Config.DB_USERNAME,
            password:  Config.DB_PASSWORD,
            prefix: Config.DB_PREFIX,
            charset: Config.DB_CHARSET || 'utf8mb4',
            connectionLimit: Config.DB_CONNECTION_LIMIT,
            timezone: Config.TZ,  // 使用 UTC 时区
            dateStrings:Config.DB_DATE_TIMESTRINGS == 'true' ? true:false,
            supportBigNumbers: true,
            bigNumberStrings: true,
        }
    },
    exec: function(sql, params = [], config = 'default'){
        let that = this;
        return new Promise(function(resolve,reject){
            if (!that.pool[config]) {
                that.pool[config] = mysql.createPool(this.dbConfig[config]);
            }
            that.pool[config].getConnection(function(err, conn) {
                if (err) {
                    if (conn) {
                        that.pool[config].releaseConnection(conn);
                    }
                    reject(err);
                } else {
                    conn.query(sql, params, function(error, result){
                        that.pool[config].releaseConnection(conn);
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    });
                }
            });
        });
    },
    execEx: function(conn, sql, params = []) {
        return new Promise(function(resolve, reject) {
            conn.query(sql, params, function(error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    },
    connection: function(config = 'default') {
        let that = this;
        return new Promise(function(resolve, reject) {
            if (!that.pool[config]) {
                that.pool[config] = mysql.createPool(this.dbConfig[config]);
            }
            that.pool[config].getConnection(function(err, conn) {
                if (err) {
                    reject(err);
                } else {
                    resolve(conn);
                }
            });
        });
    },

    prefix(connection = 'default') {
       return this.dbConfig[connection].prefix
    }
};

export default Database
