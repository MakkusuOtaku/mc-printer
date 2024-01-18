const fs = require('fs');

const antiColor = require('./antimatter-color.js');
const colourDistances = require('./colour-distances.js');
const palettes = JSON.parse(fs.readFileSync('palettes.json', 'utf8'));

// TODO: offload OLD_NAMES and PALETTES to files.

// Load block colors.
const BLOCK_COLORS = {};

let block_color_data = fs.readFileSync("block-colors.txt", 'utf8');

for (line of block_color_data.split('\n')) {
    let [block, color] = line.split(' : ');
    let rgb = color.split(' ').map(parseFloat);

    BLOCK_COLORS[block] = rgb;
}

delete block_color_data;

const OLD_BLOCK_NAMES = {
    "white_wool" : "wool 0",
    "orange_wool" : "wool 1",
    "magenta_wool": "wool 2",
    "light_blue_wool" : "wool 3",
    "yellow_wool" : "wool 4",
    "lime_wool" : "wool 5",
    "pink_wool" : "wool 6",
    "gray_wool" : "wool 7",
    "light_gray_wool" : "wool 8",
    "cyan_wool" : "wool 9",
    "purple_wool" : "wool 10",
    "blue_wool" : "wool 11",
    "brown_wool" : "wool 12",
    "green_wool" : "wool 13",
    "red_wool" : "wool 14",
    "black_wool" : "wool 15",
    "white_concrete" : "concrete 0",
    "orange_concrete" : "concrete 1",
    "magenta_concrete": "concrete 2",
    "light_blue_concrete" : "concrete 3",
    "yellow_concrete" : "concrete 4",
    "lime_concrete" : "concrete 5",
    "pink_concrete" : "concrete 6",
    "gray_concrete" : "concrete 7",
    "light_gray_concrete" : "concrete 8",
    "cyan_concrete" : "concrete 9",
    "purple_concrete" : "concrete 10",
    "blue_concrete" : "concrete 11",
    "brown_concrete" : "concrete 12",
    "green_concrete" : "concrete 13",
    "red_concrete" : "concrete 14",
    "black_concrete" : "concrete 15",
};

const PALETTES = {
    "concrete": [
        "white_concrete",
        "orange_concrete",
        "magenta_concrete",
        "light_blue_concrete",
        "yellow_concrete",
        "lime_concrete",
        "pink_concrete",
        "gray_concrete",
        "light_gray_concrete",
        "cyan_concrete",
        "purple_concrete",
        "blue_concrete",
        "brown_concrete",
        "green_concrete",
        "red_concrete",
        "black_concrete",
    ],
    //"wood": [],
    "wool": [
        "white_wool",
        "orange_wool",
        "magenta_wool",
        "light_blue_wool",
        "yellow_wool",
        "lime_wool",
        "pink_wool",
        "gray_wool",
        "light_gray_wool",
        "cyan_wool",
        "purple_wool",
        "blue_wool",
        "brown_wool",
        "green_wool",
        "red_wool",
        "black_wool",
    ],
    "tiny": [
        "black_wool",
        "white_wool",
        "cyan_wool",
        "red_wool",
    ],
};

function parsePaletteString(paletteString) {
	let palette = [];

    for (p of paletteString.split('+')) {
        palette.push(...palettes[p]);
    }

    return palette;
}

function colorDistanceRGB([r1, g1, b1], [r2, g2, b2]) {
	return colourDistances.rgb(r1, g1, b1, r2, g2, b2);
}

function colorDistanceLAB([r1, g1, b1], [r2, g2, b2]) {
	//
}

const distance = {
    rgb: ([r1, g1, b1], [r2, g2, b2])=>{
        return Math.hypot(r1-r2, g1-g2, b1-b2);
    },
    lab: (rgb1, rgb2)=>{
        let colorA = antiColor.rgb2lab(rgb1);
        let colorB = antiColor.rgb2lab(rgb2);
        
        return antiColor.deltaE(colorA, colorB);
    },
};

function getPaletteMatch(bot, color, palette, mode="LAB", source="average") {
    if (typeof palette === "string") palette = parsePaletteString(palette);
    const [r, g, b, alpha] = color;

    let best;

    // TODO: Reorganise the function so this isn't necessary.
    if (true) {//if (bot.version === "1.12.2") {
        const currentPalette = [...PALETTES.wool, ...PALETTES.concrete];

        best = currentPalette[0];

        for (i in currentPalette) {
            //let distanceA = colorDistanceRGB([r, g, b], BLOCK_COLORS[best]);
            //let distanceB = colorDistanceRGB([r, g, b], BLOCK_COLORS[currentPalette[i]]);
            let distanceA = distance.rgb([r, g, b], BLOCK_COLORS[best]);
            let distanceB = distance.rgb([r, g, b], BLOCK_COLORS[currentPalette[i]]);

            best = distanceA < distanceB? best :currentPalette[i];
        }

        return {
            block: OLD_BLOCK_NAMES[best],
            average: BLOCK_COLORS[best],
            dominant: BLOCK_COLORS[best],
        };
    }

    best = palette[0];

    for (i in palette) {

        if (mode === "LAB") {
            let sourceColor = antiColor.rgb2lab([r, g, b]);
            let colA = antiColor.rgb2lab(best[source]);
            let colB = antiColor.rgb2lab(palette[i][source]);
            let disA = antiColor.deltaE(sourceColor, colA);
            let disB = antiColor.deltaE(sourceColor, colB);
            
            best = disA < disB? best : palette[i];
        } else if (mode === "RGB") {
            let distanceA = colorDistanceRGB([r, g, b], best[source]);
            let distanceB = colorDistanceRGB([r, g, b], palette[i][source]);

            best = distanceA < distanceB? best : palette[i];
        }
    }

    return best;
}

function getBlockFromColor(bot, [r, g, b, alpha], palette='zero-gravity', mode="rgb") {
    if (bot.version === "1.12.2") {
        if (alpha === 0) return "air";

        let best = PALETTES.wool[0];

        for (i in PALETTES.wool) {
            //let distanceA = colorDistanceRGB([r, g, b], BLOCK_COLORS[best]);
            //let distanceB = colorDistanceRGB([r, g, b], BLOCK_COLORS[PALETTES.wool[i]]);
            let distanceA = distance.rgb([r, g, b], BLOCK_COLORS[best]);
            let distanceB = distance.rgb([r, g, b], BLOCK_COLORS[PALETTES.wool[i]]);

            best = distanceA < distanceB? best : PALETTES.wool[i];
        }

        return OLD_BLOCK_NAMES[best];
    }

	if (typeof palette === "string") palette = parsePaletteString(palette);

	let settings = bot.settings;

	if (alpha === 0) return "air";

	let best = palette[0];

	for (i in palette) {

        if (bot.settings.mode === "LAB") {
            let sourceColor = antiColor.rgb2lab([r, g, b]);
            let colA = antiColor.rgb2lab(best[settings.color]);
            let colB = antiColor.rgb2lab(palette[i][settings.color]);
            let disA = antiColor.deltaE(sourceColor, colA);
            let disB = antiColor.deltaE(sourceColor, colB);
            
            best = disA < disB? best : palette[i];
        } else if (bot.settings.mode === "RGB") {
            let distanceA = colorDistanceRGB([r, g, b], best[settings.color]);
            let distanceB = colorDistanceRGB([r, g, b], palette[i][settings.color]);

            best = distanceA < distanceB? best : palette[i];
        }
    }

    return best.block;
}

function getPixelRGB(image, x, y) {
    if (!image) return [255, 0, 255, 255];

    x = Math.floor(image.shape[0]*x);
    y = Math.floor(image.shape[1]*y);

    return [
        image.get(x, y, 0),
        image.get(x, y, 1),
        image.get(x, y, 2),
        image.get(x, y, 3),
    ];
}

function plugin(bot) {
	bot.colors = {};

	bot.colors.palettes = palettes;

	bot.colors.getBlock = (color, palette="zero-gravity", mode="rgb")=>{
		return getBlockFromColor(bot, color, palette, mode);
	};

    bot.colors.getPixelRGB = getPixelRGB;

    bot.colors.getPaletteMatch = (color, palette, mode="LAB", source="average")=>{
        return getPaletteMatch(bot, color, palette, mode, source);
    };
}

module.exports = plugin;