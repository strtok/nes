var assert = require('assert');
var rom = require('../rom')
var nestest = require('./nestest_rom');


describe('rom', () => {
    describe('load', () => {
        it('constructs from nestest', function() {
            var romBuffer = nestest.byteArray();
            var r = new rom.Rom(romBuffer);
            assert.equal(r.romPages16, 1);
            assert.equal(r.romPages8, 1);

        });
    });

});