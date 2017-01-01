let dbg = require('debug');
let printf = require('printf');

function hex(val) {
    return format("%04x", val).slice(2);
}

module.exports = (cat) => {
    // 1 byte uppercase hex
    dbg.formatters.b = (val) => {
        return printf("%02X", val)
    };

    // 2 byte address uppercase hex
    dbg.formatters.a = (val) => {
        return printf("$%04X", val);
    };

    let log = dbg(cat);
    log.log = console.log.bind(console);
    return log;
};