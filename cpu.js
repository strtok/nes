const debug = require('debug')('nes:cpu');
const _ = require('underscore');

let AddrMode = {
    ABSOLUTE: 1,
    IMMEDIATE: 2,
    ZEROPAGE: 3
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
    JMP: [
        { op: 0x4C, mode: AddrMode.ABSOLUTE, cycles: 3, exe: function(cpu, memory) {
            cpu.putPC(memory.get16(cpu.pc + 1));
        }}
    ],
    LDX: [
        { op: 0xA2, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
            cpu.putX(memory.get8(cpu.pc + 1));
            cpu.pc += 2;
        }}
    ],
    STX: [
        { op: 0x86, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu, memory) {
            memory.put8(memory.get8(cpu.pc + 1), cpu.x);
            cpu.pc += 2;
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
                this.opMap[it.op] = it.exe;
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

    putPC(val) {
        this.pc = val;
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

        let op = this.memory.get8(this.pc);

        try {
            this.opMap[op](this, this.memory);
        } catch (e) {
            if (e instanceof TypeError) {
                debug("invalid op code %s", op.toString(16));
                throw new Error("invalid op code");
            } else {
                throw e;
            }
        }
    }
};

module.exports.CPU = CPU;