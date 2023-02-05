const fs = require('fs');

const antiColor = require('./antimatter-color.js');
const colourDistances = require('./colour-distances.js');
const palettes = JSON.parse(fs.readFileSync('palettes.json', 'utf8'));

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

function getBlockFromColor(bot, [r, g, b, alpha], palette='zero-gravity', mode="rgb") {
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

function plugin(bot) {
	bot.colors = {};

	bot.colors.palettes = palettes;

	bot.colors.getBlock = (color, palette="zero-gravity", mode="rgb")=>{
		return getBlockFromColor(bot, color, palette, mode);
	}
}

module.exports = plugin;