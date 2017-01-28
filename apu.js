"use strict";

class APU {

    constructor() {
        this.registers = new Uint8Array(24);
    }

    get8(addr) {
        return this.registers[addr - 0x4000];
    }

    put8(addr, value) {
        this.registers[addr - 0x4000] = value;
    }
}

module.exports.APU = APU;

