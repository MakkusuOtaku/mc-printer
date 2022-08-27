const mcdata = require("minecraft-data")('1.16.4');
const Item = require('prismarine-item')('1.16.4')
const pathfinder = require("./pathfinder.js");
const vec3 = require('vec3');
const fs = require('fs');

const woolBlocks = fs.readFileSync('wool-blocks.txt', 'utf8').split('\r\n');

function sleep(time) {
    return new Promise(resolve=>setTimeout(resolve, time));
}

const checkOP = async (bot)=>{
    let matches = await bot.tabComplete("/setblo");
    return !!matches.length;
};

const pathfind = async (bot, position, range=1)=>{
    bot.task.push("pathfind");

    let botPosition = bot.entity.position;
    let path = pathfinder.path(bot, bot.entity.position, position, range);

    while (botPosition.distanceTo(position) > range) {
        path = pathfinder.path(bot, botPosition, position, range);

        if (path.length) {
            pathfinder.walk(bot, path[path.length-1].position);
        }

        await sleep(100);

        botPosition = bot.entity.position;
    }

    bot.clearControlStates();
    bot.task.pop();
};

var lastSheep;

const getWool = async (bot, block)=>{
    bot.task.push("collect wool");
    let index = woolBlocks.indexOf(block);

    if (!lastSheep) {
        let sheep = bot.nearestEntity((entity)=>{
            return entity.name == 'sheep';
        });
        if (sheep) lastSheep = sheep.position;
    }

    if (lastSheep) await pathfind(bot, lastSheep, 4);

    let sheep = bot.nearestEntity((entity)=>{
        return entity.name == 'sheep' && entity.metadata[16] == index;
    });

    if (sheep) {
        lastSheep = sheep.position;

        await pathfind(bot, sheep.position, 2);
        equip(bot, 'shears');
        await bot.activateEntity(sheep);

        await sleep(1000);

        let wool = bot.nearestEntity((entity)=>{
            return entity.name == 'item';
        });

        for (let loops = 0; loops < 5 && wool; loops++) {
            await pathfind(bot, wool.position.clone(), 1.2);

            wool = bot.nearestEntity((entity)=>{
                return entity.name == 'item';
            });
        }
    }
    else console.log(`Can't find sheep for ${block}.`);
    bot.task.pop();
};

const clearBlock = async (bot, position)=>{
    bot.task.push("clear");

    if (bot.entity.position.distanceTo(position) > 5) {
        await pathfind(bot, position, 4);
    }

    let block = bot.blockAt(position);

    if (bot.game.gameMode == "survival") {
        //Get some tools
    }

    await bot.dig(block, true);

    //TODO:     Remove entities from space too.

    bot.task.pop();
};

function checkInventory(bot, itemName) {
    let items = bot.inventory.items();
    return items.filter(item => item.name === itemName).length;
}

const equip = async (bot, item, slot='hand')=>{
    bot.task.push("equip");

    let itemType = mcdata.itemsByName[item].id;

    if (!checkInventory(bot, item)) {
        if (bot.game.gameMode == 'creative') {
            await bot.creative.setInventorySlot(36, new Item(itemType, 1));
        } else {
            if (item.endsWith('_wool')) {
                await getWool(bot, item);
            } else {
                console.log("Can't get item.");
            }
        }
    }

    await bot.equip(itemType, slot);
    bot.task.pop();
};

const placeBlock = async (bot, position, type="dirt")=>{
    bot.task.push("place");

    await clearBlock(bot, position).catch(console.log);

    //let itemType = mcdata.itemsByName[type].id;
    await equip(bot, type);//bot.equip(itemType, 'hand');

    if (bot.entity.position.distanceTo(position) > 5) {
        await pathfind(bot, position, 4);
    }

    let referenceBlock = bot.blockAt(position.offset(0, -1, 0), false);
    await bot.placeBlock(referenceBlock, vec3(0, 1, 0)).catch(console.log);

    bot.task.pop();
};

exports.sleep = sleep;
exports.checkOP = checkOP;
exports.getWool = getWool;
exports.pathfind = pathfind;
exports.clearBlock = clearBlock;
exports.placeBlock = placeBlock;