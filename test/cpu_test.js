const assert = require('chai').assert;
const Memory = require('../memory').Memory;
const CPU = require('../cpu').CPU;

describe('CPU', () => {

    it('throws on executing unknown instruction', function() {
        let memory = new Memory([[0x00]]);
        let cpu = new CPU(memory);
        assert.throws(cpu.execute, Error);
    });

});