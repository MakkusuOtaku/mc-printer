const mineflayer = require('mineflayer');
const actions = require("./actions.js");
const vec3 = require('vec3');
const getPixels = require('get-pixels');
const fs = require('fs');
const colourDistances = require('./colour-distances.js');
const antiColor = require('./antimatter-color.js');

const settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const palettes = JSON.parse(fs.readFileSync('palettes.json', 'utf8'));

const COLOR = {
    cyan: '\x1b[36m%s\x1b[0m',
    green: '\x1b[32m%s\x1b[0m',
    red: '\x1b[31m%s\x1b[0m',
    yellow: '\x1b[33m%s\x1b[0m'
};

const banner = `
    ███    ███  ██████       ██████  ██████  ██ ███    ██ ████████ ███████ ██████  
    ████  ████ ██            ██   ██ ██   ██ ██ ████   ██    ██    ██      ██   ██ 
    ██ ████ ██ ██      █████ ██████  ██████  ██ ██ ██  ██    ██    █████   ██████  
    ██  ██  ██ ██            ██      ██   ██ ██ ██  ██ ██    ██    ██      ██   ██ 
    ██      ██  ██████       ██      ██   ██ ██ ██   ████    ██    ███████ ██   ██ 
`;

let bot, mcdata;

console.clear();
console.log(COLOR.cyan, banner);

const readline = require("readline");

const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function saveSettings() {
    let data = JSON.stringify(settings, null, 4);
    fs.writeFileSync('settings.json', data);
}

async function runCommand(command) {
    const args = command.split(' ');

    switch(args[0]) {
        case 'draw':
            console.log("Drawing an image!");
            let image = await loadImage(args[1]);

            let palette = [];

            for (p of args[2].split('+')) {
                palette.push(...palettes[p]);
            }

            let size = args[3].split('x').map(n=>parseInt(n));

            if (size.length === 1) {
                let scale = size[0]/image.shape[0];
                size.push(Math.round(image.shape[1]*scale));
            }

            buildStructure(
                image,
                palette,
                bot.entity.position.clone(),
                size,
            );
            break;
        case 'join':
            console.log("Joining server!");
            if (args.length === 3) {
                joinServer(args[1], parseInt(args[2]));
            } else if (args.length === 2) {
                joinServer("localhost", parseInt(args[1]));
            }
            break;
        case 'mode':
            if (args.length === 1) {
                console.log(`Color mode is ${settings.mode}.`);
                break;
            }
            if (args[1].toLowerCase() === "rgb") settings.mode = "RGB";
            else if (args[1].toLowerCase() === "lab") settings.mode = "LAB";
            else {
                console.log(COLOR.red, "Unknown color mode.");
            }
            saveSettings();
            break;
        case 'rejoin':
            joinServer(settings.lastJoin.server, parseInt(settings.lastJoin.port));
            break;
        case 'rot':
            console.log(COLOR.green, "Rotating!!!");
            break;
        case 'sheep':
            console.log("Sheeping!");
            actions.getWool(bot, args[1]);
            break;
        default:
            console.log("Unknown command.");
    }
}

function inputLoop(command) {
    if (command) runCommand(command);
    reader.question(">", inputLoop);
}

inputLoop();

function joinServer(server="localhost", portNumber) {
    console.log(`Creating bot on "${server}" at ${portNumber}.`);

    settings.lastJoin = {
        server: server,
        port: portNumber,
    };

    saveSettings();

    bot = mineflayer.createBot({
        host: server,
        username: "PrinterBot",
        port: portNumber,
    });

    bot.on('kicked', (reason)=>{
        console.log(COLOR.red, reason);
    });

    bot.on('error', (error)=>{
        console.log(COLOR.yellow, error);
    });

    bot.task = [];

    bot.once('spawn', ()=>{
        console.log(COLOR.green, "Joined server.");
        mcdata = require('minecraft-data')(bot.version);
        bot.chat("I'm a happy little robot.");
    });

    bot.on('chat', (username, message)=>{
        if (username != "Makkusu_Otaku") return;
        runCommand(message);
    });
}

async function loadImage(path) {
    return new Promise(resolve=>{
        getPixels(path, (err, image)=>{
            resolve(image);
        });
    });
}

function getBlock(image, x, z, palette=palettes.concrete) {
    x = Math.floor(image.shape[0]*x);
    z = Math.floor(image.shape[1]*z);

    let r = image.get(x, z, 0);
    let g = image.get(x, z, 1);
    let b = image.get(x, z, 2);

    let best = palette[0];

    for (i in palette) {

        if (mode === "LAB") {
            let sourceColor = antiColor.rgb2lab([r, g, b]);
            let colA = antiColor.rgb2lab(best.colour);
            let colB = antiColor.rgb2lab(palette[i].colour);
            let disA = antiColor.deltaE(sourceColor, colA);
            let disB = antiColor.deltaE(sourceColor, colB);
            
            best = disA < disB? best : palette[i];
        } else if (mode === "RGB") {
            let colA = best.colour;
            let colB = palette[i].colour;
            let disA = colourDistances.rgb(r, g, b, colA[0], colA[1], colA[2]);
            let disB = colourDistances.rgb(r, g, b, colB[0], colB[1], colB[2]);

            best = disA < disB? best : palette[i];
        }
    }

    if (image.shape[2] == 4) {
        let alpha = image.get(x, z, 3);

        if (alpha <= 64) {
            best = {block:null};
        } else if (alpha <= 128) {
            let best = palettes.glass[0];

            for (i in palettes.glass) {
                let colA = best.colour;
                let colB = palettes.glass[i].colour;
                let disA = colourDistances.rgb(r, g, b, colA[0], colA[1], colA[2]);
                let disB = colourDistances.rgb(r, g, b, colB[0], colB[1], colB[2]);
                
                best = disA < disB? best : palettes.glass[i];
            }
        }
    }

    return best.block;
}

async function buildStructure(texture, palette, startPosition=bot.entity.position.clone(), size=[64, 64]) {
    bot.task.push("draw");
    startPosition = startPosition.offset(1, 0, 1);

    let zD = 1;
    let z = 0;

    for (let x = 0; x < size[0]; x += settings.chunkSize) {
        while (z < size[1] && z > -1) {

            for (xx = 0; xx < settings.chunkSize && x+xx < size[0]; xx++) {
                let k = x+xx;

                let block = getBlock(texture, k/size[0], z/size[1], palette);
            
                if (settings.commands) {
                    let pos = startPosition.offset(k, 0, z).floor();
                    bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} ${block}`);
                } else {
                    if (block) await actions.placeBlock(bot, startPosition.offset(k, 0, z), block);
                    else await actions.clearBlock(bot, startPosition.offset(k, 0, z), block);
                }
            }
            z += zD;
        }
        await actions.sleep(500);
        zD = -zD;
        z += zD;
    }
    bot.task.pop();
}
