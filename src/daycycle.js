import Color from "color";

function timeMark(hour, min) {
    // 24 hour time converted to a number between 0 and 1, 1 being 11:59 pm
    return hour / 24 + min / 24 / 60;
}

class Theme {
    constructor(at, bottom, top, textColor) {
        this.time = at;
        this.bottom = bottom;
        this.top = top;
        this.textColor = textColor;
    }
}

const themes = [];

themes.push(
    new Theme(
        timeMark(0, 0),
        Color("#131420"),
        Color("#0F131B"),
        Color("#688C85")
    )
); // midnight
themes.push(
    new Theme(
        timeMark(6, 30),
        Color("#D89EBC"),
        Color("#DEAE87"),
        Color("#FFE8E8")
    )
); // morning
themes.push(
    new Theme(
        timeMark(12, 0),
        Color("#D8BD9E"),
        Color("#87B0DE"),
        Color("#FFFBEB")
    )
); // noon
themes.push(
    new Theme(
        timeMark(15, 0),
        Color("#AC7989"),
        Color("#FF9292"),
        Color("#FFDFD4")
    )
); // afternoon
themes.push(
    new Theme(
        timeMark(19, 0),
        Color("#595D87"),
        Color("#EFBCE8"),
        Color("#DAEFFA")
    )
); // evening
themes.push(
    new Theme(
        timeMark(22, 0),
        Color("#0A0B17"),
        Color("#35253E"),
        Color("#5C566F")
    )
); // night

function findNearestBefore(time) {
    for (let i = 0; i < themes.length; i++) {
        let bg = themes[i];
        if (time < bg.time) {
            return themes[i - 1];
        }
    }
    return themes[themes.length - 1];
}

function findNearestAfter(time) {
    for (let i = 0; i < themes.length; i++) {
        let bg = themes[i];
        if (time < bg.time) {
            return themes[i];
        }
    }
    return themes[0];
}

function _mod(a, b) {
    // modulo operator but with slightly modified behaviour for negative numbers
    if (a >= 0) {
        return a % b;
    }
    return b - (-a % b);
}

function lerp(v0, v1, t) {
    return v0 * (1 - t) + v1 * t;
}

function hueInterpol(start, end, t) {
    // linear interpolate forward between start and end, assuming ability to wrap from 360 back to 0

    if (end < start) {
        return hueInterpol(end, start, 1-t);
    }

    if (end - start < 360 - end + start) {
        return start + (end - start) * t;
    } else {
        return start - (360 - end + start) * t;
    }
}

function reverseTimeInterp(start, end, time) {
    if (start > end) {
        return _mod(time - start, 1) / (1 - start + end);
    } else {
        return (time - start) / (end - start);
    }
}

function hsvInterp(start, end, t) {
    return new Color({
        h: hueInterpol(start.hue(), end.hue(), t),
        s: lerp(start.saturationv(), end.saturationv(), t),
        v: lerp(start.value(), end.value(), t)
    });
}

export default function getTheme(time) {
    let previous = findNearestBefore(time);
    let next = findNearestAfter(time);
    let t = reverseTimeInterp(previous.time, next.time, time);
    let bottom = hsvInterp(previous.bottom, next.bottom, t);
    let top = hsvInterp(previous.top, next.top, t);
    return {
        bgGradient: `linear-gradient(0deg, ${bottom.string()} 0%, ${top.string()} 100%)`,
        textColor: hsvInterp(previous.textColor, next.textColor, t).string()
    };
}
