let assert = require('chai').assert;
let debug = require('debug')('nes:nestest');
let Rom = require('../rom').Rom;
let Memory = require('../memory').Memory;
let CPU = require('../cpu').CPU;
let nestest = require('./nestest_rom');
let log = require('./nestest_log').log;

describe('nestest', () => {
    it('executes as expected', function() {
        let rom = new Rom(nestest.byteArray());
        let memory = new Memory(rom.prgRom);
        let cpu = new CPU(memory);

        for (let i = 0; i < log.length; i++) {
            assert.equal(cpu.register.pc, log[i].pc);
            assert.equal(cpu.register.a, log[i].a);
            assert.equal(cpu.register.x, log[i].x);
            assert.equal(cpu.register.y, log[i].y);
            assert.equal(cpu.register.sp, log[i].sp);
            assert.equal(cpu.register.p, log[i].p);
            try {
                cpu.execute();
            } catch (e) {
                assert.fail(1,0,e);
            }
        }
    });
});