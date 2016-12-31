class Memory {
    constructor(prgRom) {
        this.prgRom = [prgRom[0]];
        if (prgRom.length == 1) {
            this.prgRom.push(prgRom[0]);
        } else {
            this.prgRom.push(prgRom[1]);
        }
    }

    get8(addr) {
        if (addr >= 0x8000 && addr < 0xC000) {
            return this.prgRom[0][addr - 0x8000];
        } else if (addr >= 0xC000 && addr <= 0x10000) {
            return this.prgRom[1][addr - 0xC000];
        }
        return 0;
    }
};

module.exports.Memory = Memory;