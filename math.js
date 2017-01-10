function tc(val) {
    if (val & 0b10000000) {
        return -((~val + 1) & 0xFF);
    } else {
        return val;
    }
}

function toBits(p) {
    let bits = p.toString(2);
    return '0'.repeat(8 % bits.length) + bits;
}

module.exports.tc = tc;
module.exports.toBits = toBits;