const debug = require('./debug')('nes:cpu');
const _ = require('underscore');
const printf = require('printf');
const rightpad = require('rightpad');

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
    OVERFLOW:  0b01000000,
    NEGATIVE:  0b10000000
};

let OpCodes = {
    BCC: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x90, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readPC();
            if ((cpu.p & Flag.CARRY) == 0) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BCS: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xB0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readPC();
            if (cpu.p & Flag.CARRY) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BEQ: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xF0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu, memory) {
            const offset = cpu.readPC();
            if (cpu.p & Flag.ZERO) {
                cpu.pc = cpu.pc + offset;
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
            cpu.x = cpu.readPC();
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

    setNegativeAndZeroFlags(val) {
        if (val & Flag.NEGATIVE) {
            this.p |= Flag.NEGATIVE;
        } else {
            this.p &= ~Flag.NEGATIVE;
        }

        if (val == 0) {
            this.p |= Flag.ZERO;
        } else {
            this.p &= ~Flag.ZERO;
        }
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

    // push value on stack
    push8(val) {
        this.memory.put8(this.sp + 0x100, val);
        this.sp--;
    }

    push16(val) {
        this.memory.put16(this.sp + 0x100, val);
        this.sp -= 2;
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
                    disasm.push(printf("#%02X", this.memory.get8(addr + 1)));
                    break;
                case AddrMode.IMPLICIT:
                    break;
                case AddrMode.INDIRECT_X:
                    disasm.push(printf("(%04X)", this.memory.get8(addr + 1)));
                    disasm.push("X");
                    break;
                case AddrMode.INDIRECT_Y:
                    disasm.push(printf("(%04X)", this.memory.get8(addr + 1)));
                    disasm.push("Y");
                    break;
                // TODO: correctly print sign for relative addressing
                case AddrMode.RELATIVE:
                    disasm.push(printf("*$%02X", this.memory.get8(addr + 1)));
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
                        printf("%02X", this.memory.get8(this.pc)),
                        printf("%02X?", this.memory.get8(this.pc + 1)),
                        printf("%02X?", this.memory.get8(this.pc + 2))
                   ];
        }
    }

    execute() {

        const disasm = rightpad(this.disassemble(this.pc).toString(), 10);

        debug("%a %s a=%b x=%b y=%b sp=%b p=%b",
            this.pc,
            disasm,
            this.a,
            this.x,
            this.y,
            this.sp,
            this.p
        );

        let op = this.readPC();
        const inst = this.opMap[op];

        try {
            inst.exe(this, this.memory);
        } catch (e) {
            if (e instanceof TypeError) {
                debug("invalid op code %b (%s)", op, e.toString());
                this.memory.debugPrintStack();
                throw new Error("invalid op code");
            } else {
                throw e;
            }
        }
    }
}

module.exports.CPU = CPU;
module.exports.Flag = Flag;