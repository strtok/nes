const debug = require('debug')('nes:cpu');
const _ = require('underscore');

let AddrMode = {
    ABSOLUTE: 1,
    IMMEDIATE: 2
}

let OpCodes = {
    JMP: [
        { op: 0x4C, mode: AddrMode.ABSOLUTE, cycles: 3, exe: function(cpu, memory) {
            cpu.register.pc = memory.get16(cpu.register.pc + 1);
        }}
    ],
    LDX: [
        { op: 0xA2, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu, memory) {
            cpu.register.x = memory.get8(cpu.register.pc + 1);
            cpu.register.pc += 2;
        }}
    ]
};

class CPU {
    constructor(memory) {
        this.memory = memory;
        this.register = {
            p: 0x24,      // Processor status flags
            pc: 0xC000,   // Program Counter
            a: 0x00,      // Accumulator
            sp: 0xFD,     // Stack Pointer
            x: 0x00,      // X (general purpose)
            y: 0x00       // Y (general purpose)
        }

        // build opcode -> exe map
        this.opMap = Array();
        _.forEach(OpCodes, (it) => {
            _.forEach(it, (it) => {
                this.opMap[it.op] = it.exe;
            });
        });
    }

    execute() {
        debug("pc=$%s (%s %s? %s?) a=%s x=%s y=%s sp=%s p=%s",
            this.register.pc.toString(16),
            this.memory.get8(this.register.pc).toString(16),
            this.memory.get8(this.register.pc + 1).toString(16),
            this.memory.get8(this.register.pc + 2).toString(16),
            this.register.a.toString(16),
            this.register.x.toString(16),
            this.register.y.toString(16),
            this.register.sp.toString(16),
            this.register.p.toString(16)
        );

        let op = this.memory.get8(this.register.pc);

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