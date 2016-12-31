/**
 * Created by tokie on 12/31/16.
 */

let assert = require('chai').assert;
let rom = require('../rom');
let nestest = require('./nestest_rom');
let debug = require('debug')('nes:nestest');
let nestestLog = require('./nestest_log');

describe('nestest', () => {
    it('executes as expected', function() {
        let log = nestestLog.log;
    });
});