import CriteriaParser, {ICriteria} from "../parser/CriteriaParser";
import {queryKeyToDataKey as courseQueryKeyToDataKey} from "../data/courseKeys";
import {queryKeyToDataKey as roomsQueryKeyToDataKey} from "../data/roomKeys";
import {mOP, sOP} from "../data/operands";
import {allKeys, keyPat, multipleKeysPat, multipleCKeysPat, inputPat} from "../data/patterns";

export interface IApply {
    MIN?: number;
    MAX?: number;
    AVG?: number;
    SUM?: number;
    COUNT?: (number|string);
}

export interface IQueryMap {
    kind: string;
    input: string;
    criteria: ICriteria[];
    keys: string[];
    order: {direction: string, keys: string[]};
    groupKeys?: string[];
    apply?: any[];
    allowedKeys?: string[];
    customKeys?: string[];
}

export default class QueryMapper {
    private queryMap: IQueryMap = {
        kind: "",
        input: "",
        criteria: [],
        keys: [],
        order: {direction: "", keys: []},
        groupKeys: [],
        apply: [],
    };

    private keyMap = {};

    constructor (query: string) {
        query = this.extractDataset(query);
        query = this.extractGroup(query);
        query = this.extractFilter(query);
        query = this.extractDisplay(query);
        query = this.extractWhere(query);
        this.extractOrder(query);

        this.allDKeysAreInGroupOrWhere();
    }

    public getParams(): IQueryMap {
        return this.queryMap;
    }

    private noDuplicateCKeys() {
        const customKeys = this.queryMap.customKeys || [];
        if (new Set(customKeys).size !== customKeys.length) {
             throw new Error("Duplicate apply key");
        }
    }

    private allDKeysAreInGroupOrWhere() {
        const dkeys = this.queryMap.keys;
        const allowedKeys = this.queryMap.allowedKeys || [];

        if (allowedKeys.length) {
            dkeys.forEach((dkey: string) => {
                if (allowedKeys.indexOf(dkey) < 0) {
                    throw new Error("All COLUMNS keys need to be either in GROUP or in APPLY");
                }
            });
        }
    }

    private extractWhere(query: string): string {
        const AggPat = `([a-z-A-Z]+) is the (MAX|MIN|AVG|SUM|COUNT) of (${keyPat})`;
        const multiAggPat = `(${AggPat})(((, | and )(${AggPat}))* and (${AggPat}))?`;
        const whereRegex = new RegExp(`where ${multiAggPat}(\\.|;)`);
        const parsedWhere = whereRegex.exec(query);

        if (parsedWhere) {
            const whereStatement = parsedWhere[0];
            const keysString = whereStatement.replace(/(^where | and |, |,)/g, "|")
                .replace(".", "").trim();
            const ApplyEls = keysString.split("|") || [];

            if (ApplyEls.length) {
                this.queryMap.apply = ApplyEls
                    .filter((el: string) => (el.length))
                    .map((apply) => {
                        const applyParams = new RegExp(AggPat).exec(apply);
                        const cKey = applyParams[1];
                        const aggOP = applyParams[2];
                        const key = applyParams[3];

                        if (cKey.match("/(_|\\s)/")) {
                            throw new Error("Apply keys cannot contain '_' nor spaces");
                        }
                        this.queryMap.allowedKeys.push(cKey);
                        this.queryMap.customKeys.push(cKey);

                        return {
                            [cKey]: {
                                // @ts-ignore
                                [aggOP]: allKeys[key],
                            },
                        };
                    });

                this.noDuplicateCKeys();
            }
            return query.replace(whereStatement, "").trim();
        }

        return query;
    }

    private extractGroup(query: string): string {
        const groupRegex = new RegExp(`grouped by ${multipleKeysPat},`);
        const parsedGroup = groupRegex.exec(query);

        if (parsedGroup) {
            const groupStatement = parsedGroup[0];
            const keysString = groupStatement.replace(/(grouped by | and |, |,)/g, "|")
                .replace(".", "").trim();
            const groupKeys = keysString.split("|") || [];

            if (groupKeys.length) {
                this.queryMap.groupKeys = [...groupKeys
                    .filter((gkey: string) => (gkey.length))
                    // @ts-ignore
                    .map((gkey: string) => (allKeys[gkey] ? allKeys[gkey] : gkey ))];

                this.queryMap.allowedKeys = this.queryMap.groupKeys;
                this.queryMap.customKeys = [];
            } else {
                // @ts-ignore
                throw new Error("missing valid group key(s)");
            }

            return query.replace(groupStatement, "").trim();
        }

        return query;
    }

    private extractDataset(query: string): string {
        const datasetRegex = /In (.*?) dataset (.*?)(,|\s)/g;
        const datasetParams = datasetRegex.exec(query);

        if (datasetParams) {
            const kind = datasetParams[1];
            const input = datasetParams[2];

            this.validateKind(kind);
            this.setKeyMap(kind);
            this.queryMap.kind = datasetParams[1];

            this.validateInput(input);
            this.queryMap.input = input;
        } else {
            throw Error("syntax error in dataset");
        }

        return query.replace(datasetParams[0], "").trim();
    }

    private extractFilter(query: string): string {
        const filterAllRegex = /find all entries/;

        if (query.match(filterAllRegex)) {
            return query.replace("find all entries;", "");
        } else {
            const criteriaRegex = /find entries whose (.*?);/;
            const filterStatement = criteriaRegex.exec(query)[0];
            const validQKeys = Object.keys(this.keyMap);

            // TODO: fix the wrong key with wrong operand error
            const patMCriteria = `(${this.orifier(validQKeys)})\\s(${this.orifier(Object.keys(mOP))})\\s(.*?)`;
            const patSCriteria = `(${this.orifier(validQKeys)})\\s(${this.orifier(Object.keys(sOP))})\\s(.*?)`;
            const patCriteria  = new RegExp(`(${patMCriteria}|${patSCriteria})(\\sand|\\sor|;)`, "g");
            const criteria = filterStatement.match(patCriteria);

            // operands should be fetched outside of strings
            const filterWithoutStr = filterStatement.replace(/".*?"/g, "");
            const operands = filterWithoutStr.match(/\s(and\s|or\s|and|or)/g) || [];

            if (criteria) {
                if ((criteria.length - operands.length) !== 1) {
                    // To many operands
                    throw Error("Missing statement after OR/AND");
                }

                this.queryMap.criteria = criteria.map((c: string, idx: number) => {
                    const nextC = c.trim().replace(/(\sand$|\sor$|;$)/g, "");

                    let glue: string = "";
                    if (operands) {
                        glue = operands[idx] || "";
                    }

                    return CriteriaParser.parseCriteria(nextC, glue.trim(), this.keyMap);
                });

                return query.replace(criteriaRegex, "").trim();
            } else {
                throw Error("syntax error in filter");
            }
        }
    }

    private extractDisplay(query: string): string {
        const displayRegex = new RegExp(`show ${multipleCKeysPat}(;|\.|,)`);
        const parsedDisplay = displayRegex.exec(query);

        if (parsedDisplay) {
            const displayStatement = parsedDisplay[0];
            const keysString = displayStatement.replace(/(show | and |, |,|;)/g, "|")
                .replace(".", "").trim();
            const displayKeys = keysString.split("|") || [];

            this.queryMap.keys = displayKeys
                .filter((dkey: string) => (dkey.length))
                .map((key) => {
                    const cKey = key.trim();
                    // @ts-ignore
                    const transKey: string = this.keyMap[cKey];
                    if (typeof transKey !== "undefined" && transKey.length) {
                        return transKey;
                    } else {
                        // is custom key
                        this.validateInput(cKey); // throws invalid input
                        return cKey;
                    }
                });

            return query.replace(displayStatement, "").trim();
        } else {
            throw ({message: "syntax error in display"});
        }
    }

    private extractOrder(query: string): string {
        if (typeof query === "undefined" || !query.length) {
            return "";
        } else {

            const orderRegex = new RegExp(`sort in (ascending|descending) order by ${multipleCKeysPat}\\.`);
            const parsedOrder = orderRegex.exec(query);

            if (parsedOrder) {
                const orderStatement = parsedOrder[0];
                const replacePat = /(^sort in (ascending|descending) order by | and |, |,)/g;
                const keysString = orderStatement.replace(replacePat, "|")
                    .replace(".", "").trim();
                const sortKeys = keysString.split("|") || [];

                this.queryMap.order = {
                    direction: parsedOrder[1],
                    keys: sortKeys
                        .filter((okey: string) => (okey.length))
                        .map((skey) => {
                            // @ts-ignore
                            return this.keyMap[skey.trim()] || skey.trim();
                    }),
                };

                return query.replace(orderStatement, "");
            } else {
                throw new Error("syntax error in order");
            }
        }
    }

    private orifier(list: string[]): string {
        return list.reduce((reg, el, idx) => {
            return reg += (idx === 0 ? el.trim() : "|" + el.trim());
        }, "");
    }

    private validateInput(input: string): void {
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

        const wholeIlligalWords = illigalWords.map((word) => ("^" + word + "$"));
        const invalidPat = new RegExp(`(\\s|_|${this.orifier(wholeIlligalWords)})`);
        const invalid = invalidPat.exec(input);

        if (invalid) {
            throw ({message: "Invalid input string"});
        }
    }

    private validateKind(kind: string): void {
        if (kind.trim() !== "courses" && kind.trim() !== "rooms") {
            throw Error("Invalid category");
        }
    }

    private setKeyMap(kind: string) {
        if (kind.trim() === "courses") {
            this.keyMap = courseQueryKeyToDataKey;
        }

        if (kind.trim() === "rooms") {
            this.keyMap = roomsQueryKeyToDataKey;
        }
    }
}
