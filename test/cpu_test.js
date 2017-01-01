const assert = require('chai').assert;
const Memory = require('../memory').Memory;
const CPU = require('../cpu').CPU;
const Flag = require('../cpu').Flag;

function makeCPU(code) {
    let prgRom = new Uint8Array(16*1024);
    prgRom.set(code);
    return new CPU(new Memory([prgRom]));
}

describe('CPU', () => {

    it('throws on executing unknown instruction', () => {
        let memory = new Memory([[0x00]]);
        let cpu = new CPU(memory);
        assert.throws(cpu.execute, Error);
    });


    describe('JMP', () => {
        it('ABSOLUTE', () => {
            let cpu = makeCPU([0x4C, 0xBC, 0xCA]);
            cpu.execute();
            assert.equal(cpu.pc, 0xCABC);
        })
    });

    describe('JSR', () => {
        it('ABSOLUTE', () => {
            let cpu = makeCPU([0x20, 0xBC, 0xCA]);
            cpu.execute();
            assert.equal(cpu.pc, 0xCABC);
            assert.equal(cpu.memory.get16(0x01FD), 0xC002);
        })
    });

    describe('LDX', () => {
        it('IMMEDIATE', () => {
            let cpu = makeCPU([0xA2, 0xEF]);
            cpu.execute();
            assert.equal(cpu.x, 0xEF);
        })
    });

    describe('SEC', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x38]);
            cpu.execute();
            assert.equal(cpu.p & Flag.CARRY, Flag.CARRY);
        })
    });

    describe('STX', () => {
        it('ZEROPAGE', () => {
            let cpu = makeCPU([0x86, 0x00]);
            cpu.x = 0x42;
            cpu.execute();
            assert.equal(cpu.memory.get8(0x00), 0x42);
            assert.equal(cpu.p & Flag.ZERO, 0);
        })
    });

});