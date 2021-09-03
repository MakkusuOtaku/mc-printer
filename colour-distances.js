exports.rgb = (r1, g1, b1, r2, g2, b2)=>{
    return Math.hypot(r1-r2, g1-g2, b1-b2);
}

/*
    This stuff doesn't work very well.
    RGB is good enough IMO.
    Fix it if you'd like.
*/

function rgb2hsv(r,g,b) {
    return [0, 0, 0];
}

exports.hsv = (r1, g1, b1, r2, g2, b2)=>{
    let hsv1 = rgb2hsv(r1, g1, b1);
    let hsv2 = rgb2hsv(r2, g2, b2);

    return Math.hypot(
        hsv1[0]-hsv2[0],
        hsv1[1]-hsv2[1],
        hsv1[2]-hsv2[2]
    );
}