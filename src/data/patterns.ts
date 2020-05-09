import {mOP, sOP} from "./operands";
import {queryKeyToDataKey as courseQueryKeyToDataKey} from "./courseKeys";
import {queryKeyToDataKey as roomsQueryKeyToDataKey} from "./roomKeys";

const illigalWords = [
    ...Object.keys(mOP),
    ...Object.keys(sOP),
    "In",
    "dataset",
    "find",
    "all",
    "show",
    "and",
    "or",
    "sort",
    "by",
    "entries",
    "is",
    "the",
    "of",
    "whose",
];

const orifier = (list: string[]): string => {
    return list.reduce((reg, el, idx) => {
        return reg += (idx === 0 ? el.trim() : "|" + el.trim());
    }, "");
};

const wholeIlligalWords = illigalWords.map((word) => ("^" + word + "$"));

export const allKeys = {...courseQueryKeyToDataKey, ...roomsQueryKeyToDataKey };

export const inputPat = new RegExp(`(?!_|${orifier(wholeIlligalWords)})([a-z-A-Z]+)`);
export const keyPat = `${orifier(Object.keys(allKeys))}`.replace("\\(\\)", "");
export const cKeyPat = `(${keyPat})|([a-z-A-Z-0-9]+)`;

export const multipleKeysPat = `(${keyPat})(((, | and )(${keyPat}))* and (${keyPat}))?`;
export const multipleCKeysPat = `(${cKeyPat})(((, | and )(${cKeyPat}))* and (${cKeyPat}))?`;
