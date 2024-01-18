const fs = require('fs');
const vec3 = require('vec3');
const getPixels = require('get-pixels');

const Item = require('prismarine-item')('1.16.4');

const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

const palettes = JSON.parse(fs.readFileSync('palettes.json', 'utf8'));

async function loadImage(path) {
    return new Promise(resolve=>{
        getPixels(path, (err, image)=>{
            resolve(image);
        });
    });
}

function getPixelRGB(image, x, y) {
    x = Math.floor(image.shape[0]*x);
    y = Math.floor(image.shape[1]*y);

    return [
        image.get(x, y, 0),
        image.get(x, y, 1),
        image.get(x, y, 2),
        image.get(x, y, 3),
    ];
}

function getBlock(bot, image, x, z, palette=palettes.concrete, gif=false, t=1) {
    /*
    let r, g, b, alpha;

    if (!gif) {
        x = Math.floor(image.shape[0]*x);
        z = Math.floor(image.shape[1]*z);

        r = image.get(x, z, 0);
        g = image.get(x, z, 1);
        b = image.get(x, z, 2);
        alpha = image.get(x, z, 3);
    } else {
        x = Math.floor(image.shape[1]*x);
        z = Math.floor(image.shape[2]*z);

        r = image.get(t, x, z, 0);
        g = image.get(t, x, z, 1);
        b = image.get(t, x, z, 2);
        alpha = 255;
    }
    */

    let [r, g, b, alpha] = getPixelRGB(image, x, z);

    let block = bot.colors.getBlock([r, g, b, alpha], palette);
    return block;
}

let blocksPlaced = 0;

async function setBlock(bot, position, blockType) {
    if (blockType === "air" || blockType === "cave_air") return;

    if (!blockType) return;

    // Without commands

    const goal = new goals.GoalPlaceBlock(position, bot.world, {});
    //const goal = new goals.GoalNear(position.x, position.y, position.z, 1);

    await bot.pathfinder.goto(goal);

    const itemID = bot.registry.itemsByName[blockType].id;

    await bot.creative.setInventorySlot(36, new Item(itemID, 1));

    await bot.equip(itemID);

    const reference = bot.blockAt(position.offset(0, -1, 0), false);
    await bot.placeBlock(reference, {x: 0, y: 1, z: 0}).catch(console.log);

    return;

    // Using commands

    await bot.chat(`/setblock ${position.x} ${position.y} ${position.z} ${blockType}`);

    if (blocksPlaced % bot.settings.chunkSize === 0) await bot.waitForTicks(1);
    blocksPlaced++;
}

async function buildImage(bot, image, {palette, startPosition, size=[64, 64]}) {
    startPosition = startPosition || bot.entity.position.clone();
    startPosition = startPosition.offset(1, 0, 1);

    // printData.isPrinting = true;

    let zD = 1;
    let z = 0;

    for (let x = 0; x < size[0]; x += bot.draw.chunkSize) {
        while (z < size[1] && z > -1) {
            // printData.progress = x/size[0];
            // printData.bar = createBar(printData.progress*20);

            for (xx = 0; xx < bot.draw.chunkSize && x+xx < size[0]; xx++) {
                let k = x+xx;

                const color = bot.colors.getPixelRGB(image, k/size[0], z/size[1]);
                const block = bot.colors.getBlock(color);

                // TODO: redo placing and removing blocks

                let pos = startPosition.offset(k, 0, z).floor();
                //bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} ${block}`);
                await bot.build.block(pos, block);
            }
            await bot.waitForTicks(1);
            z += zD;
        }

        zD = -zD;
        z += zD;
    }

    //printData.isPrinting = false;
}

async function buildImageGreyScale(bot, image, origin, size=[64, 64], dither=true) {
    origin = origin || bot.entity.position.clone();
    origin = origin.offset(1, 0, 1);

    const [width, height] = size;

    // Get lightness of each pixel.
    const imageData = [];

    for (let y = 0; y < height; y++) {
        const row = [];

        for (let x = 0; x < width; x++) {
            const [r, g, b] = getPixelRGB(image, x / width, y / height);
            const luminance = (r * 0.299) + (g * 0.587) + (b * 0.144); // Convert using the NTSC formula

            row.push(luminance);
        }

        imageData.push(row);
    }

    // Apply Floyd-Steinberg dither
    if (dither) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const targetLuminance = imageData[y][x];
                const realLuminance = targetLuminance > 128? 255 : 0;

                const error = targetLuminance - realLuminance;

                if (x < width-1 && y < height-1) {
                    imageData[y+0][x+1] += error * (7 / 16);
                    imageData[y+1][x+1] += error * (1 / 16);
                    imageData[y+1][x+0] += error * (5 / 16);
                    imageData[y+1][x-1] += error * (3 / 16);
                }

                //imageData[y][x] = realLuminance;

                /*const blockType = realLuminance > 128? "white_concrete" : "black_concrete";

                let pos = origin.offset(x, 0, y).floor();
                bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} ${blockType}`);*/
            }
            //await bot.waitForTicks(1);
        }
    }

    // Build the image in the world
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const luminance = imageData[y][x];

            let blockType;

            if (bot.version === "1.12.2") blockType = luminance > 128? "wool 0" : "wool 15";
            else blockType = luminance > 128? "white_concrete" : "black_concrete";

            let pos = origin.offset(x, 0, y).floor();
            bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} ${blockType}`);
        }

        await bot.waitForTicks(1);
    }
}

async function buildImageDithered(bot, image, {palette, origin, size=[64, 64], dither=true, direction="horizontal"}) {
    origin = origin || bot.entity.position.clone();
    origin = origin.offset(1, 0, 1);

    const [width, height] = size;

    // Get lightness of each pixel.
    const imageData = [];

    for (let y = 0; y < height; y++) {
        const row = [];

        for (let x = 0; x < width; x++) {
            const rgb = getPixelRGB(image, x / width, y / height);
            
            row.push(rgb);
        }

        imageData.push(row);
    }

    // Apply Floyd-Steinberg dither (might not be accurate)
    for (let y = 0; y < height; y++) {
        console.log(`Dithering: ${Math.round(y/height * 1000) / 10}%`);
        for (let x = 0; x < width; x++) {
            const [target_r, target_g, target_b] = imageData[y][x];
            const best_block = bot.colors.getPaletteMatch(imageData[y][x], palette);

            const [real_r, real_g, real_b] = best_block.average;

            const error_r = target_r - real_r;
            const error_g = target_g - real_g;
            const error_b = target_b - real_b;

            if (x > 0 && x < width-1 && y > 0 && y < height-1) {
                imageData[y+0][x+1][0] += error_r * (7 / 16);
                imageData[y+1][x+1][0] += error_r * (1 / 16);
                imageData[y+1][x+0][0] += error_r * (5 / 16);
                imageData[y+1][x-1][0] += error_r * (3 / 16);

                imageData[y+0][x+1][1] += error_g * (7 / 16);
                imageData[y+1][x+1][1] += error_g * (1 / 16);
                imageData[y+1][x+0][1] += error_g * (5 / 16);
                imageData[y+1][x-1][1] += error_g * (3 / 16);

                imageData[y+0][x+1][2] += error_b * (7 / 16);
                imageData[y+1][x+1][2] += error_b * (1 / 16);
                imageData[y+1][x+0][2] += error_b * (5 / 16);
                imageData[y+1][x-1][2] += error_b * (3 / 16);
            }

            imageData[y][x] = best_block.block;
        }
    }

    // Build the image in the world
    if (direction === "vertical") await bot.build.area2DVerticle(imageData, origin);
    else await bot.build.area2D(imageData, origin);
}

module.exports = (bot)=>{
    if (!bot.draw) bot.draw = {
        chunkSize: 4,
    };

    //bot.loadPlugin(pathfinder);
    
    //const defaultMovements = new Movements(bot);
    //bot.pathfinder.setMovements(defaultMovements);

    bot.draw.image = async (path, {palette, position, size, direction="horizontal"})=>{
        let image = await loadImage(path);

        if (size.length === 1) {
            let scale = size[0]/image.shape[0];
            size.push(Math.round(image.shape[1]*scale));
        }

        await buildImage(bot, image, {
            palette: palette,
            position: position,
            size: size,
            direction: direction,
        });
    };

    bot.draw.greyscale = async (path, {position, size, dither})=>{
         let image = await loadImage(path);

        if (size.length === 1) {
            let scale = size[0]/image.shape[0];
            size.push(Math.round(image.shape[1]*scale));
        }

        await buildImageGreyScale(
            bot,
            image,
            position,
            size,
            dither
        );
    };

    bot.draw.dithered = async (path, {palette, position, size, direction="verticle"})=>{
        const image = await loadImage(path);

        if (size.length === 1) {
            let scale = size[0] / image.shape[0];
            size.push(Math.round(image.shape[1] * scale));
        }

        await buildImageDithered(bot, image, {
            palette,
            position,
            size,
            direction,
        });
    };

    bot.commands.draw = async (args, {output, optionalArguments})=>{
        //output("Drawing an image!", COLOR.green);

        let image = args[1];

        let size = args[3].split('x').map(n=>parseInt(n));
        
        bot.draw.image(image, {
                palette: args[2],
                position: bot.entity.position.clone(),
                size: size,
                direction: optionalArguments.direction || "horizontal",
            }
        );
    };

    bot.commands.dithered = async (args, {optionalArguments})=>{
        //addLog("Drawing a dithered image!", COLOR.green);

        const image = args[1];

        const size = args[3].split('x').map(n=>parseInt(n));
        
        bot.draw.dithered(image, {
                palette: args[2],
                position: bot.entity.position.clone(),
                size: size,
                direction: optionalArguments.direction || "horizontal",
            }
        );
    };

    bot.commands.slabs = ()=>{
        bot.chat("I'm on it Mr. Slabs!");
    };
};