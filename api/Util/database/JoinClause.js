import Type from "./Type.js"

class JoinClause {

    constructor(type, table) {
        this.type = type
        this.table = table
        this.clauses = []
        this.bindingds = []
    }

    on(first, operator = null, second = null, boolean = 'and', where = false) {
        if (Type.isFunction(first)) {
            return this.nest(first, boolean)
        }

        let args = [...arguments]
        if (args.length < 3) {
            throw new Error('Not enough arguments for the on clause.');
        }

        if (where) {
            this.bindingds.push(second)
        }

        if (where && (operator === 'in' || operator === 'not in') && Type.isArray(second)) {
            second = second.length
        }

        this.clauses.push({
            first: first,
            operator: operator,
            second: second,
            boolean: boolean,
            where: where,
            nested: false
        })

        return this
    }

    where(first, operator = null, second = null, boolean = 'and') {
        this.on(first, operator, second, boolean, true)
    }

    nest(callback, boolean) {
        let join = new JoinClause(this.type, this.table)
        
        callback(join)

        if (join.clauses.length > 0) {

            this.clauses.push({
                nested: true,
                join: join,
                boolean: boolean
            })

            this.bindingds = this.bindingds.concat(join.bindingds)
        }

        return this
    }
}

export default JoinClause