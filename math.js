"use strict";

/** convert byte to signed javascript integer */
function signed(val) {
    if (val & 0b10000000) {
        return -((~val + 1) & 0xFF);
    } else {
        return val;
    }
}

/** return number between 0 - 255 */
function wrap(val) {
    return val & 0xFF;
}

function toBits(p) {
    let bits = p.toString(2);
    return '0'.repeat(8 % bits.length) + bits;
}

module.exports.signed = signed;
module.exports.wrap = wrap;
module.exports.toBits = toBits;