const debug = require('debug')('nes:cpu');

class CPU {
    constructor(memory) {
        this.memory = memory;
    }

    execute() {
        throw new Error('unknown opcode');
    }
};

module.exports.CPU = CPU;