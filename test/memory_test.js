const assert = require('chai').assert;
const Memory = require('../memory').Memory;

describe('memory', () => {

    /*  PRG-ROM is loaded at $8000 and $C0000. If only one
        bank is available, then it is loaded in both locations
        so that the interrupt vector table is loaded properly at
        $FFFA - $FFFF
     */
    it('maps single PRG-ROM duplicated at $8000 and $C000', function() {
        const prgRom = [new Uint8Array(16*1024)];
        prgRom[0].fill(0xCE);
        const memory = new Memory(prgRom);
        assert.equal(memory.get8(0x8000), 0xCE);
        assert.equal(memory.get8(0xC000), 0xCE);
    });

    it('maps PRG-ROM at $8000 and $C000', function() {
        const prgRom = [new Uint8Array(16*1024), new Uint8Array(16*1024)];
        prgRom[0].fill(0xCE);
        prgRom[1].fill(0xFE);
        const memory = new Memory(prgRom);
        assert.equal(memory.get8(0x8000), 0xCE);
        assert.equal(memory.get8(0xC000), 0xFE);
    });

    it('mirrors memory at $800-$2000', function() {
        const memory = new Memory([new Uint8Array(16*1024)]);
        memory.put8(0x0, 42);
        assert.equal(memory.get8(0x0), 42);
        assert.equal(memory.get8(0x800), 42);

        memory.put8(0x801, 12);
        assert.equal(memory.get8(0x801), 12);
        assert.equal(memory.get8(0x1), 12);
    });
});