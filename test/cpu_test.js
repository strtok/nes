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

    it('twos complement', () => {
        assert.equal(CPU.tc(0b00000001), 1);
        assert.equal(CPU.tc(0b00000010), 2);
        assert.equal(CPU.tc(0b01111111), 127);

        assert.equal(CPU.tc(0b10000000), -128);
        assert.equal(CPU.tc(0b11111111), -1);
        assert.equal(CPU.tc(0b11111110), -2);
    });

    describe('BCC', () => {
        it('RELATIVE with carry=1', () => {
            let cpu = makeCPU([0x90, 0x10]);
            cpu.p |= Flag.CARRY;
            const expectedPC = cpu.pc + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
        it('RELATIVE with carry=0', () => {
            let cpu = makeCPU([0x90, 0x10]);
            const expectedPC = cpu.pc + 0x10 + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
    });


    describe('BCD', () => {
        it('RELATIVE with carry=1', () => {
            let cpu = makeCPU([0xB0, 0x10]);
            cpu.p |= Flag.CARRY;
            const expectedPC = cpu.pc + 0x10 + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
        it('RELATIVE with carry=0', () => {
            let cpu = makeCPU([0xB0, 0x10]);
            const expectedPC = cpu.pc + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
    });

    describe('BEQ', () => {
        it('RELATIVE with zero=1', () => {
            let cpu = makeCPU([0xF0, 0x10]);
            cpu.p |= Flag.ZERO;
            const expectedPC = cpu.pc + 0x10 + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
        it('RELATIVE with zero=0', () => {
            let cpu = makeCPU([0xF0, 0x10]);
            const expectedPC = cpu.pc + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
    });

    describe('CLC', () => {
        it('IMPLICIT', () => {
            // SEC then CLC
            let cpu = makeCPU([0x38, 0x18]);
            cpu.execute();
            cpu.execute();
            assert.equal(cpu.p & Flag.CARRY, 0);
        })
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

    describe('LDA', () => {
        it('IMMEDIATE', () => {
            let cpu = makeCPU([0xA9, 0xEF]);
            cpu.execute();
            assert.equal(cpu.a, 0xEF);
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