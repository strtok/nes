"use strict";

const debug = require('./debug')('nes:cpu');
const _ = require('underscore');
const printf = require('printf');
const rightpad = require('rightpad');
const math = require("./math.js");
const signed = math.signed;

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
    ZEROPAGE_Y: 11,
    ACCUMULATOR: 12,
    INDIRECT: 13
};

let Flag = {
    CARRY:     0b00000001,
    ZERO:      0b00000010,
    INTERRUPT: 0b00000100,
    BCD:       0b00001000, // ignored on NES
    BREAK:     0b00010000, // unused, always 0
    BIT_5:     0b00100000, // unused, always 1
    OVERFLOW:  0b01000000,
    NEGATIVE:  0b10000000,

    toString: function(p) {
        return printf("%s%s%s%s%s%s%s%s",
            (p & this.NEGATIVE) ? "N" : ".",
            (p & this.OVERFLOW) ? "V" : ".",
            (p & this.BIT_5) ? "E" : ".",
            (p & this.BREAK) ? "B" : ".",
            (p & this.BCD) ? "D" : ".",
            (p & this.INTERRUPT) ? "I" : ".",
            (p & this.ZERO) ? "N" : ".",
            (p & this.CARRY) ? "C" : "."
        )
    }
};

let OpCodes = {
    ADC: [
        { op: 0x69, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            adc(cpu, cpu.readPC());
        }},
        { op: 0x65, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            adc(cpu, cpu.readZeroPage());
        }},
        { op: 0x75, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            adc(cpu, cpu.readZeroPageX());
        }},
        { op: 0x6D, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            adc(cpu, cpu.readAbsolute());
        }},
        { op: 0x7D, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            adc(cpu, cpu.readAbsoluteX());
        }},
        { op: 0x79, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu) {
            adc(cpu, cpu.readAbsoluteY());
        }},
        { op: 0x61, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu) {
            adc(cpu, cpu.readIndirectX());
        }},
        { op: 0x71, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu) {
            adc(cpu, cpu.readIndirectY());
        }},
    ],
    AND: [
        { op: 0x29, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            cpu.a &= cpu.readPC();
        }},
        { op: 0x25, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.a &= cpu.readZeroPage();
        }},
        { op: 0x35, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            cpu.a &= cpu.readZeroPageX();
        }},
        { op: 0x2D, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.a &= cpu.readAbsolute();
        }},
        { op: 0x3D, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.a &= cpu.readAbsoluteX();
        }},
        { op: 0x39, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu) {
            cpu.a &= cpu.readAbsoluteY();
        }},
        { op: 0x21, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu) {
            cpu.a &= cpu.readIndirectX();
        }},
        { op: 0x31, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu) {
            cpu.a &= cpu.readIndirectY();
        }}
    ],
    ASL: [
        { op: 0x0A, mode: AddrMode.ACCUMULATOR, cycles: 2, exe: function(cpu) {
            cpu.setFlag(Flag.CARRY, cpu.a & 0x80);
            cpu.a = (cpu.a << 1) & 0xFF;
        }},
        { op: 0x06, mode: AddrMode.ZEROPAGE, cycles: 5, exe: function(cpu) {
            asl(cpu, cpu.zeroPageAddress());
        }},
        { op: 0x16, mode: AddrMode.ZEROPAGE_X, cycles: 6, exe: function(cpu) {
            asl(cpu, cpu.zeroPageXAddress());
        }},
        { op: 0x0E, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu) {
            asl(cpu, cpu.absoluteAddress());
        }},
        { op: 0x1E, mode: AddrMode.ABSOLUTE_X, cycles: 7, exe: function(cpu) {
            asl(cpu, cpu.absoluteXAddress());
        }}
    ],
    BCC: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x90, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu) {
            const offset = cpu.readRelative();
            if ((cpu.p & Flag.CARRY) == 0) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BCS: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xB0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu) {
            const offset = cpu.readRelative();
            if (cpu.p & Flag.CARRY) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BEQ: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xF0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu) {
            const offset = cpu.readRelative();
            if (cpu.p & Flag.ZERO) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BIT: [
        { op: 0x24, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            const m = cpu.readZeroPage();
            cpu.copyFlagFrom(Flag.NEGATIVE, m);
            cpu.copyFlagFrom(Flag.OVERFLOW, m);

            const masked = cpu.a & m;
            cpu.setFlag(Flag.ZERO, masked == 0);
        }},
        { op: 0x2C, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            const m = cpu.readAbsolute();
            cpu.copyFlagFrom(Flag.NEGATIVE, m);
            cpu.copyFlagFrom(Flag.OVERFLOW, m);

            const masked = cpu.a & m;
            cpu.setFlag(Flag.ZERO, masked == 0);
        }}
    ],
    BMI: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x30, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu) {
            const offset = cpu.readRelative();
            if (cpu.p & Flag.NEGATIVE) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BNE: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0xD0, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu) {
            const offset = cpu.readRelative();
            if (!(cpu.p & Flag.ZERO)) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BPL: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x10, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu) {
            const offset = cpu.readRelative();
            if (!(cpu.p & Flag.NEGATIVE)) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BRK: [
        { op: 0x00, mode: AddrMode.IMPLICIT, cycles: 7, exe: function(cpu) {
            cpu.push16(cpu.pc);
            cpu.push8(cpu.p | Flag.BREAK);
            // TODO: Read this address from the ROM
            cpu.pc = cpu.memory.get16(0xFFFE);
        }}
    ],
    BVC: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x50, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu) {
            const offset = cpu.readRelative();
            if (!(cpu.p & Flag.OVERFLOW)) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    BVS: [
        // TODO: cycles is +1 if branch succeeded and +2 if it crosses a page boundry
        { op: 0x70, mode: AddrMode.RELATIVE, cycles: 2, exe: function(cpu) {
            const offset = cpu.readRelative();
            if (cpu.p & Flag.OVERFLOW) {
                cpu.pc = cpu.pc + offset;
            }
        }}
    ],
    CLC: [
        { op: 0x18, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.p &= ~Flag.CARRY;
        }}
    ],
    CLD: [
        { op: 0xD8, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.p &= ~Flag.BCD;
        }}
    ],
    CLI: [
        { op: 0x58, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.p &= ~Flag.INTERRUPT;
        }}
    ],
    CLV: [
        { op: 0xB8, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.p &= ~Flag.OVERFLOW;
        }}
    ],
    CMP: [
        { op: 0xC9, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.a - cpu.readPC());
        }},
        { op: 0xC5, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.a - cpu.readZeroPage());
        }},
        { op: 0xD5, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.a - cpu.readZeroPageX());
        }},
        { op: 0xCD, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.a - cpu.readAbsolute());
        }},
        // TODO: cycles is +1 if it crosses a page boundary
        { op: 0xDD, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.a - cpu.readAbsoluteX());
        }},
        // TODO: cycles is +1 if it crosses a page boundary
        { op: 0xD9, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.a - cpu.readAbsoluteY());
        }},
        { op: 0xC1, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.a - cpu.readIndirectX());
        }},
        // TODO: cycles is +1 if it crosses a page boundary
        { op: 0xD1, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.a - cpu.readIndirectY());
        }}
    ],
    CPX: [
        { op: 0xE0, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.x - cpu.readPC());
        }},
        { op: 0xE4, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.x - cpu.readZeroPage());
        }},
        { op: 0xEC, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.x - cpu.readAbsolute());
        }}
    ],
    CPY: [
        { op: 0xC0, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.y - cpu.readPC());
        }},
        { op: 0xC4, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.y - cpu.readZeroPage());
        }},
        { op: 0xCC, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.setComparisonFlags(cpu.y - cpu.readAbsolute());
        }}
    ],
    DEC: [
        { op: 0xC6, mode: AddrMode.ZEROPAGE, cycles: 5, exe: function(cpu) {
            const addr = cpu.zeroPageAddress();
            let val = math.wrap(cpu.memory.get8(addr) - 1);
            cpu.setNegativeAndZeroFlags(val);
            cpu.memory.put8(addr, val);
        }},
        { op: 0xD6, mode: AddrMode.ZEROPAGE_X, cycles: 6, exe: function(cpu) {
            const addr = cpu.zeroPageXAddress();
            let val = math.wrap(cpu.memory.get8(addr) - 1);
            cpu.setNegativeAndZeroFlags(val);
            cpu.memory.put8(addr, val);
        }},
        { op: 0xCE, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu) {
            const addr = cpu.absoluteAddress();
            let val = math.wrap(cpu.memory.get8(addr) - 1);
            cpu.setNegativeAndZeroFlags(val);
            cpu.memory.put8(addr, val);
        }},
        { op: 0xDE, mode: AddrMode.ABSOLUTE_X, cycles: 7, exe: function(cpu) {
            const addr = cpu.absoluteXAddress();
            let val = math.wrap(cpu.memory.get8(addr) - 1);
            cpu.setNegativeAndZeroFlags(val);
            cpu.memory.put8(addr, val);
        }},
    ],
    DEX: [
        { op: 0xCA, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.x = math.wrap(cpu.x - 1);
        }},
    ],
    DEY: [
        { op: 0x88, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.y = math.wrap(cpu.y - 1);
        }},
    ],
    EOR: [
        { op: 0x49, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.a ^= cpu.readPC();
        }},
        { op: 0x45, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.a ^= cpu.readZeroPage();
        }},
        { op: 0x55, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            cpu.a ^= cpu.readZeroPageX();
        }},
        { op: 0x4D, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.a ^= cpu.readAbsolute();
        }},
        { op: 0x5D, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.a ^= cpu.readAbsoluteX();
        }},
        { op: 0x59, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu) {
            cpu.a ^= cpu.readAbsoluteY();
        }},
        { op: 0x41, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu) {
            cpu.a ^= cpu.readIndirectX();
        }},
        { op: 0x51, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu) {
            cpu.a ^= cpu.readIndirectY();
        }}

    ],
    INC: [
        { op: 0xE6, mode: AddrMode.ZEROPAGE, cycles: 5, exe: function(cpu) {
            const addr = cpu.zeroPageAddress();
            let val = math.wrap(cpu.memory.get8(addr) + 1);
            cpu.setNegativeAndZeroFlags(val);
            cpu.memory.put8(addr, val);
        }},
        { op: 0xF6, mode: AddrMode.ZEROPAGE_X, cycles: 6, exe: function(cpu) {
            const addr = cpu.zeroPageXAddress();
            let val = math.wrap(cpu.memory.get8(addr) + 1);
            cpu.setNegativeAndZeroFlags(val);
            cpu.memory.put8(addr, val);
        }},
        { op: 0xEE, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu) {
            const addr = cpu.absoluteAddress();
            let val = math.wrap(cpu.memory.get8(addr) + 1);
            cpu.setNegativeAndZeroFlags(val);
            cpu.memory.put8(addr, val);
        }},
        { op: 0xFE, mode: AddrMode.ABSOLUTE_X, cycles: 7, exe: function(cpu) {
            const addr = cpu.absoluteXAddress();
            let val = math.wrap(cpu.memory.get8(addr) + 1);
            cpu.setNegativeAndZeroFlags(val);
            cpu.memory.put8(addr, val);
        }},
    ],
    INX: [
        { op: 0xE8, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.x = math.wrap(cpu.x + 1);
        }},
    ],
    INY: [
        { op: 0xC8, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.y = math.wrap(cpu.y + 1);
        }},
    ],
    JMP: [
        { op: 0x4C, mode: AddrMode.ABSOLUTE, cycles: 3, exe: function(cpu) {
            cpu.pc = cpu.readPC16();
        }},
        { op: 0x6C, mode: AddrMode.INDIRECT, cycles: 5, exe: function(cpu) {
            cpu.pc = cpu.memory.get16WithPageWrap(cpu.readPC16());
        }}
    ],
    JSR: [
        { op: 0x20, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu) {
            cpu.push16(cpu.pc + 1);
            cpu.pc = cpu.readPC16();
        }}
    ],
    LDA: [
        { op: 0xA9, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            cpu.a = cpu.readPC();
        }},
        { op: 0xA5, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.a = cpu.readZeroPage();
        }},
        { op: 0xB5, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            cpu.a = cpu.readZeroPageX();
        }},
        { op: 0xAD, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.a = cpu.readAbsolute();
        }},
        { op: 0xBD, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.a = cpu.readAbsoluteX();
        }},
        { op: 0xB9, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu) {
            cpu.a = cpu.readAbsoluteY();
        }},
        { op: 0xA1, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu) {
            cpu.a = cpu.readIndirectX();
        }},
        { op: 0xB1, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu) {
            cpu.a = cpu.readIndirectY();
        }}
    ],
    LDX: [
        { op: 0xA2, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            cpu.x = cpu.readPC();
        }},
        { op: 0xA6, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu) {
            cpu.x = cpu.readZeroPage();
        }},
        { op: 0xB6, mode: AddrMode.ZEROPAGE_Y, cycles: 2, exe: function(cpu) {
            cpu.x = cpu.readZeroPageY();
        }},
        { op: 0xAE, mode: AddrMode.ABSOLUTE, cycles: 3, exe: function(cpu) {
            cpu.x = cpu.readAbsolute();
        }},
        { op: 0xBE, mode: AddrMode.ABSOLUTE_Y, cycles: 3, exe: function(cpu) {
            cpu.x = cpu.readAbsoluteY();
        }},
    ],
    LDY: [
        { op: 0xA0, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            cpu.y = cpu.readPC();
        }},
        { op: 0xA4, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu) {
            cpu.y = cpu.readZeroPage();
        }},
        { op: 0xB4, mode: AddrMode.ZEROPAGE_X, cycles: 2, exe: function(cpu) {
            cpu.y = cpu.readZeroPageX();
        }},
        { op: 0xAC, mode: AddrMode.ABSOLUTE, cycles: 3, exe: function(cpu) {
            cpu.y = cpu.readAbsolute();
        }},
        { op: 0xBC, mode: AddrMode.ABSOLUTE_X, cycles: 3, exe: function(cpu) {
            cpu.y = cpu.readAbsoluteX();
        }},
    ],
    LSR: [
        { op: 0x4A, mode: AddrMode.ACCUMULATOR, cycles: 2, exe: function(cpu) {
            cpu.setFlag(Flag.CARRY, cpu.a & 1);
            cpu.a >>>= 1;
        }},
        { op: 0x46, mode: AddrMode.ZEROPAGE, cycles: 5, exe: function(cpu) {
            lsr(cpu, cpu.zeroPageAddress());
        }},
        { op: 0x56, mode: AddrMode.ZEROPAGE_X, cycles: 6, exe: function(cpu) {
            lsr(cpu, cpu.zeroPageXAddress());
        }},
        { op: 0x4E, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu) {
            lsr(cpu, cpu.absoluteAddress());
        }},
        { op: 0x5E, mode: AddrMode.ABSOLUTE_X, cycles: 7, exe: function(cpu) {
            lsr(cpu, cpu.absoluteXAddress());
        }}
    ],
    NOP: [
        { op: 0xEA, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
        }},
        // below are all undocumented no-op instructions
        { op: 0x80, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0x1A, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
        }},
        { op: 0x3A, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
        }},
        { op: 0x5A, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
        }},
        { op: 0x7A, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
        }},
        { op: 0xDA, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
        }},
        { op: 0xFA, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
        }},
        { op: 0x04, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0x14, mode: AddrMode.INDIRECT_X, cycles: 4, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0x34, mode: AddrMode.INDIRECT_X, cycles: 4, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0x44, mode: AddrMode.INDIRECT_X, cycles: 3, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0x54, mode: AddrMode.INDIRECT_X, cycles: 4, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0x64, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0x74, mode: AddrMode.INDIRECT_X, cycles: 4, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0xD4, mode: AddrMode.INDIRECT_X, cycles: 4, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0xF4, mode: AddrMode.INDIRECT_X, cycles: 4, exe: function(cpu) {
            cpu.readPC();
        }},
        { op: 0x0C, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.readPC16();
        }},
        { op: 0x1C, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.readPC16();
        }},
        { op: 0x3C, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.readPC16();
        }},
        { op: 0x5C, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.readPC16();
        }},
        { op: 0x7C, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.readPC16();
        }},
        { op: 0xDC, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.readPC16();
        }},
        { op: 0xFC, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.readPC16();
        }},
    ],
    ORA: [
        { op: 0x09, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.a |= cpu.readPC();
        }},
        { op: 0x05, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.a |= cpu.readZeroPage();
        }},
        { op: 0x15, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            cpu.a |= cpu.readZeroPageX();
        }},
        { op: 0x0D, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.a |= cpu.readAbsolute();
        }},
        { op: 0x1D, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            cpu.a |= cpu.readAbsoluteX();
        }},
        { op: 0x19, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu) {
            cpu.a |= cpu.readAbsoluteY();
        }},
        { op: 0x01, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu) {
            cpu.a |= cpu.readIndirectX();
        }},
        { op: 0x11, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu) {
            cpu.a |= cpu.readIndirectY();
        }}
    ],
    PHA: [
        { op: 0x48, mode: AddrMode.IMPLICIT, cycles: 3, exe: function(cpu) {
            cpu.push8(cpu.a);
        }}
    ],
    PHP: [
        { op: 0x08, mode: AddrMode.IMPLICIT, cycles: 3, exe: function(cpu) {
            // the BREAK bit is set in the pushed value (but not in p itself)
            // per https://wiki.nesdev.com/w/index.php/CPU_status_flag_behavior
            cpu.push8(cpu.p | Flag.BREAK);
        }}
    ],
    PLA: [
        { op: 0x68, mode: AddrMode.IMPLICIT, cycles: 4, exe: function(cpu) {
            cpu.a = cpu.pop8();
        }}
    ],
    PLP: [
        { op: 0x28, mode: AddrMode.IMPLICIT, cycles: 4, exe: function(cpu) {
            cpu.p = cpu.pop8();
        }}
    ],
    ROL: [
        { op: 0x2A, mode: AddrMode.ACCUMULATOR, cycles: 2, exe: function(cpu) {
            let val = cpu.a;
            val <<= 1;
            if (cpu.p & Flag.CARRY) {
                val |= 0x01;
            }
            cpu.setFlag(Flag.CARRY, val > 0xFF);
            val &= 0xFF;
            cpu.a = val;
        }},
        { op: 0x26, mode: AddrMode.ZEROPAGE, cycles: 5, exe: function(cpu) {
            rol(cpu, cpu.zeroPageAddress());
        }},
        { op: 0x36, mode: AddrMode.ZEROPAGE_X, cycles: 6, exe: function(cpu) {
            rol(cpu, cpu.zeroPageXAddress());
        }},
        { op: 0x2E, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu) {
            rol(cpu, cpu.absoluteAddress());
        }},
        { op: 0x3E, mode: AddrMode.ABSOLUTE_X, cycles: 7, exe: function(cpu) {
            rol(cpu, cpu.absoluteXAddress());
        }}
    ],
    ROR: [
        { op: 0x6A, mode: AddrMode.ACCUMULATOR, cycles: 2, exe: function(cpu) {
            const carry = cpu.p & Flag.CARRY;
            let val = cpu.a;
            cpu.setFlag(Flag.CARRY, val & 0x01);
            val >>>= 1;
            if (carry) {
                val |= 0x80;
            }
            cpu.a = val;
        }},
        { op: 0x66, mode: AddrMode.ZEROPAGE, cycles: 5, exe: function(cpu) {
            ror(cpu, cpu.zeroPageAddress());
        }},
        { op: 0x76, mode: AddrMode.ZEROPAGE_X, cycles: 6, exe: function(cpu) {
            ror(cpu, cpu.zeroPageXAddress());
        }},
        { op: 0x6E, mode: AddrMode.ABSOLUTE, cycles: 6, exe: function(cpu) {
            ror(cpu, cpu.absoluteAddress());
        }},
        { op: 0x7E, mode: AddrMode.ABSOLUTE_X, cycles: 7, exe: function(cpu) {
            ror(cpu, cpu.absoluteXAddress());
        }}
    ],
    RTI: [
        { op: 0x40, mode: AddrMode.IMPLICIT, cycles: 6, exe: function(cpu) {
            cpu.p = cpu.pop8();
            cpu.pc = cpu.pop16();
        }}
    ],
    RTS: [
        { op: 0x60, mode: AddrMode.IMPLICIT, cycles: 6, exe: function(cpu) {
            cpu.pc = cpu.pop16() + 1;
        }}
    ],
    SBC: [
        { op: 0xE9, mode: AddrMode.IMMEDIATE, cycles: 2, exe: function(cpu) {
            sbc(cpu, cpu.readPC());
        }},
        { op: 0xE5, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            sbc(cpu, cpu.readZeroPage());
        }},
        { op: 0xF5, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            sbc(cpu, cpu.readZeroPageX());
        }},
        { op: 0xED, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            sbc(cpu, cpu.readAbsolute());
        }},
        { op: 0xFD, mode: AddrMode.ABSOLUTE_X, cycles: 4, exe: function(cpu) {
            sbc(cpu, cpu.readAbsoluteX());
        }},
        { op: 0xF9, mode: AddrMode.ABSOLUTE_Y, cycles: 4, exe: function(cpu) {
            sbc(cpu, cpu.readAbsoluteY());
        }},
        { op: 0xE1, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu) {
            sbc(cpu, cpu.readIndirectX());
        }},
        { op: 0xF1, mode: AddrMode.INDIRECT_Y, cycles: 5, exe: function(cpu) {
            sbc(cpu, cpu.readIndirectY());
        }},
    ],
    SEC: [
        { op: 0x38, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu) {
            cpu.p |= Flag.CARRY;
        }}
    ],
    SED: [
        { op: 0xF8, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu) {
            cpu.p |= Flag.BCD;
        }}
    ],
    SEI: [
        { op: 0x78, mode: AddrMode.ZEROPAGE, cycles: 2, exe: function(cpu) {
            cpu.p |= Flag.INTERRUPT;
        }}
    ],
    STA: [
        { op: 0x85, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.writeZeroPage(cpu.a);
        }},
        { op: 0x95, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            cpu.writeZeroPageX(cpu.a);
        }},
        { op: 0x8D, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.writeAbsolute(cpu.a);
        }},
        { op: 0x9D, mode: AddrMode.ABSOLUTE_X, cycles: 3, exe: function(cpu) {
            cpu.writeAbsoluteX(cpu.a);
        }},
        { op: 0x99, mode: AddrMode.ABSOLUTE_Y, cycles: 5, exe: function(cpu) {
            cpu.writeAbsoluteY(cpu.a);
        }},
        { op: 0x81, mode: AddrMode.INDIRECT_X, cycles: 6, exe: function(cpu) {
            cpu.writeIndirectX(cpu.a);
        }},
        { op: 0x91, mode: AddrMode.INDIRECT_Y, cycles: 6, exe: function(cpu) {
            cpu.writeIndirectY(cpu.a);
        }},
    ],
    STX: [
        { op: 0x86, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.writeZeroPage(cpu.x);
        }},
        { op: 0x96, mode: AddrMode.ZEROPAGE_Y, cycles: 4, exe: function(cpu) {
            cpu.writeZeroPageY(cpu.x);
        }},
        { op: 0x8E, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.writeAbsolute(cpu.x);
        }}
    ],
    STY: [
        { op: 0x84, mode: AddrMode.ZEROPAGE, cycles: 3, exe: function(cpu) {
            cpu.writeZeroPage(cpu.y);
        }},
        { op: 0x94, mode: AddrMode.ZEROPAGE_X, cycles: 4, exe: function(cpu) {
            cpu.writeZeroPageX(cpu.y);
        }},
        { op: 0x8C, mode: AddrMode.ABSOLUTE, cycles: 4, exe: function(cpu) {
            cpu.writeAbsolute(cpu.y);
        }}
    ],
    TAX: [
        { op: 0xAA, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.x = cpu.a;
        }}
    ],
    TAY: [
        { op: 0xA8, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.y = cpu.a;
        }}
    ],
    TSX: [
        { op: 0xBA, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.x = cpu.sp;
        }}
    ],
    TXA: [
        { op: 0x8A, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.a = cpu.x;
        }}
    ],
    TXS: [
        { op: 0x9A, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.sp = cpu.x;
        }}
    ],
    TYA: [
        { op: 0x98, mode: AddrMode.IMPLICIT, cycles: 2, exe: function(cpu) {
            cpu.a = cpu.y;
        }}
    ]
};

function adc(cpu, val) {
    let result = cpu.a + val + (cpu.p & Flag.CARRY != 0);
    // see http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
    cpu.setFlag(Flag.OVERFLOW, ((cpu.a^result) & (val^result) & 0x80) != 0);
    cpu.setFlag(Flag.CARRY, result > 0xFF);
    cpu.a = math.wrap(result);
}

function asl(cpu, addr) {
    let val = cpu.memory.get8(addr);
    cpu.setFlag(Flag.CARRY, val & 0x80);
    val = (val << 1) & 0xFF;
    cpu.setNegativeAndZeroFlags(val);
    cpu.memory.put8(addr, val);
}

function lsr(cpu, addr) {
    const val = cpu.memory.get8(addr);
    cpu.setFlag(Flag.CARRY, val & 1);
    cpu.setNegativeAndZeroFlags(val >>> 1);
    cpu.memory.put8(addr, val >>> 1);
}

function rol(cpu, addr) {
    let val = cpu.memory.get8(addr);
    val <<= 1;
    if (cpu.p & Flag.CARRY) {
        val |= 0x01;
    }
    cpu.setFlag(Flag.CARRY, val > 0xFF);
    val &= 0xFF;
    cpu.setNegativeAndZeroFlags(val);
    cpu.memory.put8(addr, val);
}

function ror(cpu, addr) {
    const carry = cpu.p & Flag.CARRY;
    let val = cpu.memory.get8(addr);
    cpu.setFlag(Flag.CARRY, val & 0x01);
    val >>>= 1;
    if (carry) {
        val |= 0x80;
    }
    cpu.setNegativeAndZeroFlags(val);
    cpu.memory.put8(addr, val);
}

function sbc(cpu, val) {
    let result = cpu.a - val - ((cpu.p & Flag.CARRY) ? 0 : 1);

    cpu.setFlag(Flag.OVERFLOW, ((cpu.a ^ result) & (cpu.a ^ val) & 0x80) != 0);
    cpu.setFlag(Flag.CARRY, result <= 0xFF && result >= 0);
    cpu.a = math.wrap(result);
}

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

    copyFlagFrom(flag, value) {
        // copies the flag bit from the value to p
        this.p &= ~flag;
        this.p |= value & flag
    }

    setFlag(flag, predicate) {
        if (predicate) {
            this.p |= flag;
        } else {
            this.p &= ~flag;
        }
    }

    setNegativeAndZeroFlags(val) {
        this.copyFlagFrom(Flag.NEGATIVE, val);
        this.setFlag(Flag.ZERO, val == 0);
    }

    setComparisonFlags(val) {
        this.setFlag(Flag.CARRY, val >= 0);
        this.setNegativeAndZeroFlags(val);
    }

    set x(val) {
        this._x = val;
        this.setNegativeAndZeroFlags(val);
    }

    get x() {
        return this._x;
    }

    set y(val) {
        this._y = val;
        this.setNegativeAndZeroFlags(val);
    }

    get y() {
        return this._y;
    }

    set a(val) {
        this._a = val;
        this.setNegativeAndZeroFlags(val);
    }

    get a() {
        return this._a;
    }

    set p(val) {
        this._p = (val | Flag.BIT_5) & (~Flag.BREAK);
    }

    get p() {
        return this._p;
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

    zeroPageAddress() {
        return this.readPC();
    }

    zeroPageXAddress() {
        return (this.readPC() + this.x) % 256;
    }

    zeroPageYAddress() {
        return (this.readPC() + this.y) % 256;
    }

    absoluteAddress() {
        return this.readPC16();
    }

    absoluteXAddress() {
        return (this.readPC16() + this.x) & 0xFFFF;
    }

    absoluteYAddress() {
        return (this.readPC16() + this.y) & 0xFFFF;
    }

    indirectXAddress() {
        return this.memory.get16WithPageWrap((this.readPC() + this.x) & 0xFF);
    }

    indirectYAddress() {
        const addr = this.memory.get16WithPageWrap(this.readPC());
        return (addr + this.y) & 0xFFFF;
    }

    readRelative() {
        return signed(this.readPC())
    }

    readZeroPage() {
        return this.memory.get8(this.zeroPageAddress())
    }

    readZeroPageX() {
        return this.memory.get8(this.zeroPageXAddress())
    }

    readZeroPageY() {
        return this.memory.get8(this.zeroPageYAddress())
    }

    readAbsolute() {
        return this.memory.get8(this.absoluteAddress())
    }

    readAbsoluteX() {
        return this.memory.get8(this.absoluteXAddress())
    }

    readAbsoluteY() {
        return this.memory.get8(this.absoluteYAddress())
    }

    /** indexed indirect */
    readIndirectX() {
        return this.memory.get8(this.indirectXAddress());
    }

    /** indirect indexed */
    readIndirectY() {
        return this.memory.get8(this.indirectYAddress());
    }

    writeZeroPage(val) {
        return this.memory.put8(this.readPC(), val)
    }

    writeZeroPageX(val) {
        return this.memory.put8(this.zeroPageXAddress(), val)
    }

    writeZeroPageY(val) {
        return this.memory.put8(this.zeroPageYAddress(), val)
    }

    writeAbsolute(val) {
        return this.memory.put8(this.readPC16(), val)
    }

    writeAbsoluteX(val) {
        return this.memory.put8(this.absoluteXAddress(), val)
    }

    writeAbsoluteY(val) {
        return this.memory.put8(this.absoluteYAddress(), val)
    }

    writeIndirectX(val) {
        return this.memory.put8(this.indirectXAddress(), val)
    }

    writeIndirectY(val) {
        return this.memory.put8(this.indirectYAddress(), val)
    }

    // push value on stack
    push8(val) {
        this.memory.put8(this.sp + 0x100, val);
        this.sp--;
    }

    push16(val) {
        this.push8(val >> 8 & 0xFF);
        this.push8(val & 0xFF);
    }

    pop8() {
        this.sp += 1;
        return this.memory.get8(this.sp + 0x100);
    }

    pop16() {
        return this.pop8() | (this.pop8() << 8);
    }

    disassemble(addr) {
        try {
            let disasm = [];
            const op = this.opMap[this.memory.get8(addr)];
            disasm.push(op.opstr);
            switch (op.mode) {
                case AddrMode.ABSOLUTE:
                    disasm.push(printf("$%04X", this.memory.get16(addr + 1)));
                    break;
                case AddrMode.ABSOLUTE_X:
                    disasm.push(printf("$%04X", this.memory.get16(addr + 1)));
                    disasm.push("X");
                    break;
                case AddrMode.ABSOLUTE_Y:
                    disasm.push(printf("$%04X", this.memory.get16(addr + 1)));
                    disasm.push("Y");
                    break;
                case AddrMode.IMMEDIATE:
                    disasm.push(printf("#$%02X", this.memory.get8(addr + 1)));
                    break;
                case AddrMode.IMPLICIT:
                    break;
                case AddrMode.INDIRECT:
                    disasm.push(printf("($%04X)", this.memory.get16(addr + 1)));
                    break;
                case AddrMode.INDIRECT_X:
                    disasm.push(printf("($%02X, X)", this.memory.get8(addr + 1)));
                    break;
                case AddrMode.INDIRECT_Y:
                    disasm.push(printf("($%02X)", this.memory.get8(addr + 1)));
                    disasm.push("Y");
                    break;
                case AddrMode.RELATIVE:
                    const val = signed(this.memory.get8(addr + 1));
                    if (val > 0)
                        disasm.push(printf("*+$%02X", val));
                    else
                        disasm.push(printf("*-$%02X", ~val));
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
                case AddrMode.ACCUMULATOR:
                    disasm.push("A");
            }

            return disasm;
        } catch (e) {
            return [
                        printf("$%02X", this.memory.get8(this.pc)),
                        printf("$%02X", this.memory.get8(this.pc + 1)),
                        printf("$%02X", this.memory.get8(this.pc + 2))
                   ];
        }
    }

    execute() {

        const disasm = rightpad(this.disassemble(this.pc).toString(), 10);

        debug("$%a %s a=$%b x=$%b y=$%b sp=$%b p=%s ($%b)",
            this.pc,
            disasm,
            this.a,
            this.x,
            this.y,
            this.sp,
            Flag.toString(this.p),
            this.p
        );

        let op = this.readPC();
        const inst = this.opMap[op];

        try {
            inst.exe(this);
        } catch (e) {
            if (e instanceof TypeError) {
                debug("invalid op code $%b (%s)", op, e.toString());
                this.memory.debugPrintStack();
                throw new Error(printf("invalid op code $%02X - %s", op, e.toString()));
            } else {
                throw e;
            }
        }
    }
}

module.exports.CPU = CPU;
module.exports.Flag = Flag;