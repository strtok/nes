const assert = require('chai').assert;
const signed = require('../math').signed

describe('math', () => {
    it('twos complement sign extension', function() {
        assert.equal(signed(0b00000001), 1);
        assert.equal(signed(0b00000010), 2);
        assert.equal(signed(0b01111111), 127);

        assert.equal(signed(0b10000000), -128);
        assert.equal(signed(0b11111111), -1);
        assert.equal(signed(0b11111110), -2);
    });
});