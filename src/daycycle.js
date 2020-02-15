let Color = require('color');

function timeMark(hour, min) { // 24 hour time converted to a number between 0 and 1, 1 being 11:59 pm
    return hour/24+min/24/60
}

class Background {
    constructor(at, bottom, top) {
        this.time = at;
        this.bottom = bottom;
        this.top = top;
    }
}

const backgrounds = [];

backgrounds.push(new Background(timeMark(00, 00), Color("#131420"), Color("#0F131B"))); // midnight
backgrounds.push(new Background(timeMark(06, 30), Color("#D89EBC"), Color("#DEAE87"))); // morning
backgrounds.push(new Background(timeMark(12, 00), Color("#D8BD9E"), Color("#87B0DE"))); // noon
backgrounds.push(new Background(timeMark(15, 00), Color("#AC7989"), Color("#FF9292"))); // afternoon
backgrounds.push(new Background(timeMark(19, 00), Color("#595D87"), Color("#EFBCE8"))); // evening
backgrounds.push(new Background(timeMark(22, 00), Color("#0A0B17"), Color("#35253E"))); // night

function findNearestBefore(time) {
    for (let i=0;i<backgrounds.length;i++) {
        let bg = backgrounds[i];
        if (time < bg.time) {
            return backgrounds[i-1];
        }
    }
}

function findNearestAfter(time) {
    for (let i=0;i<backgrounds.length;i++) {
        let bg = backgrounds[i];
        if (time < bg.time) {
            return backgrounds[i];
        }
    }
}

function _mod(a, b) { // modulo operator but with slightly modified behaviour for negative numbers
    if (a>=0) {
        return a%b;
    }
    return b-(-a % b)
} 

function lerp(v0, v1, t) {
    return v0*(1-t)+v1*t
}

function hueInterpol(start, end, t) { // linear interpolate forward between start and end, assuming ability to wrap from 360 back to 0
    if (end < start) {
        return hueInterpol(end, start, t);
    }

    if (end-start < 360-end+start) {
        return start+(end-start)*t
    } else {
        return start-(360-end+start)*t
    }
}

function reverseTimeInterp(start, end, time) {
    if (start > end) {
        return _mod(time-start, 1)/(1-start+end)
    } else {
        return (time-start)/(end-start)
    }
}

function hsvInterp(start, end, t) {
    return new Color({
        h: hueInterpol(start.hue(), end.hue(), t),
        s: lerp(start.saturationv(), end.saturationv(), t),
        v: lerp(start.value(), end.value(), t)
    });
}

function getGradient(time) {
    let previous = findNearestBefore(time);
    let next = findNearestAfter(time);
    let t = reverseTimeInterp(previous.time, next.time, time);
    
    let bottom = hsvInterp(previous.bottom, next.bottom, t);
    let top = hsvInterp(previous.top, next.top, t);
    return `background: linear-gradient(0deg, ${bottom.string()} 0%, ${top.string()} 100%);`
}