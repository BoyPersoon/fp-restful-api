import {Decimal} from "decimal.js";

export const aOP = {
    MAX: (values: number[]): number => {
        return Number(values.reduce((prev: number, current: number) => {
            return (prev > current) ? prev : current;
        }));
    },
    MIN: (values: number[]): number => {
        return Number(values.reduce((prev: number, current: number) => {
            return (prev < current) ? prev : current;
        }));
    },
    AVG: (values: Decimal[]): number => {
        return Number(values.reduce((prev: Decimal, current: Decimal) => {
            return prev.plus(current);
        }, new Decimal(0)).dividedBy(values.length).toFixed(2));
    },
    SUM: (values: Decimal[]): number => {
        return Number(values.reduce((prev: Decimal, current: Decimal) => {
            return prev.plus(current);
        }, new Decimal(0)).toFixed(2));
    },
    COUNT: (values: Array<(number | string)>): number => {
         return Array.from(new Set(values)).length;
    },
};

export const mOP = {
    "is greater than": (key: number, val: number) => (key > val),
    "is less than": (key: number, val: number) => (key < val),
    "is equal to": (key: number, val: number) => (key === val),
    "is not greater than": (key: number, val: number) => (key <= val),
    "is not less than": (key: number, val: number) => (key >= val),
    "is not equal to": (key: number, val: number) => (key !== val),
};

export const sOP = {
    "is not": (key: string, val: string) => (key !== val),
    "includes": (key: string, val: string) => (key.includes(val)),
    "does not include": (key: string, val: string) => (!key.includes(val)),
    "begins with": (key: string, val: string) => (key.startsWith(val)),
    "does not begin with": (key: string, val: string) => (!key.startsWith(val)),
    "ends with": (key: string, val: string) => (key.endsWith(val)),
    "does not end with": (key: string, val: string) => (!key.endsWith(val)),
    "is": (key: string, val: string) => (key === val),
};
