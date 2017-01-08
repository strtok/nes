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

    describe('ADD', () => {
        it('(IMMEDIATE', () => {
            let cpu = makeCPU([0x29, 0b10101010]);
            cpu.a = 0b01011010;
            cpu.execute();
            assert.equal(cpu.a, 0b00001010);
            assert.equal(cpu.p & Flag.NEGATIVE, 0);
        });
        it('(ZEROPAGE', () => {
            let cpu = makeCPU([0x25, 0x10]);
            cpu.memory.put8(0x10,0b10101010);
            cpu.a = 0b11110000;
            cpu.execute();
            assert.equal(cpu.a, 0b10100000);
            assert.equal(cpu.p & Flag.NEGATIVE, Flag.NEGATIVE);
        });
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

    describe('BNE', () => {
        it('RELATIVE with zero=0', () => {
            let cpu = makeCPU([0xF0, 0x10]);
            const expectedPC = cpu.pc + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
        it('RELATIVE with zero=1', () => {
            let cpu = makeCPU([0xF0, 0x10]);
            cpu.p |= Flag.ZERO;
            const expectedPC = cpu.pc + + 0x10 + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
    });

    describe('BMI', () => {
        it('RELATIVE with negative=0', () => {
            let cpu = makeCPU([0x30, 0x20]);
            const expectedPC = cpu.pc + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
        it('RELATIVE with negative=1', () => {
            let cpu = makeCPU([0x30, 0x20]);
            cpu.p |= Flag.NEGATIVE;
            const expectedPC = cpu.pc + 0x20 + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
    });

    describe('BPL', () => {
        it('RELATIVE with negative=0', () => {
            let cpu = makeCPU([0x10, 0x20]);
            const expectedPC = cpu.pc + 0x20 + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
        it('RELATIVE with negative=1', () => {
            let cpu = makeCPU([0x10, 0x20]);
            cpu.p |= Flag.NEGATIVE;
            const expectedPC = cpu.pc + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
    });

    describe('BVC', () => {
        it('RELATIVE with overflow=0', () => {
            let cpu = makeCPU([0x50, 0x10]);
            const expectedPC = cpu.pc + 0x10 + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
        it('RELATIVE with overflow=1', () => {
            let cpu = makeCPU([0x50, 0x10]);
            cpu.p |= Flag.OVERFLOW;
            const expectedPC = cpu.pc + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
    });

    describe('BVS', () => {
        it('RELATIVE with overflow=0', () => {
            let cpu = makeCPU([0x70, 0x10]);
            const expectedPC = cpu.pc + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
        it('RELATIVE with overflow=1', () => {
            let cpu = makeCPU([0x70, 0x10]);
            cpu.p |= Flag.OVERFLOW;
            const expectedPC = cpu.pc + 0x10 + 2;
            cpu.execute();
            assert.equal(cpu.pc, expectedPC);
        });
    });

    describe('BIT', () => {
        it('ZEROPAGE with mask=0xFF and mem=OVERFLOW', () => {
            let cpu = makeCPU([0x24, 0x00]);
            cpu.a = Flag.OVERFLOW;
            cpu.memory.put8(0x00, Flag.OVERFLOW)
            cpu.execute();
            assert.equal(cpu.p & Flag.OVERFLOW, Flag.OVERFLOW, "overflow flag");
            assert.equal(cpu.p & Flag.NEGATIVE, 0, "negative flag");
            assert.equal(cpu.p & Flag.ZERO, 0, "zero flag");
        });
        it('ZEROPAGE with mask=0xFF and mem=NEGATIVE', () => {
            let cpu = makeCPU([0x24, 0x00]);
            cpu.a = Flag.NEGATIVE;
            cpu.memory.put8(0x00, Flag.NEGATIVE)
            cpu.execute();
            assert.equal(cpu.p & Flag.OVERFLOW, 0, "overflow flag");
            assert.equal(cpu.p & Flag.NEGATIVE, Flag.NEGATIVE, "negative flag");
        });
        it('ZEROPAGE with mask=0 and mem=0xFF', () => {
            let cpu = makeCPU([0x24, 0x00]);
            cpu.a = 0;
            cpu.memory.put8(0x00, 0xFF)
            cpu.execute();
            assert.equal(cpu.p & Flag.OVERFLOW, 0, "overflow flag");
            assert.equal(cpu.p & Flag.NEGATIVE, 0, "negative flag");
            assert.equal(cpu.p & Flag.ZERO, Flag.ZERO, "zero flag");
        });
        it('ABSOLUTE with mask=0 and mem=0xFF', () => {
            let cpu = makeCPU([0x2C, 0xF0, 0x02]);
            cpu.a = 0;
            cpu.memory.put8(0x02F0, 0xFF)
            cpu.execute();
            assert.equal(cpu.p & Flag.OVERFLOW, 0, "overflow flag");
            assert.equal(cpu.p & Flag.NEGATIVE, 0, "negative flag");
        });
        it('ABSOLUTE with mask=OVERFLOW and mem=0xFF', () => {
            let cpu = makeCPU([0x2C, 0xF0, 0x02]);
            cpu.a = Flag.OVERFLOW;
            cpu.memory.put8(0x02F0, 0xFF)
            cpu.execute();
            assert.equal(cpu.p & Flag.OVERFLOW, Flag.OVERFLOW, "overflow flag");
            assert.equal(cpu.p & Flag.NEGATIVE, 0, "negative flag");
        });
        it('ABSOLUTE with mask=NEGATIVE and mem=OVERFLOW', () => {
            let cpu = makeCPU([0x2C, 0xF0, 0x02]);
            cpu.a = Flag.NEGATIVE;
            cpu.memory.put8(0x02F0, Flag.OVERFLOW)
            cpu.execute();
            assert.equal(cpu.p & Flag.OVERFLOW, 0, "overflow flag");
            assert.equal(cpu.p & Flag.NEGATIVE, 0, "negative flag");
            assert.equal(cpu.p & Flag.ZERO, Flag.ZERO, "zero flag");
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
        });
        it('INDIRECT_Y', () => {
            let cpu = makeCPU([0xB1, 0xA0]);
            cpu.y = 0x4;
            cpu.memory.put8(0xA4, 0xFC);
            cpu.execute();
            assert.equal(cpu.a, 0xFC);
        });
    });

    describe('LDX', () => {
        it('IMMEDIATE', () => {
            let cpu = makeCPU([0xA2, 0xEF]);
            cpu.execute();
            assert.equal(cpu.x, 0xEF);
        })
    });

    describe('PHP', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x08]);
            cpu.p = 0x8A;
            cpu.execute();
            // bit 4 and 5 are always set to one in the pushed stack value
            assert.equal(cpu.pop8(), 0xBA);
        })
    });

    describe('PLA', () => {
        it('IMPLICIT set flag when negative', () => {
            let cpu = makeCPU([0x68]);
            cpu.push8(0xAA);
            cpu.execute();
            assert.equal(cpu.a, 0xAA);
            assert.equal(cpu.p & Flag.NEGATIVE, Flag.NEGATIVE);
            assert.equal(cpu.p & Flag.ZERO, 0);
        });
        it('IMPLICIT set flag when zero', () => {
            let cpu = makeCPU([0x68]);
            cpu.push8(0);
            cpu.execute();
            assert.equal(cpu.a, 0);
            assert.equal(cpu.p & Flag.NEGATIVE, 0);
            assert.equal(cpu.p & Flag.ZERO, Flag.ZERO);
        });
    });

    describe('PLP', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x28]);
            cpu.push8(0x8A);
            cpu.execute();
            // not identical to the value in the stack
            // because bit 5 is stuck at 1 in the p register
            assert.equal(cpu.p, 0xAA);
        })
    });

    describe('RTS', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x60]);
            cpu.push16(0x12);
            cpu.execute();
            assert.equal(cpu.pc, 0x13);
        })
    });

    describe('SEC', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x38]);
            cpu.execute();
            assert.equal(cpu.p & Flag.CARRY, Flag.CARRY);
        })
    });

    describe('SED', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0xF8]);
            cpu.execute();
            assert.equal(cpu.p & Flag.BCD, Flag.BCD);
        })
    });

    describe('SEI', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x78]);
            cpu.execute();
            assert.equal(cpu.p & Flag.INTERRUPT, Flag.INTERRUPT);
        })
    });

    describe('STA', () => {
        it('ZEROPAGE', () => {
            let cpu = makeCPU([0x85, 0x00]);
            cpu.a = 0x42;
            cpu.execute();
            assert.equal(cpu.memory.get8(0x00), 0x42);
            assert.equal(cpu.p & Flag.ZERO, 0);
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