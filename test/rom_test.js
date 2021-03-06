const assert = require('chai').assert;
const Rom = require('../rom').Rom;
const nestest = require('./nestest_rom');

describe('rom', () => {
    it('constructs from nestest.nes', function() {
        const romBuffer = nestest.byteArray();
        const r = new Rom(romBuffer);

        assert.equal(r.prgRomSize, 1);
        assert.equal(r.prgRom.length, 1);
        assert.equal(r.prgRom[0].length, 16*1024);

        assert.equal(r.chrRomSize, 1);
        assert.equal(r.chrRom.length, 1);
        assert.equal(r.chrRom[0].length, 8*1024);

        assert(!r.hasTrainer);
        assert(!r.mirroringVertical);
        assert(r.mirroringHorizontal);
        assert(!r.SRAM);
        assert(!r.hasTrainer);

        assert(!r.playChoice10);
        assert(!r.vsGame);

        assert.equal(r.prgRamSize, 0);
    });
});