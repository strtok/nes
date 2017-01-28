let assert = require('chai').assert;
let Rom = require('../rom').Rom;
let Memory = require('../memory').Memory;
let CPU = require('../cpu').CPU;
let Flag = require('../cpu').Flag;
let APU = require('../apu').APU;
let nestest = require('./nestest_rom');
let log = require('./nestest_log').log;
let printf = require('printf');

describe('nestest', () => {
    it('executes as expected', function() {
        let rom = new Rom(nestest.byteArray());
        let memory = new Memory(rom.prgRom, new APU());
        let cpu = new CPU(memory);

        const registers = ['pc', 'a', 'x', 'y', 'sp'];

        for (let i = 0; i < log.length; i++) {
            for (let r of registers) {
                assert.equal(printf("0x%02X", cpu[r]), printf("0x%02X", log[i][r]), r);
            }

            assert(cpu.p == log[i].p, `expected P: ${Flag.toString(log[i].p)}, but was P: ${Flag.toString(cpu.p)}`);

            try {
                cpu.execute();
            } catch (e) {
                assert.fail(1,0,e);
            }
        }
    });
});