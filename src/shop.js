let fs = require("fs")

module.exports = class shop {
    constructor() {
        this.file = "./stock.json"
    }

    stock() {
        return JSON.parse(fs.readFileSync(this.file))
    }

    left(key) {
        let s = this.stock()
        if (s[key]) {
            return s[key].length
        }
        return 0
    }

    take(key) {
        let s = this.stock()
        if (!s[key] || s[key].length == 0) {
            return null
        }
        let code = s[key].shift()
        fs.writeFileSync(this.file, JSON.stringify(s, null, 2))
        return code
    }

    add(key, codes) {
        let s = this.stock()
        if (!s[key]) {
            s[key] = []
        }
        s[key] = s[key].concat(codes)
        fs.writeFileSync(this.file, JSON.stringify(s, null, 2))
        return s[key].length
    }
}
