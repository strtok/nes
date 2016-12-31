let assert = require('chai').assert;
let debug = require('debug')('nes:nestest');
let Rom = require('../rom').Rom;
let Memory = require('../memory').Memory;
let nestest = require('./nestest_rom');
let log = require('./nestest_log').log;

describe('nestest', () => {
    it('executes as expected', function() {
        let rom = new Rom(nestest.byteArray());
        let memory = new Memory(rom.prgRom);
    });
});