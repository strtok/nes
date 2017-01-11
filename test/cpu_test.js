const Memory = require('../memory').Memory;
const CPU = require('../cpu').CPU;
const Flag = require('../cpu').Flag;

const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;

chai.Assertion.addMethod("flag", function(flag) {
    let cpu = this._obj;

    // first, our instanceof check, shortcut
    new chai.Assertion(cpu).to.be.instanceof(CPU);

    // second, our type check
    this.assert(
        (cpu.p & flag) == flag,
        "expected flag to be set",
        "expected flag not to be set",
        flag,        // expected
        cpu.p & flag // actual
    );
});

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

    describe('ADC', () => {
        it('IMMEDIATE', () => {
            let cpu = makeCPU([0x69, 0x10]);
            cpu.a = 0x10;
            cpu.execute();
            assert.equal(cpu.a, 0x20);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.OVERFLOW);
            expect(cpu).not.flag(Flag.CARRY);
        });
        it('IMMEDIATE unsigned overflow', () => {
            let cpu = makeCPU([0x69, 0x20]);
            cpu.a = 0xF0;
            cpu.execute();
            assert.equal(cpu.a, 0x10);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.OVERFLOW);
            expect(cpu).not.flag(Flag.CARRY);
        });
    });

    describe('AND', () => {
        it('IMMEDIATE', () => {
            let cpu = makeCPU([0x29, 0b10101010]);
            cpu.a = 0b01011010;
            cpu.execute();
            assert.equal(cpu.a, 0b00001010);
            expect(cpu).not.flag(Flag.NEGATIVE);
        });
        it('ZEROPAGE', () => {
            let cpu = makeCPU([0x25, 0x10]);
            cpu.memory.put8(0x10,0b10101010);
            cpu.a = 0b11110000;
            cpu.execute();
            assert.equal(cpu.a, 0b10100000);
            expect(cpu).flag(Flag.NEGATIVE);
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

    describe('BRK', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x00]);
            // TODO: Set the IRQ vector on the ROM and test we jumped to it
            // cpu.memory.put16(0xFFFE, 0xAABB)
            let last_pc = cpu.pc;
            cpu.execute();
            // assert.equal(cpu.pc, 0xAA);
            assert.equal(cpu.pop8() & Flag.BREAK, Flag.BREAK);
            assert.equal(cpu.pop16(), last_pc+1);
        })
    });

    describe('BIT', () => {
        it('ZEROPAGE with mask=0xFF and mem=OVERFLOW', () => {
            let cpu = makeCPU([0x24, 0x00]);
            cpu.a = Flag.OVERFLOW;
            cpu.memory.put8(0x00, Flag.OVERFLOW)
            cpu.execute();
            expect(cpu).flag(Flag.OVERFLOW);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.ZERO);
        });
        it('ZEROPAGE with mask=0xFF and mem=NEGATIVE', () => {
            let cpu = makeCPU([0x24, 0x00]);
            cpu.a = Flag.NEGATIVE;
            cpu.memory.put8(0x00, Flag.NEGATIVE)
            cpu.execute();
            expect(cpu).not.flag(Flag.OVERFLOW);
            expect(cpu).flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.ZERO);
        });
        it('ZEROPAGE with mask=0 and mem=0xFF', () => {
            let cpu = makeCPU([0x24, 0x00]);
            cpu.a = 0;
            cpu.memory.put8(0x00, 0xFF)
            cpu.execute();
            expect(cpu).flag(Flag.OVERFLOW);
            expect(cpu).flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.ZERO);
        });
        it('ABSOLUTE with mask=0 and mem=0xFF', () => {
            let cpu = makeCPU([0x2C, 0xF0, 0x02]);
            cpu.a = 0;
            cpu.memory.put8(0x02F0, 0xFF)
            cpu.execute();
            expect(cpu).flag(Flag.OVERFLOW);
            expect(cpu).flag(Flag.NEGATIVE);
        });
        it('ABSOLUTE with mask=OVERFLOW and mem=0xFF', () => {
            let cpu = makeCPU([0x2C, 0xF0, 0x02]);
            cpu.a = Flag.OVERFLOW;
            cpu.memory.put8(0x02F0, 0x3F)
            cpu.execute();
            expect(cpu).not.flag(Flag.OVERFLOW);
            expect(cpu).not.flag(Flag.NEGATIVE);
        });
        it('ABSOLUTE with mask=NEGATIVE and mem=OVERFLOW', () => {
            let cpu = makeCPU([0x2C, 0xF0, 0x02]);
            cpu.a = Flag.NEGATIVE;
            cpu.memory.put8(0x02F0, Flag.OVERFLOW)
            cpu.execute();
            expect(cpu).flag(Flag.OVERFLOW);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.ZERO);
        });
    });

    describe('CLC', () => {
        it('IMPLICIT', () => {
            // SEC then CLC
            let cpu = makeCPU([0x38, 0x18]);
            cpu.execute();
            cpu.execute();
            expect(cpu).not.flag(Flag.CARRY);
        })
    });

    describe('CLD', () => {
        it('IMPLICIT', () => {
            // SEC then CLD
            let cpu = makeCPU([0xF8, 0xD8]);
            cpu.execute();
            cpu.execute();
            expect(cpu).not.flag(Flag.CLD);
        })
    });

    describe('CLI', () => {
        it('IMPLICIT', () => {
            // SEI then CLI
            let cpu = makeCPU([0x78, 0x58]);
            cpu.execute();
            cpu.execute();
            expect(cpu).not.flag(Flag.INTERRUPT);
        })
    });

    describe('CLV', () => {
        it('IMPLICIT', () => {
            // BIT 0x10 then CLV
            let cpu = makeCPU([0x24, 0x10, 0xB8]);
            cpu.memory.put8(0x10, Flag.OVERFLOW)
            cpu.a = Flag.OVERFLOW;
            cpu.execute();
            expect(cpu).flag(Flag.OVERFLOW);
            cpu.execute();
            expect(cpu).not.flag(Flag.OVERFLOW);
        })
    });
    describe('CMP', () => {
        it('IMMEDIATE a > m', () => {
            let cpu = makeCPU([0xC9, 0xC0]);
            cpu.a = 0xF0;
            cpu.execute();
            expect(cpu).not.flag(Flag.ZERO);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.CARRY);
        });
        it('IMMEDIATE a == m', () => {
            let cpu = makeCPU([0xC9, 0xF0]);
            cpu.a = 0xF0;
            cpu.execute();
            expect(cpu).flag(Flag.ZERO);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.CARRY);
        });
        it('IMMEDIATE a < m', () => {
            let cpu = makeCPU([0xC9, 0x70]);
            cpu.a = 0x0F;
            cpu.execute();
            expect(cpu).not.flag(Flag.ZERO);
            expect(cpu).flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.CARRY);
        });
    });

    describe('CPX', () => {
        it('IMMEDIATE a > m', () => {
            let cpu = makeCPU([0xE0, 0xC0]);
            cpu.x = 0xF0;
            cpu.execute();
            expect(cpu).not.flag(Flag.ZERO);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.CARRY);
        });
        it('ZEROPAGE a == m', () => {
            let cpu = makeCPU([0xE4, 0x40]);
            cpu.memory.put8(0x40,0xF0);
            cpu.x = 0xF0;
            cpu.execute();
            expect(cpu).flag(Flag.ZERO);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.CARRY);
        });
        it('ABSOLUTE a < m', () => {
            let cpu = makeCPU([0xEC, 0xFF, 0x03]);
            cpu.memory.put8(0x03FF, 0x70);
            cpu.x = 0x0F;
            cpu.execute();
            expect(cpu).not.flag(Flag.ZERO);
            expect(cpu).flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.CARRY);
        });
    });

    describe('CPY', () => {
        it('IMMEDIATE a > m', () => {
            let cpu = makeCPU([0xC0, 0xC0]);
            cpu.y = 0xF0;
            cpu.execute();
            expect(cpu).not.flag(Flag.ZERO);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.CARRY);
        });
        it('ZEROPAGE a == m', () => {
            let cpu = makeCPU([0xC4, 0x40]);
            cpu.memory.put8(0x40,0xF0);
            cpu.y = 0xF0;
            cpu.execute();
            expect(cpu).flag(Flag.ZERO);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.CARRY);
        });
        it('ABSOLUTE a < m', () => {
            let cpu = makeCPU([0xCC, 0xFF, 0x03]);
            cpu.memory.put8(0x03FF, 0x70);
            cpu.y = 0x0F;
            cpu.execute();
            expect(cpu).not.flag(Flag.ZERO);
            expect(cpu).flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.CARRY);
        });
    });

    describe('DEX', () => {
        it('(IMPLICIT negative', () => {
            let cpu = makeCPU([0xCA]);
            cpu.x = 0;
            cpu.execute();
            assert.equal(cpu.x, -1);
            expect(cpu).flag(Flag.NEGATIVE);
        });
        it('(IMPLICIT zero', () => {
            let cpu = makeCPU([0xCA]);
            cpu.x = 1;
            cpu.execute();
            assert.equal(cpu.x, 0);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.ZERO);
        });
    });

    describe('DEY', () => {
        it('(IMPLICIT', () => {
            let cpu = makeCPU([0x88]);
            cpu.y = 0;
            cpu.execute();
            assert.equal(cpu.y, -1);
            expect(cpu).flag(Flag.NEGATIVE);
        });
    });
    describe('EOR', () => {
        it('(IMMEDIATE', () => {
            let cpu = makeCPU([0x49, 0b10101010]);
            cpu.a = 0b01011010;
            cpu.execute();
            assert.equal(cpu.a, 0b11110000);
            expect(cpu).flag(Flag.NEGATIVE);
        });
        it('(ZEROPAGE', () => {
            let cpu = makeCPU([0x45, 0x10]);
            cpu.memory.put8(0x10,0b10101010);
            cpu.a = 0b11110000;
            cpu.execute();
            assert.equal(cpu.a, 0b01011010);
            expect(cpu).not.flag(Flag.NEGATIVE);
        });
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
        it('INDIRECT_X', () => {
            let cpu = makeCPU([0xA1, 0xA0]);
            cpu.x = 0x4;
            cpu.memory.put8(0xA4, 0xC0);
            cpu.memory.put8(0xC0, 0xF0);
            cpu.execute();
            assert.equal(cpu.a, 0xF0);
        });
        it('INDIRECT_Y', () => {
            let cpu = makeCPU([0xB1, 0xA0]);
            cpu.y = 0x4;
            cpu.memory.put8(0xA0, 0xB0);
            cpu.memory.put8(0xB4, 0xFC);
            cpu.execute();
            assert.equal(cpu.a, 0xFC);
        });
    });

    describe('LDX', () => {
        it('IMMEDIATE', () => {
            let cpu = makeCPU([0xA2, 0xEF]);
            cpu.execute();
            assert.equal(cpu.x, 0xEF);
            expect(cpu).flag(Flag.NEGATIVE);
        });
        it('ZEROPAGE_Y', () => {
            let cpu = makeCPU([0xB6]);
            cpu.p = Flag.NEGATIVE & Flag.ZERO;
            cpu.y = 0x20;
            cpu.memory.put8(cpu.y, 0x42);
            cpu.execute();
            assert.equal(cpu.x, 0x42);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.ZERO);
        });
    });

    describe('LDY', () => {
        it('IMMEDIATE', () => {
            let cpu = makeCPU([0xA0, 0xEF]);
            cpu.execute();
            assert.equal(cpu.y, 0xEF);
            expect(cpu).flag(Flag.NEGATIVE);
        });
        it('ABSOLUTE', () => {
            let cpu = makeCPU([0xA4, 0x20]);
            cpu.p = Flag.NEGATIVE & Flag.ZERO;
            cpu.memory.put8(0x20, 0x42);
            cpu.execute();
            assert.equal(cpu.y, 0x42);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.ZERO);
        });
    });


    describe('ORA', () => {
        it('(IMMEDIATE', () => {
            let cpu = makeCPU([0x09, 0b10101010]);
            cpu.a = 0b01011010;
            cpu.execute();
            assert.equal(cpu.a, 0b11111010);
            expect(cpu).flag(Flag.NEGATIVE);
        });
        it('(ZEROPAGE', () => {
            let cpu = makeCPU([0x05, 0x10]);
            cpu.memory.put8(0x10,0b10101010);
            cpu.a = 0b11110000;
            cpu.execute();
            assert.equal(cpu.a, 0b11111010);
            expect(cpu).flag(Flag.NEGATIVE);
        });
    });

    describe('PHA', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x48]);
            cpu.a = 0x8A;
            cpu.execute();
            assert.equal(cpu.pop8(), 0x8A);
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
            expect(cpu).flag(Flag.NEGATIVE);
            expect(cpu).not.flag(Flag.ZERO);
        });
        it('IMPLICIT set flag when zero', () => {
            let cpu = makeCPU([0x68]);
            cpu.push8(0);
            cpu.execute();
            assert.equal(cpu.a, 0);
            expect(cpu).not.flag(Flag.NEGATIVE);
            expect(cpu).flag(Flag.ZERO);
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
            expect(cpu).flag(Flag.CARRY);
        })
    });

    describe('SED', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0xF8]);
            cpu.execute();
            expect(cpu).flag(Flag.BCD);
        })
    });

    describe('SEI', () => {
        it('IMPLICIT', () => {
            let cpu = makeCPU([0x78]);
            cpu.execute();
            expect(cpu).flag(Flag.INTERRUPT);
        })
    });

    describe('STA', () => {
        it('ZEROPAGE', () => {
            let cpu = makeCPU([0x85, 0x00]);
            cpu.a = 0x42;
            cpu.execute();
            assert.equal(cpu.memory.get8(0x00), 0x42);
            expect(cpu).not.flag(Flag.ZERO);
        })
    });

    describe('STX', () => {
        it('ZEROPAGE', () => {
            let cpu = makeCPU([0x86, 0x00]);
            cpu.x = 0x42;
            cpu.execute();
            assert.equal(cpu.memory.get8(0x00), 0x42);
            expect(cpu).not.flag(Flag.ZERO);
        })
    });

});