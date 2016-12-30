var assert = require('assert');
var rom = require('../rom')
var nestest = require('./nestest_rom');


describe('rom', () => {
    describe('load', () => {
        it('constructs from nestest.nes', function() {
            var romBuffer = nestest.byteArray();
            var r = new rom.Rom(romBuffer);
            assert.equal(r.prgRomSize, 1);
            assert.equal(r.chrRomSize, 1);

            assert(!r.trainer);
            assert(!r.mirroringVertical);
            assert(r.mirroringHorizontal);
            assert(!r.SRAM);
            assert(!r.trainer);

            assert(!r.playChoice10);
            assert(!r.vsGame);

            assert.equal(r.prgRamSize, 0);
        });
    });

});