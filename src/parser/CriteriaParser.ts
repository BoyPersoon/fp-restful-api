import {IQueryMap} from "../controller/QueryMapper";
import {mKeyMap as mCourseKeyMap, sKeyMap as sCourseKeyMap} from "../data/courseKeys";
import {mKeyMap as mRoomsKeyMap, sKeyMap as sRoomsKeyMap} from "../data/roomKeys";
import {mOP, sOP} from "../data/operands";

export interface ICriteria {
    key: string;
    op: string;
    val: (string | number);
    glue: string;
}

export default class CriteriaParser {

    public static validateTypes(criteriaList: ICriteria[]): boolean {
        return criteriaList.reduce((acc: boolean, criteria: ICriteria) => {
            return acc && CriteriaParser.checkValidateType(criteria);
        }, true);
    }

    public static execCriteria(crit: ICriteria, entry: any): boolean {
        // @ts-ignore
        const filterFn = typeof crit.val === "string" ? sOP[crit.op] : mOP[crit.op];

        const reversedKey = crit.key;
        const entryVal = entry[reversedKey];
        const critVal = crit.val;

        if (filterFn(entryVal, critVal)) {
            // console.log("==============");
            // console.log(entryVal, critVal);
            return true;
        }

        return false; // e.g. if (entryVal) is greater than 95 (criteriaVal)
    }

    public static parseCriteria(criteria: string, glue: string, keyMap: any): ICriteria {
        const orifier = CriteriaParser.orifier;
        const validQKeys = Object.keys(keyMap);

        const patMCriteria = new RegExp(`(${orifier(validQKeys)})\\s(${orifier(Object.keys(mOP))})\\s(.*)`);
        const patSCriteria = new RegExp(`(${orifier(validQKeys)})\\s(${orifier(Object.keys(sOP))})\\s(.*)`);
        const parsedMCriteria = patMCriteria.exec(criteria);
        const parsedSCriteria = patSCriteria.exec(criteria);
        let parsedCriteria: string[];

        if (parsedMCriteria) {
            parsedCriteria = parsedMCriteria;
        } else if (parsedSCriteria) {
            parsedCriteria = parsedSCriteria;
        } else {
            throw Error("could not parse criteria " + criteria);
        }

        let critVal: (string | number) = parsedCriteria[3];

        if (!isNaN(Number(critVal))) {
            critVal = parseFloat(critVal);
        } else {
            CriteriaParser.checkValidString(critVal);
            critVal = critVal.replace(/\"/g, "");
        }

        return {
            // @ts-ignore
            key: keyMap[parsedCriteria[1]],
            op:  parsedCriteria[2],
            val: critVal,
            glue,
        };
    }

    public static getKeyType(critKey: string): string {
        // @ts-ignore
        if (Object.values(mCourseKeyMap).includes(critKey) ||
            Object.values(mRoomsKeyMap).includes(critKey)) {
            return "number";
            // @ts-ignore
        } else if (Object.values(sCourseKeyMap).includes(critKey) ||
            Object.values(sRoomsKeyMap).includes(critKey)) {
            return "string";
        }
    }

    private static checkValidateType(criteria: ICriteria): boolean {
        const checkingType = CriteriaParser.getOpType(criteria.op);

        if (CriteriaParser.getValType(criteria.val) === checkingType) {
            if (CriteriaParser.getKeyType(criteria.key) === checkingType) {
                return true;
            } else {
                if (checkingType === "number") {
                    throw new Error(criteria.op + " requires a number key");
                } else {
                    throw new Error(criteria.op + " requires a string key");
                }
            }
        } else {
            throw new Error("");
        }
    }

    private static checkValidString(str: string): void {
        // any string without * or " in it, enclosed by double quotation marks

        if (!str.match(new RegExp(/^"[^"\*]*"$/))) {
            throw new Error("the string value is invalid");
        }
    }

    private static getValType(critVal: (string | number)): string {
        return typeof critVal;
    }

    private static getOpType(critOp: string): string {
        if (Object.keys(mOP).includes(critOp)) {
            return "number";
        } else if (Object.keys(sOP).includes(critOp)) {
            return "string";
        }
    }

    private static orifier(list: string[]): string {
        return list.reduce((reg, el, idx) => {
            return reg += (idx === 0 ? el.trim() : "|" + el.trim());
        }, "");
    }
}
