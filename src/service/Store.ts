import {IDataSet} from "../controller/InsightFacade";
import * as fs from "fs";
import {IFileData} from "../controller/QueryEngine";
import {InsightDataset, InsightDatasetKind} from "../controller/IInsightFacade";

export default class Store {
    private cacheRoot = "./cache/";

    constructor() {
        this.initRoot();
    }

    public getFileData(kind: string): Promise<IFileData> {
        const filePath = this.getFullPath(kind + ".json");

        return new Promise(async (resolve, reject) => {
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, "utf8");
                const data = await JSON.parse(fileContent);
                resolve(data);
            } else {
                reject("missing dataset(s) " + kind);
            }
        });
    }

    private getFullPath(file: string): string {
        return this.cacheRoot + file;
    }

    private initRoot(): void {
        if (!this.checkRootExists()) {
            fs.mkdirSync(this.cacheRoot);
        }
    }

    private checkRootExists(): boolean {
        return fs.existsSync(this.cacheRoot);
    }

    private checkPathExists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    // tslint:disable-next-line:member-ordering
    public async getDataSetsWithTypes(): Promise<InsightDataset[]> {
        const sets: InsightDataset[] = [];
        const fileNames: string[] = fs.readdirSync(this.cacheRoot);

        await Promise.all(fileNames.map((fileName) => {
            const filePath = this.getFullPath(fileName);

            return new Promise((resolve, reject) => {
                if (fs.existsSync(filePath)) {
                    fs.readFile(filePath, async (err, data) => {
                        if (err) {
                            reject(err);
                        } else {
                            const fileContent = data.toString("utf8");

                            try {
                                if (typeof fileContent === "string" && !fileContent.length) {
                                    throw Error("data returned empty");
                                }

                                const jsonData = await JSON.parse(fileContent);

                                sets.push({
                                    id: fileName.replace(".json", ""),
                                    kind: jsonData.kind,
                                    numRows: jsonData.data.length,
                                });
                            } catch (e) {
                                reject(e);
                            }

                            resolve();
                        }
                    });
                }
            });
        }));

        return sets;
    }

    // tslint:disable-next-line:member-ordering
    public async clear(): Promise<void> {
        if (this.cacheRoot && fs.existsSync(this.cacheRoot)) {
            fs.readdirSync(this.cacheRoot).forEach((file) => {
                fs.unlinkSync(this.cacheRoot + file);
            });
            fs.rmdirSync(this.cacheRoot);

            await this.initRoot();
        }

        return;
    }

    // tslint:disable-next-line:member-ordering
    public async write(id: string, content: IDataSet, kind: string, cb: any): Promise<{}> {
        const filePath = "cache/" + id + ".json";

        if (!this.checkRootExists()) {
            await this.initRoot();
        }

        if (this.checkPathExists(filePath)) {
            return cb({code: 400, body: "File already exists"});
        }

        try {
            const jsonData = await JSON.stringify({ kind, data: content.data});

            fs.writeFileSync(filePath, jsonData);

            return cb({code: 200, body: null});
        } catch (e) {
            return cb({code: 400, body: e});
        }
    }

    // tslint:disable-next-line:member-ordering
    public removeId(id: string) {
        const filePath = "cache/" + id + ".json";

        if (this.checkPathExists(filePath)) {
            fs.unlinkSync(filePath);

            return {code: 204, body: null};
        } else {
            return {code: 400, body: "No file with matching Id"};
        }
    }
}
