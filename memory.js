debug = require('debug')('nes:memory');

class Memory {
    constructor(prgRom) {

        // PRG-ROM, which is stored
        // $8000 - $10000
        this.prgRom = [prgRom[0]];
        if (prgRom.length == 1) {
            this.prgRom.push(prgRom[0]);
        } else {
            this.prgRom.push(prgRom[1]);
        }

        // $0000 - $0800 is RAM
        // $0100 - $0200 is stack
        // $0800-$2000 mirrors $0000-$07FFF
        this.ram = new Uint8Array(2*1024);
    }

    put8(addr, val) {
        if (addr < 0x800) {
            this.ram[addr] = val;
            return;
        } else if (addr < 0x2000) {
            this.ram[addr - 0x800] = val;
            return;
        }

        throw Error("invalid access $" + addr.toString(16));
    }

    put16(addr, val) {
        this.put8(addr, val & 0xFF);
        this.put8(addr+1, val >> 8 & 0xFF);
    }

    get8(addr) {
        // RAM
        if (addr < 0x800) {
            return this.ram[addr];
        } else if (addr < 0x2000) {
            return this.ram[addr - 0x800];
        }

        // PRG-ROM
        if (addr >= 0x8000 && addr < 0xC000) {
            return this.prgRom[0][addr - 0x8000];
        } else if (addr >= 0xC000 && addr <= 0x10000) {
            return this.prgRom[1][addr - 0xC000];
        }

        return 0;
    }

    get16(addr) {
        return (this.get8(addr+1) << 8) | this.get8(addr);
    }
};

module.exports.Memory = Memory;