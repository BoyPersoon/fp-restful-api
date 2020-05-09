import Log from "../Util";
import {IInsightFacade, InsightResponse, InsightDatasetKind, InsightDataset} from "./IInsightFacade";

import Store from "../service/Store";
import QueryMapper, {IQueryMap} from "./QueryMapper";
import QueryEngine from "./QueryEngine";
import CourseParser from "../parser/CourseParser";
import RoomParser from "../parser/RoomParser";
import ZipLoader from "../service/ZipLoader";

const store = new Store();

export interface IDataSet {
    id: string;
    count: number;
    data: any[];
}

export interface IFileData {
    count: number;
    data: any[];
}

/**
 * This is the main programmatic entry point for the project.
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        store.clear();
    }

    public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
        if (typeof content === "undefined") {
            return Promise.reject({code: 400, body: {error: "No data in zip or file does not exits"}});
        }

        try {
            const files = await ZipLoader.loadZip(content);
            let dataset = {} as any;

            switch (kind) {
                case "courses":
                    dataset = await CourseParser.parseCourseFiles(files, id);
                    break;
                case "rooms":
                    dataset = await RoomParser.parseRoomFiles(files, id);
            }

            if (dataset.count) {
                // @ts-ignore
                await store.write(id, dataset, kind, (err) => {
                    if (err && err.code === 400) {
                        throw new Error("Duplicate Id");
                    }
                });
            } else {
                throw new Error("No valid data");
            }

            return Promise.resolve({code: 204, body: dataset});
        } catch (e) {
            return Promise.reject({code: 400, body: {error: e.message}});
        }
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        const result = store.removeId(id);

        if (result.code === 204) {
            return Promise.resolve({code: 204, body: null});
        } else {
            return Promise.reject({code: 404, body: {error: "No file with matching Id"}});
        }
    }

    public async performQuery(query: string): Promise<InsightResponse> {
        try {
            const qMapper = new QueryMapper(query);
            const qMap: IQueryMap = qMapper.getParams();
            const qEngine = new QueryEngine(qMap);
            const result: IFileData = await qEngine.execQuery();

            return Promise.resolve({code: 200, body: {result: [...result.data]}});
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.log(e);
            return Promise.reject({code: 400, body: {error: e.message}});
        }
    }

    public async listDatasets(): Promise<InsightResponse> {
        try {
            const datasets: InsightDataset[] = await store.getDataSetsWithTypes();

            return Promise.resolve({code: 200, body: {result: datasets}});
        } catch (e) {
            return Promise.reject({code: 400, body: {error: e.message}});
        }
    }
}
