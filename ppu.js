"use strict";

class PPU {

    constructor() {
        // data bus acts as an 8-bit latch
        this.genLatch = 0x00;
        this.oam = new Uint8Array(256);

        this.ctrl = 0x00;
        this.mask = 0x00;
        this.status = 0x00;
        this.oamaddr = 0x00;
        this.oamdata = 0x00;
        this.scroll = 0x00;
        this.addr = 0x00;
        this.data = 0x00;

        this.registers = {
            0: this.ctrl,
            1: this.mask,
            2: this.status,
            3: this.oamaddr,
            4: this.oamdata,
            5: this.scroll,
            6: this.addr,
            7: this.data
        }
    }

    get8(addr) {
        return this.registers[addr % 8];
    }

    put8(addr, value) {
        this.registers[addr % 8] = value;
    }
}

module.exports.PPU = PPU;

