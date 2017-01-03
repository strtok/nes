const assert = require('chai').assert;
const tc = require('../math').tc

describe('math', () => {
    it('twos complement', function() {
        assert.equal(tc(0b00000001), 1);
        assert.equal(tc(0b00000010), 2);
        assert.equal(tc(0b01111111), 127);

        assert.equal(tc(0b10000000), -128);
        assert.equal(tc(0b11111111), -1);
        assert.equal(tc(0b11111110), -2);
    });
});