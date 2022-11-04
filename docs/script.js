let imageSize = 32;

const uploader = document.querySelector("input[type=\"file\"]");

uploader.addEventListener('change', (event)=>{
    if (!uploader.files || !uploader.files[0]) return;

    image.addEventListener('load', ()=>{
        URL.revokeObjectURL(image.src);
    });

    image.src = URL.createObjectURL(uploader.files[0]);
});

const commandNameElements = document.querySelectorAll('.command-example>span');

let hueStep = 360/commandNameElements.length;

for (let index = 0; index < commandNameElements.length; index++) {
    let name = commandNameElements[index];
    console.log(name);
    name.style.color = `hsl(${index*hueStep}, 98%, 50%)`;
}

const canvas = document.querySelector('canvas');
canvas.width = imageSize;//canvas.clientWidth;
canvas.height = imageSize;//canvas.clientHeight;
const context = canvas.getContext('2d');

context.imageSmoothingEnabled = false;

context.fillStyle = 'cornflowerblue';
context.fillRect(0, 0, canvas.width, canvas.height);

const sizeSlider = document.querySelector("#resolution");

sizeSlider.addEventListener("input", ()=>{
    imageSize = Math.pow(2, sizeSlider.value);

    canvas.width = imageSize;
    canvas.height = imageSize;

    drawImage();
});

async function loadColors() {
    let response = await fetch('colors.json');
    let json = await response.json();

    window.blockColors = json;
    image.src = "fatty.png";
};

loadColors();

const image = new Image();

function drawImage() {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    let i = 0;

    for (let x = 0; x < imageData.width; x++) {
        for (let y = 0; y < imageData.height; y++) {

            let r = data[i+0];
            let g = data[i+1];
            let b = data[i+2];

            let color = findBlock([r, g, b]).average;

            imageData.data[i+0] = color[0];
            imageData.data[i+1] = color[1];
            imageData.data[i+2] = color[2];

            i += 4;
        }
    }

    context.putImageData(imageData, 0, 0);
}

image.addEventListener("load", drawImage);

function rgbDistance([r1, g1, b1], [r2, g2, b2]) {
     return Math.hypot(r1-r2, g1-g2, b1-b2);
}

function findBlock(color) {
    let blockColors = window.blockColors;

    let best = blockColors[0];
    let bestScore = Infinity;//rgbDistance(best.average, color);

    for (let block of blockColors) {
        let newScore = rgbDistance(block.average, color);

        if (newScore > bestScore) continue;

        best = block;
        bestScore = newScore;
    }

    return best;
}