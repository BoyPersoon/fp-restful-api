import {IFileData} from "../controller/InsightFacade";
import {courseKeyMap} from "../data/courseKeys";

export default class CourseParser {

    public static expectedHeaders = {
        Title: "string",
        id: "string",
        Professor: "string",
        Audit: "number",
        Year: "number",
        Course: "string",
        Pass: "number",
        Fail: "number",
        Avg: "number",
        Subject: "string",
    };

    public static async parseCourseFiles(files: any, id: string): Promise<{}> {
        const dataset = {} as any;

        dataset.id = id;
        dataset.count = 0;
        dataset.data = [];

        const ps: any[] = [];

        Object.values(files).forEach((file) => {
            const {name, dir} = file;
            const csvPat = /\.csv$/g;
            const courseDirPat = /^courses\//;
            const found = name.match(csvPat);
            const correctDir = name.match(courseDirPat);

            if (correctDir) {
                if (!dir && found) {
                    ps.push(
                        file.async("text")
                            .then(function (fileText: string) {
                                if (CourseParser.validHeaders(fileText)) {
                                    const parsedData = CourseParser.parseData(fileText);

                                    dataset.count += parsedData.count;
                                    dataset.data.push( ...parsedData.data);
                                }
                            }));
                }
            }
        });

        await Promise.all(ps).catch((err) => {
            throw new Error("No valid data");
        });

        return dataset;
    }

    private static equalArray = (h1: string[], h2: string[]) => {
        if (h1.length !== h2.length) {
            return false;
        }

        for (let i = 0; i <= h1.length; i++) {
            if (h1[i] !== h2[i]) {
                return false;
            }
        }

        return true;
    }

    private static validTypes = (entry: string): boolean => {
        const values = entry.split("|");
        const expectedHeaderTypes = Object.values(CourseParser.expectedHeaders);

        if (values.length !== expectedHeaderTypes.length) {
            return false;
        }

        values.forEach((val, i) => {
            if (expectedHeaderTypes[i] === "number") {
                if (isNaN(parseInt(val, 10))) {
                    return false;
                }
            }
        });

        return true;
    }

    private static parseData = (data: string): IFileData => {
        const rows = data.split("\n");
        const entries = rows.slice(1);
        const expectedHeaderNames = Object.keys(CourseParser.expectedHeaders);
        const expectedHeaderTypes = Object.values(CourseParser.expectedHeaders);
        const JSON = {} as any;

        if (!entries.length) {
            return {
                count: 0,
                data: [],
            };
        }

        JSON.data = [];

        entries.forEach((entry) => {
            entry = entry.replace(/\r/g, "");
            entry = entry.trim();

            if (CourseParser.validTypes(entry)) {
                const entryValues: string[] = entry.split("|");
                const entryData = {} as any;

                expectedHeaderNames.forEach((name, i) => {
                    expectedHeaderTypes[i] === "number" ?
                        // @ts-ignore
                        entryData[courseKeyMap[name]] = parseFloat(entryValues[i])
                        // @ts-ignore
                        : entryData[courseKeyMap[name]] = entryValues[i];
                });

                JSON.data.push(entryData);
            }
        });

        JSON.count = JSON.data.length;

        return JSON;
    }

    private static validHeaders = (data: string) => {
        const expectedFirstLine = /^(Title\|id\|Professor\|Audit\|Year\|Course\|Pass\|Fail\|Avg\|Subject)\r\n/;
        const headerMatch  = data.match(expectedFirstLine);

        if (headerMatch) {
            const headers = headerMatch[1].split("|");
            const expectedHeaderNames = Object.keys(CourseParser.expectedHeaders);

            if (CourseParser.equalArray(headers, expectedHeaderNames)) {
                return true;
            }
        }

        return false;
    }
}
