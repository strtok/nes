function tc(val) {
    if (val & 0b10000000) {
        return -((~val + 1) & 0xFF);
    } else {
        return val;
    }
}

module.exports.tc = tc;