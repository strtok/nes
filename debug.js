let dbg = require('debug');

module.exports = (cat) => {
    let log = dbg(cat);
    log.log = console.log.bind(console);
    return log;
};