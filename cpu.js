const debug = require('debug')('nes:cpu');
const _ = require('underscore');

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
};

let Flag = {
    CARRY:     0b00000001,
    ZERO:      0b00000010,
    INTERRUPT: 0b00000100,
    BCD:       0b00001000, // ignored on NES
    OVERFLOW:  0b01000000,
    NEGATIVE:  0b10000000
};

let OpCodes = {
    BCC: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x90, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readPC();
            if ((cpu.p & Flag.CARRY) == 0) {
                cpu.putPC(cpu.pc + offset);
            }
        }}
    ],
    BCD: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xB0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readPC();
            if (cpu.p & Flag.CARRY) {
                cpu.putPC(cpu.pc + offset);
            }
        }}
    ],
    CLC: [
        { op: 0x18, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
            cpu.p &= ~Flag.CARRY;
        }}
    ],
    JMP: [
        { op: 0x4C, mode: AddrMode.ABSOLUTE, cycles: 3, exe: function(cpu, memory) {
            cpu.putPC(cpu.readPC16());
        }}
    ],
    JSR: [
        { op: 0x20, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu, memory) {
            cpu.push16(cpu.pc + 1);
            cpu.putPC(cpu.readPC16());
        }}
    ],
    LDA: [
        { op: 0xA9, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
        }},
        { op: 0xA5, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
        }},
        { op: 0xB5, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu, memory) {
        }},
        { op: 0xAD, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu, memory) {
        }},
        { op: 0xBD, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu, memory) {
        }},
        { op: 0xB9, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu, memory) {
        }},
        { op: 0xA1, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu, memory) {
        }},
        { op: 0xB1, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu, memory) {
        }},
    ],
    LDX: [
        { op: 0xA2, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
            cpu.putX(cpu.readPC());
        }}
    ],
    NOP: [
        { op: 0xEA, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu, memory) {
        }}
    ],
    SEC: [
        { op: 0x38, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu, memory) {
            cpu.p |= Flag.CARRY;
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
        this.a = 0x00;      // Accumulator
        this.sp = 0xFD;     // Stack Pointer
        this.x = 0x00;      // X (general purpose)
        this.y = 0x00;       // Y (general purpose)

        // build opcode -> exe map
        this.opMap = Array();
        _.forEach(OpCodes, (it) => {
            _.forEach(it, (it) => {
                this.opMap[it.op] = it;
            });
        });
    }

    putX(val) {
        if (val & Flag.NEGATIVE) {
            this.p |= Flag.NEGATIVE;
        } else if (val == 0) {
            this.p |= Flag.ZERO;
        }
        this.x = val;
    }

    putY(val) {
        if (val & Flag.NEGATIVE) {
            this.p |= Flag.NEGATIVE;
        } else if (val == 0) {
            this.p |= Flag.ZERO;
        }
        this.y = val;
    }

    putA(val) {
        if (val & Flag.NEGATIVE) {
            this.p |= Flag.NEGATIVE;
        } else if (val == 0) {
            this.p |= Flag.ZERO;
        }
        this.a = val;
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

    putPC(val) {
        this.pc = val;
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

    execute() {
        debug("pc=$%s (%s %s? %s?) a=%s x=%s y=%s sp=%s p=%s",
            this.pc.toString(16),
            this.memory.get8(this.pc).toString(16),
            this.memory.get8(this.pc + 1).toString(16),
            this.memory.get8(this.pc + 2).toString(16),
            this.a.toString(16),
            this.x.toString(16),
            this.y.toString(16),
            this.sp.toString(16),
            this.p.toString(16)
        );

        let op = this.readPC();
        const inst = this.opMap[op];

        try {
            inst.exe(this, this.memory);
        } catch (e) {
            if (e instanceof TypeError) {
                debug("invalid op code %s (%s)", op.toString(16), e.toString());
                throw new Error("invalid op code");
            } else {
                throw e;
            }
        }
    }
};

module.exports.CPU = CPU;
module.exports.Flag = Flag;