const debug = require('./debug')('nes:cpu');
const _ = require('underscore');
const printf = require('printf');
const rightpad = require('rightpad');
var tc = require("./math.js").tc;

let AddrMode = {
    ABSOLUTE:   1,
    ABSOLUTE_X: 2,
    ABSOLUTE_Y: 3,
    IMMEDIATE:  4,
    IMPLICIT:   5,
    INDIRECT_X: 6,
    INDIRECT_Y: 7,
    RELATIVE:   8,
    ZEROPAGE:   9,
    ZEROPAGE_X: 10,
    ZEROPAGE_Y: 11
};

let Flag = {
    CARRY:     0b00000001,
    ZERO:      0b00000010,
    INTERRUPT: 0b00000100,
    BCD:       0b00001000, // ignored on NES
    BREAK:     0b00010000, // unused, always 0
    BIT_5:     0b00100000, // unused, always 1
    OVERFLOW:  0b01000000,
    NEGATIVE:  0b10000000,

    toString: function(p) {
        return printf("%s%s%s%s%s%s%s%s",
            (p & this.NEGATIVE) ? "N" : ".",
            (p & this.OVERFLOW) ? "V" : ".",
            (p & this.BIT_5) ? "E" : ".",
            (p & this.BREAK) ? "B" : ".",
            (p & this.BCD) ? "D" : ".",
            (p & this.INTERRUPT) ? "I" : ".",
            (p & this.ZERO) ? "N" : ".",
            (p & this.CARRY) ? "C" : "."
        )
    }
};

let OpCodes = {
    ADC: [
        { op: 0x69, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
            cpu.a = (cpu.a + cpu.readPC()) % 0x100;
        }},
    ],
    AND: [
        { op: 0x29, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
            cpu.a &= cpu.readPC();
        }},
        { op: 0x25, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
            cpu.a &= cpu.readZeroPageFromPC();
        }},
        { op: 0x35, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu, memory) {
            cpu.a &= cpu.readZeroPageXFromPC();
        }},
        { op: 0x2D, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu, memory) {
            cpu.a &= cpu.readAbsoluteFromPC();
        }},
        { op: 0x3D, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu, memory) {
            cpu.a &= cpu.readAbsoluteXFromPC();
        }},
        { op: 0x39, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu, memory) {
            cpu.a &= cpu.readAbsoluteYFromPC();
        }},
        { op: 0x21, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu, memory) {
            cpu.a &= cpu.readIndirectXFromPC();
        }},
        { op: 0x31, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu, memory) {
            cpu.a &= cpu.readIndirectYFromPC();
        }}
    ],
    BCC: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x90, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readRelativeFromPC();
            if ((cpu.p & Flag.CARRY) == 0) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BCS: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xB0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readRelativeFromPC();
            if (cpu.p & Flag.CARRY) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BEQ: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xF0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readRelativeFromPC();
            if (cpu.p & Flag.ZERO) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BIT: [
        { op: 0x24, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
            const m = memory.get8(cpu.readPC());
            cpu.copyFlagFrom(Flag.NEGATIVE, m);
            cpu.copyFlagFrom(Flag.OVERFLOW, m);

            const masked = cpu.a & m;
            cpu.setFlag(Flag.ZERO, masked == 0);
        }},
        { op: 0x2C, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu, memory) {
            const m = memory.get8(cpu.readPC16());
            cpu.copyFlagFrom(Flag.NEGATIVE, m);
            cpu.copyFlagFrom(Flag.OVERFLOW, m);

            const masked = cpu.a & m;
            cpu.setFlag(Flag.ZERO, masked == 0);
        }}
    ],
    BNE: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xD0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readRelativeFromPC();
            if (!(cpu.p & Flag.ZERO)) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BMI: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x30, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readRelativeFromPC();
            if (cpu.p & Flag.NEGATIVE) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BPL: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x10, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readRelativeFromPC();
            if (!(cpu.p & Flag.NEGATIVE)) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BVC: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x50, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readRelativeFromPC();
            if (!(cpu.p & Flag.OVERFLOW)) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BVS: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x70, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readRelativeFromPC();
            if (cpu.p & Flag.OVERFLOW) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    CLC: [
        { op: 0x18, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
            cpu.p &= ~Flag.CARRY;
        }}
    ],
    CLD: [
        { op: 0xD8, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
            cpu.p &= ~Flag.BCD;
        }}
    ],
    CLI: [
        { op: 0x58, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
            cpu.p &= ~Flag.INTERRUPT;
        }}
    ],
    CLV: [
        { op: 0xB8, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
            cpu.p &= ~Flag.OVERFLOW;
        }}
    ],
    CMP: [
        { op: 0xC9, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
            let result = cpu.a - cpu.readPC();
            cpu.setFlag(Flag.CARRY, result >= 0);
            cpu.setNegativeAndZeroFlags(result);
        }}
    ],
    EOR: [
        { op: 0x49, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
            cpu.a ^= cpu.readPC();
        }},
        { op: 0x45, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
            cpu.a ^= memory.get8(cpu.readPC());
        }}
    ],
    JMP: [
        { op: 0x4C, mode: AddrMode.ABSOLUTE, cycles: 3, exe: function(cpu, memory) {
            cpu.pc = cpu.readPC16();
        }}
    ],
    JSR: [
        { op: 0x20, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu, memory) {
            cpu.push16(cpu.pc + 1);
            cpu.pc = cpu.readPC16();
        }}
    ],
    LDA: [
        { op: 0xA9, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
            cpu.a = cpu.readPC();
        }},
        { op: 0xA5, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
            cpu.a = cpu.readZeroPageFromPC();
        }},
        { op: 0xB5, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu, memory) {
            cpu.a = cpu.readZeroPageXFromPC();
        }},
        { op: 0xAD, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu, memory) {
            cpu.a = cpu.readAbsoluteFromPC();
        }},
        { op: 0xBD, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu, memory) {
            cpu.a = cpu.readAbsoluteXFromPC();
        }},
        { op: 0xB9, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu, memory) {
            cpu.a = cpu.readAbsoluteYFromPC();
        }},
        { op: 0xA1, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu, memory) {
            cpu.a = cpu.readIndirectXFromPC();
        }},
        { op: 0xB1, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu, memory) {
            cpu.a = cpu.readIndirectYFromPC();
        }}
    ],
    LDX: [
        { op: 0xA2, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
            cpu.x = cpu.readPC();
        }}
    ],
    NOP: [
        { op: 0xEA, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
        }}
    ],
    ORA: [
        { op: 0x09, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
            cpu.a |= cpu.readPC();
        }},
        { op: 0x05, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
            cpu.a |= memory.get8(cpu.readPC());
        }}
    ],
    PHA: [
        { op: 0x48, mode: AddrMode.IMPLICIT, cycles: 3, exe: function(cpu, memory) {
            cpu.push8(cpu.a);
        }}
    ],
    PHP: [
        { op: 0x08, mode: AddrMode.IMPLICIT, cycles: 3, exe: function(cpu, memory) {
            // the BREAK bit is set in the pushed value (but not in p itself)
            // per https://wiki.nesdev.com/w/index.php/CPU_status_flag_behavior
            cpu.push8(cpu.p | Flag.BREAK);
        }}
    ],
    PLA: [
        { op: 0x68, mode: AddrMode.IMPLICIT, cycles: 4, exe: function(cpu, memory) {
            cpu.a = cpu.pop8();
        }}
    ],
    PLP: [
        { op: 0x28, mode: AddrMode.IMPLICIT, cycles: 4, exe: function(cpu, memory) {
            cpu.p = cpu.pop8();
        }}
    ],
    RTS: [
        { op: 0x60, mode: AddrMode.IMPLICIT, cycles: 6, exe: function(cpu, memory) {
            cpu.pc = cpu.pop16() + 1;
        }}
    ],
    SEC: [
        { op: 0x38, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu, memory) {
            cpu.p |= Flag.CARRY;
        }}
    ],
    SED: [
        { op: 0xF8, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu, memory) {
            cpu.p |= Flag.BCD;
        }}
    ],
    SEI: [
        { op: 0x78, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu, memory) {
            cpu.p |= Flag.INTERRUPT;
        }}
    ],
    STA: [
        { op: 0x85, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
            memory.put8(cpu.readPC(), cpu.a);
        }}
    ],
    STX: [
        { op: 0x86, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
            memory.put8(cpu.readPC(), cpu.x);
        }}
    ]
};

class CPU {
    constructor(memory) {
        this.memory = memory;

        // registers
        this.p = 0x24;      // Processor status flags
        this.pc = 0xC000;   // Program Counter
        this._a = 0x00;      // Accumulator
        this.sp = 0xFD;     // Stack Pointer
        this._x = 0x00;      // X (general purpose)
        this._y = 0x00;       // Y (general purpose)

        // build opcode -> exe map
        this.opMap = [];
        _.forEach(_.pairs(OpCodes), (it) => {
            let opstr = it[0];
            _.forEach(it[1], (it) => {
                let map = _.clone(it);
                map["opstr"] = opstr;
                this.opMap[map.op] = map;
            });
        });
    }

    copyFlagFrom(flag, value) {
        // copies the flag bit from the value to p
        this.p &= ~flag;
        this.p |= value & flag
    }

    setFlag(flag, predicate) {
        if (predicate) {
            this.p |= flag;
        } else {
            this.p &= ~flag;
        }
    }

    setNegativeAndZeroFlags(val) {
        this.copyFlagFrom(Flag.NEGATIVE, val);
        this.setFlag(Flag.ZERO, val == 0);
    }

    set x(val) {
        this.setNegativeAndZeroFlags(val);
        this._x = val;
    }

    get x() {
        return this._x;
    }

    set y(val) {
        this.setNegativeAndZeroFlags(val);
        this._y = val;
    }

    get y() {
        return this._y;
    }

    set a(val) {
        this.setNegativeAndZeroFlags(val);
        this._a = val;
    }

    get a() {
        return this._a;
    }

    set p(val) {
        this._p = (val | Flag.BIT_5) & (~Flag.BREAK);
    }

    get p() {
        return this._p;
    }

    // read 1 byte at PC and increment PC
    readPC() {
        return this.memory.get8(this.pc++);
    }

    // read 2 bytes at PC and increment PC
    readPC16() {
        let pc = this.pc;
        this.pc += 2;
        return this.memory.get16(pc);
    }

    readRelativeFromPC() {
        return tc(this.readPC())
    }
    readZeroPageFromPC() {
        return this.memory.get8(this.readPC())
    }

    readZeroPageXFromPC() {
        return this.memory.get8((this.readPC() + this.x) % 256)
    }

    readAbsoluteFromPC() {
        return this.memory.get8(this.readPC16())
    }

    readAbsoluteXFromPC() {
        return this.memory.get8(this.readPC16() + this.x)
    }

    readAbsoluteYFromPC() {
        return this.memory.get8(this.readPC16() + this.y)
    }

    /** indexed indirect */
    readIndirectXFromPC() {
        return this.memory.get8(this.memory.get8((this.readPC() + this.x) % 256));
    }

    /** indirect indexed */
    readIndirectYFromPC() {
        return this.memory.get8((this.memory.get8(this.readPC()) + this.y) % 256);
    }

    // push value on stack
    push8(val) {
        this.memory.put8(this.sp + 0x100, val);
        this.sp--;
    }

    push16(val) {
        this.memory.put16(this.sp + 0x100, val);
        this.sp -= 2;
    }

    pop8() {
        this.sp += 1;
        return this.memory.get8(this.sp + 0x100);
    }

    pop16() {
        this.sp += 2;
        return this.memory.get16(this.sp + 0x100);
    }

    disassemble(addr) {
        try {
            let disasm = [];
            const op = this.opMap[this.memory.get8(addr)];
            disasm.push(op.opstr);
            switch (op.mode) {
                case AddrMode.ABSOLUTE:
                    disasm.push(printf("$%04X", this.memory.get8(addr + 1)));
                    break;
                case AddrMode.ABSOLUTE_X:
                    disasm.push(printf("$%04X", this.memory.get8(addr + 1)));
                    disasm.push("X");
                    break;
                case AddrMode.ABSOLUTE_Y:
                    disasm.push(printf("$%04X", this.memory.get8(addr + 1)));
                    disasm.push("Y");
                    break;
                case AddrMode.IMMEDIATE:
                    disasm.push(printf("#$%02X", this.memory.get8(addr + 1)));
                    break;
                case AddrMode.IMPLICIT:
                    break;
                case AddrMode.INDIRECT_X:
                    disasm.push(printf("($%04X)", this.memory.get8(addr + 1)));
                    disasm.push("X");
                    break;
                case AddrMode.INDIRECT_Y:
                    disasm.push(printf("($%04X)", this.memory.get8(addr + 1)));
                    disasm.push("Y");
                    break;
                case AddrMode.RELATIVE:
                    const val = tc(this.memory.get8(addr + 1));
                    if (val > 0)
                        disasm.push(printf("*+$%02X", val));
                    else
                        disasm.push(printf("*-$%02X", ~val));
                    break;
                case AddrMode.ZEROPAGE:
                    disasm.push(printf("$%02X", this.memory.get8(addr + 1)));
                    break;
                case AddrMode.ZEROPAGE_X:
                    disasm.push(printf("$%02X", this.memory.get8(addr + 1)));
                    disasm.push("X");
                    break;
                case AddrMode.ZEROPAGE_Y:
                    disasm.push(printf("$%02X", this.memory.get8(addr + 1)));
                    disasm.push("Y");
                    break;
            }

            return disasm;
        } catch (e) {
            return [
                        printf("$%02X", this.memory.get8(this.pc)),
                        printf("$%02X", this.memory.get8(this.pc + 1)),
                        printf("$%02X", this.memory.get8(this.pc + 2))
                   ];
        }
    }

    execute() {

        const disasm = rightpad(this.disassemble(this.pc).toString(), 10);

        debug("$%a %s a=$%b x=$%b y=$%b sp=$%b p=%s ($%b)",
            this.pc,
            disasm,
            this.a,
            this.x,
            this.y,
            this.sp,
            Flag.toString(this.p),
            this.p
        );

        let op = this.readPC();
        const inst = this.opMap[op];

        try {
            inst.exe(this, this.memory);
        } catch (e) {
            if (e instanceof TypeError) {
                debug("invalid op code $%b (%s)", op, e.toString());
                this.memory.debugPrintStack();
                throw new Error("invalid op code " + op + " " + e.toString());
            } else {
                throw e;
            }
        }
    }
}

module.exports.CPU = CPU;
module.exports.Flag = Flag;