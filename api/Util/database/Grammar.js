import Type from "./Type.js";
import Expression from "./Expression.js";

export default {

    selectComponents: [
        'aggregate',
        'columns',
        'from',
        'joins',
        'wheres',
        'groups',
        'havings',
        'orders',
        'limit',
        'offset',
        'unions',
        'lock',
    ],

    defaultTablePrefix: '',

    ucfirst(str) {
        return str.toLowerCase().replace(/( |^)[a-z]/g, (L) => L.toUpperCase())
    },

    compileComponents(query) {
        let sql = []
        this.selectComponents.forEach(component => {
            let func = 'compile' + this.ucfirst(component)
            if ((!Type.isArray(query[component]) && !!query[component] || Type.isArray(query[component]) && query[component].length > 0) && Type.isFunction(this[func])) {
                sql.push(this[func](query, query[component]))
            }
        })

        return sql.join(' ')
    },

    compileSelect(query) {
        if (!Type.isArray(query.columns) || query.columns.length === 0) {
            query.columns = ['*'];
        }

        return this.concatenate(this.compileComponents(query))
    },

    compileAggregate(query, aggregate) {
        let column = this.columnize(query, aggregate.columns)

        if (query.distinct && column !== '*') {
            column = 'distinct ' . column
        }

        return `select  ${aggregate.function} (${column}) as aggregate`
    },

    compileColumns(query) {
        if (query.aggregate) {
            return
        }

        if (!Type.isArray(query.columns) || query.columns.length === 0) {
            query.columns = ['*'];
        }

        let select = query.distinct ? 'select distinct ' : 'select '
        return select + this.columnize(query, query.columns)
    },

    compileFrom(query, table) {
        return 'from ' + this.wrapTable(query, table)
    },

    compileJoins(query, joins) {
        let sql = []

        joins.forEach(join => {
            let table = this.wrapTable(query, join.table)
            let clauses = []

            join.clauses.forEach(clause => {
                clauses.push(this.compileJoinConstraint(query, clause))
            })

            clauses[0] = this.removeLeadingBoolean(clauses[0])
            clauses = clauses.join(' ')

            sql.push(`${join.type} join ${table} on ${clauses}`)
        })

        return sql.join(' ')
    },

    compileJoinConstraint(query, clause) {
        if (clause.nested) {
            return this.compileNestedJoinConstraint(query, clause)
        }

        let first = this.wrap(query, clause.first)
        let second = ''
        if (clause.where) {
            if (clause.operator === 'in' || clause.operator === 'not in') {
                let arr = new Array(clause['second']).fill('?')

                second = '(' + arr.join(', ') + ')';
            } else {
                second = '?';
            }
        } else {
            second = this.wrap(query, clause.second)
        }

        return `${clause.boolean} ${first} ${clause.operator} ${second}`
    },

    compileNestedJoinConstraint(query, clause) {
        let clauses = []

        clause.join.clauses.forEach(nestedClause => {
            clauses.push(this.compileJoinConstraint(query, nestedClause))
        })

        clauses[0] = this.removeLeadingBoolean(clauses[0])

        clauses = clauses.join(' ')

        return `${clause.boolean} ${clauses}`
    },

    compileWheres(query, wheres) {
        let sql = []

        if (Type.isNull(query.wheres) || Type.isUndefined(query.wheres)) {
            return '';
        }

        query.wheres.forEach(where => {
            let method = 'where' + this.ucfirst(where['type'])
            if (Type.isFunction(this[method])) {
                sql.push(where['boolean'] + ' ' + this[method](query, where))
            }
        })
        if (sql.length > 0) {
            sql = sql.join(' ')
            return 'where ' + this.removeLeadingBoolean(sql)
        }
        return ''
    },

    compileGroups(query, groups) {
        return 'group by ' + this.columnize(query, groups);
    },

    compileOrders(query, orders) {
        let sqls = []
        orders.forEach(order => {
            if (order.hasOwnProperty('sql')) {
                return sqls.push(order.sql)
            }

            return sqls.push(this.wrap(query, order.column) + ' ' + order.direction)
        })
        return 'order by ' + sqls.join(', ')
    },

    compileLimit(query, limit) {
        return 'limit ' + limit
    },

    compileOffset(query, offset) {
        return 'offset ' + offset
    },

    compileInsert(query, values) {
        let table = this.wrapTable(query, query.from)
        !Type.isJSON(values[0]) && (values = [values])

        let columns = this.columnize(query, Object.keys(values[0]))

        let parameters = []

        values.forEach(record => {
            parameters.push('(' + this.parameterize(Object.values(record)) + ')')
        })

        parameters = parameters.join(', ')

        return `insert into ${table} (${columns}) values ${parameters}`
    },

    compileInsertOrIgnore(query, values) {
        let res = this.compileInsert(query, values)
        return res ? res.replace(/insert/i, 'insert ignore') : res
    },

    compileUpsert(query, values, uniqueBy, update) {
        let sql = this.compileInsert(query, values) + ' on duplicate key update '
        
        let columns = []
        if (update) {
            let isArray = Type.isArray(update)
            for (let key in update) {
                let value = update[key]
                columns.push(
                    isArray
                    ? this.wrap(query, value) + ' = values(' + this.wrap(query, value) + ')'
                    : this.wrap(query, key) + ' = ' + this.parameter(value)
                )
            }
        }
        
        return sql + columns.join(', ')
    },

    compileUpdate(query, values) {
        let table = this.wrapTable(query, query.from)

        let columns = []
        for(let key in values) {
            columns.push(this.wrap(query, key) + '=' + this.parameter(values[key]))
        }

        columns = columns.join(', ')
        let joins = ''
        if (Type.isArray(query.joins) && query.joins.length > 0) {
            joins = ' ' + this.compileJoins(query, query.joins)
        }

        let where = this.compileWheres(query)

        return `update ${table} ${joins} set ${columns} ${where}`
    },

    compileDelete(query) {
        let table = this.wrapTable(query, query.from)

        let where = Type.isArray(query.wheres) ? this.compileWheres(query) : ''

        return `delete from ${table} ${where}`
    },

    columnize(query, columns) {
        return columns.map(column => {
            return this.wrap(query, column)
        }).join(', ')
    },

    isExpression(value) {
        return value instanceof Expression
    },

    getValue(value) {
        return value.getValue()
    },

    wrap(query, value, prefixAlias = false) {
        if (this.isExpression(value)) {
            return this.getValue(value)
        }

        let segments = []

        if (typeof(value) != 'string') {
            // console.warn("[DB.Grammar -> wrap] The value is not a string type, value: ", value)
            if (value) {
                value = value.toString()
            }
        }
        if (value.toLowerCase().indexOf(' as ') !== -1) {
            segments = value.split(' ')
            if (prefixAlias) {
                segments[2] = this.getTablePrefix(query) + segments[2]
            }

            return this.wrap(query, segments[0]) + ' as ' + this.wrapValue(segments[2])
        }

        let wrapped = [];
        segments = value.split('.')
        segments.map((segment, key) => {
            if (key === 0 && segments.length > 1) {
                wrapped.push(this.wrapTable(query, segment))
            } else {
                wrapped.push(segment)
            }
        })

        return wrapped.join('.')
    },

    wrapValue(value) {
        if (value === '*') {
            return value;
        }

        value = value.replace('"', '""')
        return `"${value}"`;
    },

    wrapTable(query, table = '') {
        if (this.isExpression(table)) {
            return this.getValue(table)
        }
        return this.wrap(query, this.getTablePrefix(query) + table, true);
    },

    getTablePrefix(query) {
        if (query && typeof(query.getPrefix) == 'function') {
            return query.getPrefix()
        } else {
            console.log('+++++ Grammar.getTablePrefix, Warn: Use defaultTablePrefix, ' + (query ? 'query.getPrefix is not function' : 'query is undefined'))
            return this.defaultTablePrefix
        }
    },

    parameterize(values) {
        return values.map(item => {
            return this.parameter(item)
        }).join(', ')
    },

    parameter(value) {
        return value instanceof Expression ? value.getValue() : '?'
    },
    
    whereBasic(query, where) {
        let value = this.parameter(where.value)
        return this.wrap(query, where.column) + ' ' + where.operator + ' ' + value
    },

    whereNested(query, where) {
        let nested = where.query

        return '(' + this.compileWheres(nested).substring(6) + ')'
    },

    whereIn(query, where) {
        if (!where.hasOwnProperty('values') || !Type.isArray(where.values) || Type.isArray(where.values) && where.values.length === 0) {
            return '0 = 1'
        }

        let values = this.parameterize(where.values)

        return this.wrap(query, where.column) + ' in (' + values + ')'
    },

    whereNotIn(query, where) {
        if (!where.hasOwnProperty('values') || !Type.isArray(where.values) || Type.isArray(where.values) && where.values.length === 0) {
            return '1 = 1'
        }

        let values = this.parameterize(where.values)

        return this.wrap(query, where.column) + ' not in (' + values + ')'
    },

    whereInSub(query, where) {
        let select = this.compileSelect(where.query)

        return this.wrap(query, where.column) + ' in (' + select + ')'
    },

    whereNotInSub(query, where) {
        let select = this.compileSelect(where.query)

        return this.wrap(query, where.column) + ' not in (' + select + ')'
    },

    whereNull(query, where) {
        return this.wrap(query, where.column) + ' is null'
    },

    whereNotNull(query, where) {
        return this.wrap(query, where.column) + ' is not null'
    },

    whereBetween(query, where) {
        let between = where.not ? 'not between' : 'between'

        return this.wrap(query, where.column) + ' ' + between + ' ? and ?'
    },

    whereRaw(query, where) {
        return where.sql
    },

    removeLeadingBoolean(sql) {
        return sql.replace(/and |or /i, '')
    },

    concatenate(segments) {
        return segments.filter(value => {
            return (value + '') !== ''
        }).join(' ')
    },

    setDefaultTablePrefix(prefix) {
        this.defaultTablePrefix = prefix
    },

}