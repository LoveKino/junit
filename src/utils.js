"use strict";

import Promise from "yaku";

function stringify (val) {
    if (typeof val === "undefined") {
        return "undefined";
    } else {
        return JSON.stringify(val, 0, 4);
    }
}

let report = (formatAssertErr, actual, expected) => {
    let { stack } = new Error("Assertion");
    /* istanbul ignore next */
    if (typeof __filename !== "undefined")
        stack = stack.replace(
            new RegExp(`.+${__filename}.+\\n`, "g"), ""
        );

    return Promise.reject(
        formatAssertErr(stringify(actual), stringify(expected), stack)
    );
};

let isArray = (json) => json && typeof json === "object" &&
    typeof json.length === "number";

let getNames = (json) => {
    let names = [];
    if (json && typeof json === "object") {
        for (var name in json) {
            names.push(name);
        }
    }
    return names;
};

let isPureObj = (json) => json && typeof json === "object" && !isArray(json);

let getLen = (json) => isArray(json) ? json.length : getNames(json).length;

let nextPath = (path, next) => path === "" ? next : path + "." + next;

let joinRes = (res, json1, json2, path) => res ?
    { pass: true } : { pass: false, path, json1, json2 };

// used as a unique object for exception
let $maxDepth = {};

let eq = (json1, json2, depthCountdown, path = "") => {
    if (depthCountdown === 0) {
        return $maxDepth;
    }
    let isBothArr = isArray(json1) && isArray(json2);
    let isBothObj = isPureObj(json1) && isPureObj(json2);

    let json = getLen(json1) > getLen(json2) ? json1 : json2;
    if (isBothArr) {
        for (let i = 0; i < json.length; i++) {
            let eqRes = eq(json1[i], json2[i],
                depthCountdown - 1, nextPath(path, i));
            if ($maxDepth === eqRes)
                return $maxDepth;
            if (!eqRes.pass)
                return eqRes;
        }
    } else if (isBothObj) {
        for (let name in json) {
            let eqRes = eq(json1[name], json2[name],
                depthCountdown - 1, nextPath(path, name));
            if ($maxDepth === eqRes)
                return $maxDepth;
            if (!eqRes.pass)
                return eqRes;
        }
    } else if (json1 !== json2) {
        return joinRes(false, json1, json2, path);
    }

    return joinRes(true);
};

export default {
    extend: (obj, src) => {
        for (var key in src) {
            obj[key] = src[key];
        }
        return obj;
    },

    eq: (formatAssertErr) => (actual, expected, depthCountdown = 7) => {
        let eqRes = eq(actual, expected, depthCountdown);
        if (eqRes === $maxDepth) {
            let errText = "exceed max Recursive depth :" + depthCountdown;
            return report(formatAssertErr, errText, errText);
        }
        if (eqRes.pass)
            return Promise.resolve();

        return report(formatAssertErr, actual, expected);
    }
};