import {IQueryMap} from "./QueryMapper";
import Store from "../service/Store";
import CriteriaParser, { ICriteria } from "../parser/CriteriaParser";
import {error} from "util";
import {aOP} from "../data/operands";
import { queryKeyToDataKey as courseKeys } from "../data/courseKeys";
import { queryKeyToDataKey as roomKeys } from "../data/roomKeys";
import {Decimal} from "decimal.js";

const store = new Store();

// TODO: remove duplicate declaration IFileData
export interface IFileData {
    count: number;
    data: any[];
}

export default class QueryEngine {
    private data: any[] = [];
    private qm: IQueryMap;
    private dataGroups: any = {};
    private applyKeys: string[] = [];

    constructor(qm: IQueryMap) {
        this.qm = qm;
    }

    public async execQuery(): Promise<IFileData> {
        const { input, criteria, keys, order, groupKeys, apply } = this.qm;

        await this.getFile(input);
        this.filterByCriteria(criteria);
        if (groupKeys.length) {
            this.groupEntries(groupKeys);
            this.transformEntries(apply, groupKeys);
        }
        this.filterByKeys(keys, groupKeys, this.applyKeys);
        this.sortEntries(order, keys);
        this.addKindAndSortEntry(input, keys);

        return {data: this.data, count: this.data.length};
    }

    public transformEntries(apply: any[], gkeys: string[]): void {
        const appliedGroup = Object.keys(this.dataGroups).map((groupKey: any) => {
            const nextObj = {};
            const entries = this.dataGroups[groupKey];

            gkeys.forEach((gkey: string) => {
                // @ts-ignore
                nextObj[gkey] = entries[0][gkey];
            });

            apply.forEach((firstApply: any) => {
                    const cKey = Object.keys(firstApply)[0];
                    this.applyKeys.push(cKey);
                    const applyKey = Object.keys(firstApply[cKey])[0];

                    // @ts-ignore
                    const applyOp: any = aOP[applyKey];
                    const key = firstApply[cKey][applyKey];

                    // if key type is string operand should be count, otherwise key is expected to be number
                    const keyType: string = CriteriaParser.getKeyType(key);

                    if ((keyType === "string" && applyKey === "COUNT") || keyType === "number") {
                        const relVal: any[] = entries.map((entry: any) => {

                            // @ts-ignore
                            return applyKey === "AVG" ? new Decimal(entry[key]) : entry[key];
                        });

                        // @ts-ignore
                        nextObj[cKey] = applyOp(relVal);
                    } else {
                        throw new Error(applyKey + " needs a number key");
                    }
                });

            return nextObj;
        });

        this.data = appliedGroup;
    }

    public groupEntries(gkeys: string[]): void {
        // for each unique value create key with data matching criteria.
        const groupedData: any = {};

        this.data.forEach((entry) => {
            let aggKey: string = "";

            gkeys.forEach((groupKey: string, idx: number) => {
                const entryVal: string = entry[groupKey];
                // TODO: parse entryVal so it does not break in key
                aggKey += !idx ? entryVal : "_" + entryVal;
            });

            if (typeof groupedData[aggKey] === "undefined") {
                groupedData[aggKey] = [entry];
            } else {
                groupedData[aggKey].push(entry);
            }
        });

        this.dataGroups = groupedData;
    }

    public filterByKeys(fkeys: string[], gkeys: string[], akeys: string[]): void {
        fkeys.forEach((fkey) => {
            if (gkeys.length && gkeys.indexOf(fkey) < 0 &&
                gkeys.length && akeys.indexOf(fkey) < 0) {

                throw new Error("All COLUMNS keys need to be either in GROUP or in APPLY");
            }
        });

        this.data = this.data.map((entry) => {
            for (const key of Object.keys(entry)) {
                if (fkeys.indexOf(key) < 0) {
                    delete entry[key];
                }
            }

            return entry;
        });
    }

    public sortEntries(order: {direction: string, keys: string[]}, displayKeys: string[]): void {
        const ascending: boolean = (order.direction === "ascending");

        order.keys.forEach((ok) => {
            if (displayKeys.indexOf(ok) < 0) {
                throw Error("Order key: " + ok + ", needs to be included in columns");
            }
        });

        this.data = this.data.sort((entryA, entryB): number => {
            const orderKeys: string[] = order.keys;

            const orderByKey = (okeys: string[]): any => {
                const orderKey = okeys.length ? okeys[0] : "";

                if (typeof orderKey !== "undefined" && orderKey.length) {
                    // compare at this lvl and if tie move to next
                    if (entryA[orderKey] < entryB[orderKey]) {
                        return ascending ? -1 : 1;
                    }
                    if (entryA[orderKey] > entryB[orderKey]) {
                        return ascending ? 1 : -1;
                    }

                    // tie move to next key
                    return orderByKey(okeys.slice(1));
                } else {
                    return 0;
                }
            };

            return orderByKey(orderKeys);
        });
    }

    private async getFile(kind: string): Promise<void> {
        const fileContent: IFileData = await store.getFileData(kind);
        this.data = fileContent.data;
    }

    private filterByCriteria(criteriaList: ICriteria[]): void {
        if (CriteriaParser.validateTypes(criteriaList)) {
            this.data = this.data.filter((entry) => {
                let glue: string = "";
                return criteriaList.reduce((acc, criteria) => {
                    const passed = CriteriaParser.execCriteria(criteria, entry);

                    switch (glue) {
                        case "and":
                            glue = criteria.glue;
                            return acc && passed;
                        case "or":
                            glue = criteria.glue;
                            return acc || passed;
                        case "":
                            glue = criteria.glue;
                            return passed;
                        default:
                            throw error("invalid operand");
                    }
                }, true);
            });
        }
    }

    private addKindAndSortEntry(kind: string, orderRefKeys: string[]): void {
        this.data = this.data.map((entry) => {
            const nextObj = {};
            const sortedKeys = Object.keys(entry).sort((keyA: string, keyB: string) => {
                const positioninRefA: number = orderRefKeys.findIndex((key) => (key === keyA));
                const positioninRefB: number = orderRefKeys.findIndex((key) => (key === keyB));

                if (positioninRefA < positioninRefB) {
                    return -1;
                }
                if (positioninRefA > positioninRefB) {
                    return 1;
                }
                return 0;
            });

            sortedKeys.forEach((key) => {
                // @ts-ignore
                const isCourseKey = Object.values(courseKeys).indexOf(key);
                const isRoomKey = Object.values(roomKeys).indexOf(key);

                if (isCourseKey >= 0 || isRoomKey >= 0) {
                    // @ts-ignore
                    nextObj["" + kind + "_" + key + ""] = entry[key];
                } else {
                    // @ts-ignore
                    nextObj[key] = entry[key];
                }
            });

            return nextObj;
        });
    }
}
