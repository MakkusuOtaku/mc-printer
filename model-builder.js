const fs = require('fs');
const vec3 = require('vec3');
const getPixels = require('get-pixels');

function distanceBetweenPoints(a, b) {
	return Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
}

function lerp(a, b, t) {
	return (1.0-t)*a + t*b;
}

function lerp2D([x1, y1], [x2, y2], t) {
	return [
		lerp(x1, x2, t),
		lerp(y1, y2, t),
	];
}

function lerp3D(a, b, t) {
	return {
		x: lerp(a.x, b.x, t),
		y: lerp(a.y, b.y, t),
		z: lerp(a.z, b.z, t),
	};
}

async function loadImage(path) {
    return new Promise(resolve=>{
        getPixels(path, (err, image)=>{
            resolve(image);
        });
    });
}

function getTextureColor(texture, uv) {
	let x = Math.floor(uv[0]*texture.shape[0]);
	let y = Math.floor((1-uv[1])*texture.shape[1]);

	let r, g, b, alpha;

	r = texture.get(x, y, 0);
	g = texture.get(x, y, 1);
	b = texture.get(x, y, 2);
	alpha = texture.get(x, y, 2);

	return [r, g, b, alpha];
}

function getBlockFromUV(bot, texture, uv) {
	let color = getTextureColor(texture, uv);
	let block = bot.colors.getBlock(color);
	return block;
}

async function readModelFile(path) {
	let modelData = fs.readFileSync(path, 'utf8');
	let model = parseModelData(modelData);

	return model;
}

function parseModelData(data) {
	const vertices = [];
	const vts = [];
	const faces = [];
	const uvs = [];

	let size = 1; // hi.

	data = data.split('\n').map((line)=>{
		return line.split(' ');
	});

	for (line of data) {

		if (line[0] === 'v') {
			vertices.push({
				x: parseFloat(line[1]),
				y: parseFloat(line[2]),
				z: parseFloat(line[3]),
			});
			continue;
		}

		if (line[0] === 'vt') {
			vts.push([
				parseFloat(line[1]),
				parseFloat(line[2]),
			]);
			continue;
		}

		if (line[0] === 'f') {
			let face = [];
			let uv = [];

			for (let i = 1; i < line.length; i++) {
				let faceData = line[i].split('/');

				face.push(parseInt(faceData[0])-1);

				if (faceData.length > 1) uv.push(parseInt(faceData[1])-1);
				else uv.push(0);
			}

			faces.push(face);
			uvs.push(uv);
			continue;
		}
	}

	return {
		size,
		vertices,
		faces,
		uvs,
		vts,
	};
}

let blocksPlaced = 0;

async function setBlock(bot, position, blockType) {
	if (blockType === "air" || blockType === "cave_air") return;

	await bot.chat(`/setblock ${position.x} ${position.y} ${position.z} ${blockType}`);

	if (blocksPlaced % bot.settings.chunkSize === 0) await bot.waitForTicks(1);
	blocksPlaced++;
}

// I don't currently use this function but I'm very tempted.
async function coolSetBlock(bot, position, blockType) {
	await bot.chat(`/setblock ${position.x} ${position.y} ${position.z} red_concrete`);
	await bot.waitForTicks(2);
	await bot.chat(`/setblock ${position.x} ${position.y} ${position.z} ${blockType}`);
}

async function buildLine(bot, pointA, pointB, texture, [uvA, uvB]) {
	let distance = distanceBetweenPoints(pointA, pointB);

	for (let i = 0; i < distance; i++) {
		let point = lerp3D(pointA, pointB, i/distance);
		let pointUV = lerp2D(uvA, uvB, i/distance);

		let block = getBlockFromUV(bot, texture, pointUV);

		point.x = Math.floor(point.x);
		point.y = Math.floor(point.y);
		point.z = Math.floor(point.z);

		await setBlock(bot, point, block);
	}
}

async function buildTriangle(bot, pointA, pointB, pointC, texture, [uvA, uvB, uvC]) {
	let distance = distanceBetweenPoints(pointA, pointB);

	for (let i = 0; i < distance; i++) {

		let pointAB = lerp3D(pointA, pointB, i/distance);
		let uvAB = lerp2D(uvA, uvB, i/distance);

		await buildLine(bot, pointAB, pointC, texture, [uvAB, uvC]);
	}
}

async function buildQuad(bot, pointA, pointB, pointC, pointD, texture, uv) {
	await buildTriangle(bot, pointA, pointB, pointC, texture, [uv[0], uv[1], uv[2]]);
	await buildTriangle(bot, pointC, pointD, pointA, texture, [uv[2], uv[3], uv[0]]);
}

async function buildModel(bot, {path, textureLocation, position, size}, buildType) {
	bot.chat(`Preparing model of ${path}. (${size})`);

	let model = await readModelFile(path);
	let texture = await loadImage(textureLocation);

	let scale = (1 / model.size) * size;

	bot.chat(`Building model of ${path}. (${size})`);

	if (buildType === "points") {
		for (vertex of model.vertices) {
			let pos = position.offset(vertex.x*scale, vertex.y*scale, vertex.z*scale).floor();

			await bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} light_blue_concrete`);
			await bot.waitForTicks(1);
		}

		return;
	}

	for (index in model.faces) {
		let face = model.faces[index];
		let uvs = model.uvs[index];

		face = face.map((vertexIndex)=>{
			let vertex = model.vertices[vertexIndex];
			let point = position.offset(vertex.x*scale, vertex.y*scale, vertex.z*scale);
			return point;
		});

		uvs = uvs.map((vtIndex)=>{
			return model.vts[vtIndex] || [0, 0];
		});

		if (face.length === 3) {
			await buildTriangle(bot, face[0], face[1], face[2], texture, uvs);
		}

		if (face.length === 4) {
			await buildQuad(bot, face[0], face[1], face[2], face[3], texture, uvs);
		}

		for (let k = 0; k < face.length-1; k++) {
			await buildLine(bot, face[k], face[k+1], texture, [uvs[k], uvs[k+1]]);
		}
	}
}

exports.buildModel = buildModel;
exports.parseModelData = parseModelData;