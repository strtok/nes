/*
     NES 2.0 Rom Format:
     http://wiki.nesdev.com/w/index.php/NES_2.0
 */

let assert = require("assert");
const _ = require("underscore");
let debug = require("debug")("nes:rom");

class Rom {

    constructor(uint8Array) {
        this.data = uint8Array;
        this.prgRom = [];
        this.chrRom = [];

        // bytes 0-3 must be "NES<0x1A>"
        const header = new Uint8Array([78, 69, 83, 0x1A]);
        if (!_.isEqual(this.data.slice(0,4), header)) {
            throw "NES header missing";
        }

        // byte 4 is the number of 16k ROM pages
        this.prgRomSize = this.data[4];

        // byte 5 is the number of 8k ROM pages (0 indicates CHR RAM)
        this.chrRomSize = this.data[5];

        // byte 6 flags
        // 7       0
        // ---------
        // NNNN FTBM
        //
        // N: Lower 4 bits of the mapper number
        // F: Four screen mode. 0 = no, 1 = yes. (When set, the M bit has no effect)
        // T: Trainer.  0 = no trainer present, 1 = 512 byte trainer at 7000-71FFh
        // B: SRAM at 6000-7FFFh battery backed.  0= no, 1 = yes
        // M: Mirroring.  0 = horizontal, 1 = vertical.
        const flag6 = this.data[6];
        this.fourScreenMode = !!(flag6 & 0b00001000);
        this.hasTrainer = !!(flag6 & 0b00000100);
        this.SRAM = !!(flag6 & 0b00000010);
        this.mirroringVertical = !!(flag6 & 0b00000001);

        // byte 7 flags
        // 7       0
        // ---------
        // NNNN xxPV
        //
        // N: Upper 4 bits of the mapper number
        // P: Playchoice 10.  When set, this is a PC-10 game
        // V: Vs. Unisystem.  When set, this is a Vs. game
        // x: these bits are not used in iNES.
        const flag7 = this.data[7];
        this.playChoice10 = !!(flag7 & 0b00000010);
        this.vsGame = !!(flag7 & 0b00000001);

        //byte 8 indicates size of PRG RAM in 8KB units
        this.prgRamSize = this.data[8];

        // Check if the remaining bytes in the rom match what's
        // expected from the header
        const expectedSize = this.prgRomSize * 16*1024 +
                           this.chrRomSize * 8*1024 +
                           this.hasTrainer * 512 +
                           16;

        if (this.data.length != expectedSize) {
            throw `Expected ROM to be ${expectedSize} bytes based on header, but was ${this.data.size}`;
        }

        let index = 16;

        // store hasTrainer
        if (this.hasTrainer) {
            this.hasTrainer = this.data.slice(index, index+512);
            index += 512;
        }

        for (let i = 0; i < this.prgRomSize; i++) {
            this.prgRom.push(this.data.slice(index, index+16*1024));
            index += 16*1024;
        }

        for (let i = 0; i < this.chrRomSize; i++) {
            this.chrRom.push(this.data.slice(index, index+8*1024));
            index += 8*1024;
        }
    }

    get mirroringHorizontal () { return !this.mirroringVertical; }
}

module.exports.Rom = Rom;