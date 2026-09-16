import mysql from "mysql";
import Type from './Type.js'
import Expression from "./Expression.js";
import Grammar from './Grammar.js'
import JoinClause from "./JoinClause.js";
import Config from "../Config.js";
import Database from "../Database.js";

const MAX_PER_PAGE = Config.MAX_PAGE_SIZE || 100;
const DEFAULT_PER_PAGE = Config.DEFAULT_PAGE_SIZE || 10;
const DB_DEBUG = false;

let pool = {}

class DB {
    constructor(conn = 'default', connection = null) {
        this.conn = conn
        this.bindings = {
            select: [],
            join: [],
            where: [],
            having: [],
            order: [],
            union: []
        }
        this.aggregate = null
        this.columns = null
        this.from = null
        this.joins = []
        this.wheres = []
        this.groups = []
        this.havings = []
        this.orders = []
        this.limit = null
        this.distinct = false
        this.offset = null
        this.whereValues = []
        this.limitValues = []
        this.transactions = 0
        this.operators = [
            '=', '<', '>', '<=', '>=', '<>', '!=',
            'like', 'like binary', 'not like', 'between', 'ilike',
            '&', '|', '^', '<<', '>>',
            'rlike', 'regexp', 'not regexp',
            '~', '~*', '!~', '!~*', 'similar to',
            'not similar to',
        ]
        this.backups = []
        this.bindingBackups = []
        this.currentConn = connection

        Grammar.setDefaultTablePrefix(this.getPrefix())
    }

    /**
     * 新建查询
     * @param {string} config 数据库配置
     * @param {string} connection 当前连接
     * @returns {DB}
     */
    static query(config = 'default', connection = null) {
        DB_DEBUG && console.log(`[DB] query() -> config: ${config}, connection: `, (connection ? "[object]" : null));
        return new DB(config, connection)
    }

    /**
     * 连接库
     * @param {string} database
     * @returns {this}
     */
    connection(database) {
        this.conn = database
        return this
    }

    /**
     * Get a new instance of the query builder.
     * @returns {DB}
     */
    newQuery() {
        return new DB(this.conn, this.currentConn)
    }

    getConnection() {
        return new Promise((resolve, reject) => {
            if (this.currentConn) {
                DB_DEBUG && console.log(`[DB] getConnection() -> step: 0`);
                resolve(this.currentConn)
            } else {
                if (!pool[this.conn]) {
                    pool[this.conn] = mysql.createPool(Database['dbConfig'][this.conn])
                }
                DB_DEBUG && console.log(`[DB] getConnection(${this.conn}) -> step: 1`);
                pool[this.conn].getConnection(async (err, conn) => {
                    if (err) {
                        DB_DEBUG && console.log(`[DB] getConnection(${this.conn}) -> step: -1: `, err);
                        if (conn && this.transactions < 1) {
                            // pool[this.conn].releaseConnection(conn);
                            await conn.release();
                        }
                        reject(err);
                    } else {
                        DB_DEBUG && console.log(`[DB] getConnection(${this.conn}) -> step: 2`);
                        resolve(conn)
                    }
                });
            }
        })
    }

    /**
     * 开启事务
     * @returns {void}
     */
    //async beginTransaction(conn = 'default') {
    async beginTransaction() {
        ++this.transactions
        if (this.transactions === 1) {
            try {
                if (!this.currentConn) {
                    //this.conn = conn
                    this.currentConn = await this.getConnection()
                }
                await new Promise((resolve, reject) => {
                    this.currentConn.beginTransaction((err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve()
                        }
                    })
                })
            } catch (error) {
                --this.transactions
                throw error
            }
        }
    }

    /**
     * 提交事务
     * @returns {DB}
     */
    async commit() {
        if (!this.currentConn) {
            return
        }
        // --this.transactions
        // this.currentConn.commit()
        // this.currentConn.release()
        // this.currentConn = null
        this.transactions = Math.max(this.transactions - 1, 0)
        return new Promise((resolve, reject) => {
            this.currentConn.commit(async (error, result) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(result)
                }
                // pool[this.conn].releaseConnection(this.currentConn)
                await this.currentConn.release()
                this.currentConn = null
            })
        })
    }

    /**
     * 回滚事务
     * @returns {DB}
     */
    async rollback() {
        if (!this.currentConn) {
            return
        }
        // --this.transactions
        // this.currentConn.rollback()
        // this.currentConn.release()
        // this.currentConn = null
        this.transactions = Math.max(this.transactions - 1, 0)
        return new Promise((resolve, reject) => {
            this.currentConn.rollback(async (error, result) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(result)
                }
                // pool[this.conn].releaseConnection(this.currentConn)
                await this.currentConn.release()
                this.currentConn = null
            })
        })
    }

    /**
     * 事务调用 调用方式如
     * await DB.transaction((config, connection) => {
     *     await DB.query(config, connection).update(...)  //语句1 config和connection 要和上面的一致
     *     await DB.query(config, connection).update(...)  //语句2 config和connection 要和上面的一致
     *
     *     if (想回滚) {
     *          throw new Error('回滚错误信息')
     *     }
     *     没报错就自动提交
     * })
     *
     *
     * @param {function} callback
     * @param {string} conn 连接哪个配置的库
     */
    static async transaction(callback, config = 'default') {
        let db = new DB(config)
        db.currentConn = await db.getConnection()

        await db.beginTransaction()
        try {
            await callback(config, db.currentConn)
            await db.commit()
        } catch (error) {
            await db.rollback()
            throw error
        }

    }

    /**
     * 执行sql
     * @param {string} sql
     * @param {array} params
     * @returns {Promise}
     */
    exec(sql, params = []) {
        let config = this.conn
        DB_DEBUG && console.log(`[DB] exec() -> config: ${config}, step: 0`);
        return new Promise((resolve, reject) => {
            if (this.currentConn) {
                DB_DEBUG && console.log(`[DB] exec() -> step: 1`);
                this.currentConn.query(sql, params, (error, result) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve(result)
                    }
                })
            } else {
                DB_DEBUG && console.log(`[DB] exec() -> step: 2`);
                if (!pool[this.conn]) {
                    pool[this.conn] = mysql.createPool(Database['dbConfig'][this.conn])
                }
                DB_DEBUG && console.log(`[DB] exec() -> step: 3`);
                pool[config].getConnection(async (err, conn) => {
                    if (err) {
                        DB_DEBUG && console.log(`[DB] exec() -> step: -1, error: `, err);
                        if (conn && this.transactions < 1) {
                            // pool[config].releaseConnection(conn);
                            await conn.release();
                        }
                        reject(err);
                    } else {
                        DB_DEBUG && console.log(`[DB] exec() -> step: 4`);
                        conn.query(sql, params, async (error, result) => {
                            if (this.transactions < 1) {
                                DB_DEBUG && console.log(`[DB] exec() -> step: 5`);
                                // pool[config].releaseConnection(conn);
                                await conn.release();
                            }
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        });
                    }
                });
            }

        });
    }

    execEx(conn, sql, params = []) {
        return new Promise(function (resolve, reject) {
            conn.query(sql, params, function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * 获取表前缀
     * @returns {string}
     */
    getPrefix() {
        return Database['dbConfig'][this.conn]['prefix']
    }

    /**
     * 设置表名
     * @param {string} table
     * @returns {this}
     */
    table(table) {
        this.from =  table
        return this
    }

    /**
     * distinct
     * @returns {this}
     */
    only() {
        this.distinct = true
        return this
    }

    /**
     * Add a basic where clause to the query.
     * @param {string|array|function} column
     * @param {string} operator
     * @param {mixed} value
     * @param {string} boolean
     * @returns {this}
     */
    where(column, operator = null, value = null, boolean = 'and') {
        if (Type.isJSON(column)) {
            return this.whereNested((db) => {
                for (let key in column) {
                    db.where(key, column[key])
                }
                /*
                column.forEach(item => {
                    db.where(...item)
                })
                */
            }, boolean)
        }

        let args = [...arguments]
        if (args.length === 2) {
            value = operator
            operator = '='
        } else if (this.invalidOperatorAndValue(operator, value)) {
            throw new Error('Illegal operator and value combination.');
        }

        if (Type.isFunction(column)) {
            return this.whereNested(column, boolean)
        }

        let type = 'Basic'
        this.wheres.push({
            type: type,
            column: column,
            operator: operator,
            value: value,
            boolean: boolean
        })
        this.addBinding(value, 'where')
        return this
    }

    /**
     * Add an "or where" clause to the query.
     * @param {string|array|function} column
     * @param {string} operator
     * @param {mixed} value
     * @returns {this}
     */
    orWhere(column, operator = null, value = null) {
        return this.where(column, operator, value, 'or')
    }

    /**
     * Add a "where in" clause to the query.
     * @param {string} column
     * @param {mixed} values
     * @param {string} boolean
     * @param {boolean} not
     * @returns {this}
     */
    whereIn(column, values, boolean = 'and', not = false) {
        let type = not ? 'NotIn' : 'In'

        if (values instanceof DB) {
            return this.whereInExistingQuery(column, values, boolean, not)
        }

        if (Type.isFunction(values)) {
            return this.whereInSub(column, values, boolean, not)
        }

        this.wheres.push({
            type: type,
            column: column,
            values: values,
            boolean: boolean
        })

        this.addBinding(values, 'where')

        return this
    }

    /**
     * Add a external sub-select to the query.
     * @param {string} column
     * @param {DB} query
     * @param {string} boolean
     * @param {boolean} not
     * @returns {this}
     */
    whereInExistingQuery(column, query, boolean, not) {
        let type = not ? 'NotInSub' : 'InSub'

        this.wheres.push({
            type: type,
            column: column,
            query: query,
            boolean: boolean
        })

        this.addBinding(query.getBindings(), 'where')

        return this
    }

    /**
     * Add a where in with a sub-select to the query.
     * @param {string} column
     * @param {function} callback
     * @param {string} boolean
     * @param {boolean} not
     * @returns {this}
     */
    whereInSub(column, callback, boolean, not) {
        let type = not ? 'NotInSub' : 'InSub'

        let query = this.newQuery()
        callback(query)

        this.wheres.push({
            type: type,
            column: column,
            query: query,
            boolean: boolean
        })

        this.addBinding(query.getBindings(), 'where')

        return this
    }

    /**
     * Add a "where not in" clause to the query.
     * @param {string} column
     * @param {mixed} values
     * @param {boolean} boolean
     * @returns {this}
     */
    whereNotIn(column, values, boolean = 'and') {
        return this.whereIn(column, values, boolean, true)
    }

    /**
     * Add a "or where not in" clause to the query.
     * @param {string} column
     * @param {mixed} values
     * @returns {this}
     */
    orWhereNotIn(column, values) {
        return this.whereNotIn(column, values, 'or')
    }

    /**
     * Add a where between statement to the query.
     * @param {string} column
     * @param {array} values
     * @param {string} boolean
     * @param {boolean} not
     * @returns {this}
     */
    whereBetween(column, values, boolean = 'and', not = false) {
        this.wheres.push({
            type: 'between',
            column: column,
            boolean: boolean,
            not: not,
        })

        this.addBinding(values, 'where')

        return this
    }

    /**
     * Add a raw where clause to the query.
     * @param {string} sql
     * @param {array} bindingds
     * @param {string} boolean
     * @returns {this}
     */
    whereRaw(sql, bindingds = [], boolean = 'and') {
        this.wheres.push({
            type: 'raw',
            sql: sql,
            boolean: boolean
        })

        this.addBinding(bindingds, 'where')

        return this
    }

    whereNested(callback, boolean = 'and') {
        let query = this.newQuery()
        query.table(this.from)

        callback(query)

        return this.addNestedWhereQuery(query, boolean)
    }

    leftJoin(table, first, operator, second) {
        return this.join(table, first, operator, second, 'left')
    }

    rightJoin(table, first, operator, second) {
        return this.join(table, first, operator, second, 'right')
    }

    join(table, one, operator = null, two = null, type = 'inner', where = false) {

        let join = new JoinClause(type, table)

        if (Type.isFunction(one)) {
            one(join)

            this.joins.push(join)

            this.addBinding(join.bindingds, 'join')
        } else {
            this.joins.push(join.on(one, operator, two, 'and', where))

            this.addBinding(join.bindingds, 'join')
        }

        return this
    }

    addNestedWhereQuery(query, boolean) {
        if (query.wheres.length > 0) {
            const type = 'Nested'
            this.wheres.push({
                type: type,
                query: query,
                boolean: boolean
            })

            this.addBinding(query.getBindings(), 'where')
        }

        return this
    }

    invalidOperatorAndValue(operator, value) {
        let isOperator = this.operators.indexOf(operator) !== -1

        return isOperator && operator != '=' && (Type.isNull(value) || Type.isUndefined(value))
    }

    addBinding(binding, type) {
        if (!this.bindings.hasOwnProperty(type)) {
            throw new Error(`Invalid binding type: ${type}.`)
        }
        this.bindings[type].push(binding)
    }

    getBindings() {
        let bindings = []
        for (let i in this.bindings) {
            bindings = bindings.concat(...this.bindings[i])
        }

        return bindings
    }

    cleanBindings(bindings) {
        return bindings.filter(binding => {
            return !(binding instanceof Expression)
        })
    }

    take(num) {
        if (+num > 0) {
            this.limit = num
        }

        return this
    }

    skip(value) {
        if (value > 0) {
            this.offset = value || 0
        }
        return this
    }

    groupBy() {
        let args = [...arguments]
        args.forEach(arg => {
            this.groups = this.groups.concat(Type.isArray(arg) ? arg : [arg])
        })
        return this
    }

    orderBy(column, direction = 'asc') {
        let property = this.unions ? 'unionOrders' : 'orders';
        direction = direction.toLowerCase() === 'asc' ? 'asc' : 'desc';

        this[property].push({
            column: column,
            direction: direction
        })
        return this
    }

    select(columns) {
        let args = [...arguments]
        this.columns = Type.isArray(columns) ? columns : args;

        return this
    }

    ksort(object) {
        let keys = Object.keys(object)
        keys.sort()
        let newObj = {}
        for(let i in keys) {
            let k = keys[i];
            newObj[k] = object[k]
        }

        return newObj
    }

    async insert(values, result) {
        if (!values) {
            return true
        }
        if (!Type.isJSON(values[0])) {
            values = [values]
        } else {
            values.forEach((item, key) => {
                values[key] = this.ksort(item)
            })
        }

        let bindings = []

        values.forEach(record => {
            for(let i in record) {
                bindings.push(record[i])
            }
        })

        let sql = Grammar.compileInsert(this, values)

        let res = await this.exec(sql, this.cleanBindings(bindings))

        if (result) {
            result.insertId = res.insertId
        }

        return res ? res.affectedRows > 0 : false
    }

    async insertOrIgnore(values, result) {
        if (!values) {
            return 0
        }
        if (!Type.isJSON(values[0])) {
            values = [values]
        } else {
            values.forEach((item, key) => {
                values[key] = this.ksort(item)
            })
        }

        let bindings = []

        values.forEach(record => {
            for(let i in record) {
                bindings.push(record[i])
            }
        })

        let sql = Grammar.compileInsertOrIgnore(this, values)

        let res = await this.exec(sql, this.cleanBindings(bindings))

        if (result) {
            result.insertId = res.insertId
        }

        return res ? res.affectedRows : 0
    }

    async upsert(values, uniqueBy, update = null) {
        if (!values) {
            return 0
        } else if (update && Type.isArray(update) && update.length == 0) {
            return this.insert(values) ? 1 : 0;
        }
        if (!Type.isJSON(values[0])) {
            values = [values]
        } else {
            values.forEach((item, key) => {
                values[key] = this.ksort(item)
            })
        }

        if (update == null || Type.isNull(update)) {
            update = Object.keys(values[0])
        }

        let bindings = []

        values.forEach(record => {
            for(let i in record) {
                bindings.push(record[i])
            }
        })

        let sql = Grammar.compileUpsert(this, values, uniqueBy, update)

        let result = await this.exec(sql, this.cleanBindings(bindings))
        return result ? result.affectedRows: 0
    }

    async update(values) {
        let bindings = Object.values(values).concat(this.getBindings())

        let sql = Grammar.compileUpdate(this, values)

        let result = await this.exec(sql, this.cleanBindings(bindings))

        return result ? result.changedRows : 0
    }

    async delete(id = null) {
        id && this.where('id', '=', id)

        let sql = Grammar.compileDelete(this)
        return await this.exec(sql, this.getBindings())
    }

    toSql() {
        return Grammar.compileComponents(this)
    }

    static raw($value) {
        return new Expression($value);
    }

    /**
     * 查询列表
     * @returns array
     */
    async get(columns = ['*']) {
        if (Type.isNull(this.columns) || Type.isUndefined(this.columns)) {
            this.columns = columns
        }
        return await this.exec(this.toSql(), this.getBindings())
    }

    /**
     * 分页查询
     * @param {int} page
     * @param {int} perPage
     * @returns
     */
    async paginate(page = 1, perPage = DEFAULT_PER_PAGE) {
        page = parseInt(page)
        perPage = parseInt(perPage)
        if (isNaN(page) || page <= 0) {
            page = 1;
        }
        if (isNaN(perPage) || perPage <= 0) {
            perPage = DEFAULT_PER_PAGE;
        }
        if (perPage > MAX_PER_PAGE) {
            perPage = MAX_PER_PAGE;
        }

        let total = await this.getCountForPagination()
        let result = await this.take(perPage).skip((+page - 1) * perPage).get()

        return {
            total: total,
            perPage: perPage,
            lastPage: Math.ceil(total / perPage),
            currentPage: page,
            items: result,
        }
    }

    async getCountForPagination($columns = ['*']) {
        this.backupFieldsForCount()

        this.aggregate = {
            function: 'count',
            columns: this.clearSelectAliases($columns)
        }

        let results = await this.get()

        this.aggregate = null

        this.restoreFieldsForCount();

        if (Type.isArray(this.groups) && this.groups.length > 0) {
            return results.length
        }

        return Type.isArray(results) && results.length > 0 ? parseInt(results[0].aggregate) : 0
    }

    async count(columns = ['*']) {
        if (!Type.isArray(columns)) {
            columns = [columns]
        }

        return parseInt(await this.getAggregate('count', columns))
    }

    async min(column) {
        return await this.getAggregate('min', [column])
    }

    async max(column) {
        return await this.getAggregate('max', [column])
    }

    async sum(column) {
        let result = await this.getAggregate('sum', [column])
        return typeof(result) == 'undefined' || result == null ? 0 : result
    }

    async avg(column) {
        return await this.getAggregate('avg', [column])
    }

    async average(column) {
        return await this.getAggregate('avg', [column])
    }

    async getAggregate(func, columns = ['*']) {
        this.aggregate = {
            function: func,
            columns: columns
        }

        let previousColumns = this.columns

        let previousSelectBindings = this.bindings['select']

        this.bindings['select'] = []

        let result = await this.get(columns)

        this.aggregate = null

        this.columns = previousColumns
        this.bindings['select'] = previousSelectBindings

        if (Type.isArray(result) && result.length > 0) {
            result = result[0]
            return result.aggregate
        }
    }

    clearSelectAliases(columns) {
        columns.map(column => {
            let aliasPosition = column.toLowerCase().indexOf(' as ')
            return Type.isString(column) && aliasPosition !== -1 ? column.substring(0, aliasPosition) : column
        })

        return columns
    }

    backupFieldsForCount() {
        let fieldArr = ['orders', 'limit', 'offset', 'columns']
        fieldArr.forEach(field => {
            this.backups[field] = this[field]
            this[field] = null
        })

        let bindingArr = ['order', 'select']
        bindingArr.forEach(key => {
            this.bindingBackups[key] = this.bindings[key]
            this.bindings[key] = []
        })
    }

    /**
     * Restore some fields after the pagination count.
     *
     * @returns {void}
     */
    restoreFieldsForCount() {
        let fieldArr = ['orders', 'limit', 'offset', 'columns']
        fieldArr.forEach(field => {
            this[field] = this.backups[field]
        })

        let bindingArr = ['order', 'select']
        bindingArr.forEach(key => {
            this.bindings[key] = this.bindingBackups[key]
        })

        this.backups = []
        this.bindingBackups = []
    }

    /**
     * 第一条
     * @returns
     */
    async first() {
        let result = await this.take(1).get()

        if (Type.isArray(result) && result.length > 0) {
            result = result[0]
        } else {
            result = null
        }

        return result
    }

    /**
     * 查询单列值
     * @param {string} field 字段名
     * @param {mixed} defaultValue 默认值
     * @returns
     */
    async value(field, defaultValue = null) {
        let result = await this.select([field]).first()
        return result && result.hasOwnProperty(field) ? result[field] : defaultValue
    }
}

export default DB
