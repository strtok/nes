"use strict";

const fs = require('fs');

let Rom = require('./rom').Rom;
let Memory = require('./memory').Memory;
let CPU = require('./cpu').CPU;
let APU = require('./apu').APU;

function start_rom(byteArray) {
    let rom = new Rom(byteArray);
    let memory = new Memory(rom.prgRom, new APU());
    let cpu = new CPU(memory);
    cpu.pc = memory.get16(0xFFFC);


    while (true) {
        cpu.execute();
    }
}

if (process.argv.length < 3) {
    console.error("no rom specified");
    process.exit(1);
}


const rom_file = process.argv[2];

fs.readFile(rom_file, (err, data) => {
    if (err) {
        if (err.code === "ENOENT") {
            console.error(rom_file + ' does not exist');
            return;
        } else {
            throw err;
        }
    }

    start_rom(new Uint8Array(data));
});