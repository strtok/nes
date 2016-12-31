const debug = require('debug')('nes:cpu');

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
    }

    execute() {
        throw new Error('invalid op-code');
    }
};

module.exports.CPU = CPU;