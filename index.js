const mineflayer = require('mineflayer');
const actions = require("./actions.js");
const vec3 = require('vec3');
const getPixels = require('get-pixels');
const fs = require('fs');
const colourDistances = require('./colour-distances.js');

var mcdata;

const settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const palettes = JSON.parse(fs.readFileSync('palettes.json', 'utf8'));

const bot = mineflayer.createBot({
    host: "localhost",
    username: "Machine_0",
    version: "1.16.4",
    port: 57245,
});

bot.task = [];

bot.once('spawn', ()=>{
    mcdata = require('minecraft-data')(bot.version);

    bot.chat("Ready to work.");
    bot.chat(`Gamemode: ${bot.game.gameMode}`);
})

bot.on('chat', async (username, message)=>{
    if (username != "Makkusu_Otaku") return;

    let tokens = message.split(' ');

    switch (tokens[0]) {
        case 'draw':
            let image = await loadImage(tokens[1]);

            let palette = [];

            for (p of tokens[2].split('+')) {
                palette.push(...palettes[p]);
            }

            let size = tokens[3].split('x').map(n=>parseInt(n));

            buildStructure(
                image,
                palette,
                bot.entity.position.clone(),
                size,
            );
            break;
    }
});

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
        let colA = best.colour;
        let colB = palette[i].colour;
        let disA = colourDistances.rgb(r, g, b, colA[0], colA[1], colA[2]);
        let disB = colourDistances.rgb(r, g, b, colB[0], colB[1], colB[2]);
        
        best = disA < disB? best : palette[i];
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

    for (let x = 0; x < size[0]; x++) {
        while (z < size[1] && z > -1) {

            let block = getBlock(texture, x/size[0], z/size[1], palette);
            
            if (block) await actions.placeBlock(bot, startPosition.offset(x, 0, z), block);
            else await actions.clearBlock(bot, startPosition.offset(x, 0, z), block);
            z += zD;
        }
        zD = -zD;
        z += zD;
    }
    bot.task.pop();
}

setInterval(()=>{
    console.clear();
    console.log(bot.task.join(' > '));
}, 200);