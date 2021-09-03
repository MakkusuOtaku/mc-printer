function rgb2hsv(r,g,b) { //Borrowed from Stackoverflow. Not sure if this works.
    r /= 255;
    g /= 255;
    b /= 255;

    let v=Math.max(r,g,b), c=v-Math.min(r,g,b);
    let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
    return [60*(h<0?h+6:h), v&&c/v, v];
}

exports.rgb = (r1, g1, b1, r2, g2, b2)=>{
    return Math.hypot(r1-r2, g1-g2, b1-b2);
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