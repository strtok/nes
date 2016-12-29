/*
     NES 2.0 Rom Format:
     http://wiki.nesdev.com/w/index.php/NES_2.0
 */
var assert = require("assert");
var _ = require("underscore");

class Rom {
    constructor(uint8Array) {
        this.data = uint8Array;

        // bytes 0-3 must be "NES<0x1A>"
        const header = new Uint8Array([78, 69, 83, 0x1A]);
        if (!_.isEqual(this.data.slice(0,4), header)) {
            throw "NES header missing";
        }

        // byte 4 is the number of 16k ROM pages
        this.romPages16 = this.data[4];

        // byte 5 is the number of 8k ROM pages (0 indicates CHR RAM)
        this.romPages8 = this.data[5];

        // byte 6 and 7 contain various flags
        // 7       0
        // ---------
        // NNNN FTBM
        //
        // N: Lower 4 bits of the mapper number
        // F: Four screen mode. 0 = no, 1 = yes. (When set, the M bit has no effect)
        // T: Trainer.  0 = no trainer present, 1 = 512 byte trainer at 7000-71FFh
        // B: SRAM at 6000-7FFFh battery backed.  0= no, 1 = yes
        // M: Mirroring.  0 = horizontal, 1 = vertical.
    }
}

module.exports.Rom = Rom