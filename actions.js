const mcdata = require("minecraft-data")('1.16.4');
const Item = require('prismarine-item')('1.16.4')
const pathfinder = require("./pathfinder.js");
const vec3 = require('vec3');

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

const clearBlock = async (bot, position)=>{
    bot.task.push("clear block");

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
    bot.task.push("place block");

    let itemType = mcdata.itemsByName[item].id;

    if (!checkInventory(bot, item)) {
        if (bot.game.gameMode == 'creative') {
            await bot.creative.setInventorySlot(36, new Item(itemType, 1));
        } else {
            console.log("Can't get item.");
        }
    }

    await bot.equip(itemType, slot);
    bot.task.pop();
};

const placeBlock = async (bot, position, type="dirt")=>{
    bot.task.push("place block");

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
exports.pathfind = pathfind;
exports.clearBlock = clearBlock;
exports.placeBlock = placeBlock;