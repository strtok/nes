let assert = require('chai').assert;
let Rom = require('../rom').Rom;
let Memory = require('../memory').Memory;
let CPU = require('../cpu').CPU;
let Flag = require('../cpu').Flag;
let nestest = require('./nestest_rom');
let log = require('./nestest_log').log;
let toBits = require('../math').toBits

describe('nestest', () => {
    it('executes as expected', function() {
        let rom = new Rom(nestest.byteArray());
        let memory = new Memory(rom.prgRom);
        let cpu = new CPU(memory);

        for (let i = 0; i < log.length; i++) {
            assert.equal(cpu.pc, log[i].pc, "pc");
            assert.equal(cpu.a, log[i].a, "a");
            assert.equal(cpu.x, log[i].x, "x");
            assert.equal(cpu.y, log[i].y, "y");
            assert.equal(cpu.sp, log[i].sp, "sp");

            assert(cpu.p == log[i].p, `expected P: ${Flag.toString(log[i].p)}, but was P: ${Flag.toString(cpu.p)}`);

            try {
                cpu.execute();
            } catch (e) {
                assert.fail(1,0,e);
            }
        }
    });
});