import {IDataSet, IFileData} from "../controller/InsightFacade";
import * as P5 from "parse5";
import {ASTNode} from "parse5";
import GeoLocation, {IGeoResponse} from "../service/GeoLocation";

export interface IRoomData {
    id: string;
    count: number;
    data: IRoom[];
}

export interface Ilocation {
    name: string;
    code: string;
    path: string;
    address: string;
}

export interface IRoom extends IRoomSpecs, IGeoResponse {
    fullname: string;
    shortname: string;
    name: string;
    address: string;
}

export interface IRoomSpecs {
    number: string;
    href: string;
    seats: number;
    furniture: string;
    type: string;
}

export default class RoomParser {

    public static async parseRoomFiles(files: any, id: string): Promise<IRoomData> {
        return new Promise(async (resolve) => {
            const result = await RoomParser.getRoomData(files);

            resolve({
                id,
                count: result.length,
                data: result,
            });
        }).then((result: IRoomData) => (result));
    }

    public static async getRoomData(files: any): Promise<IRoom[]> {
        return new Promise(async (resolve) => {
            const rootFile = files["index.xml"];

            if (rootFile) {
                const locations: Ilocation[] = await RoomParser.parseRootFile(rootFile);

                if (!locations.length) {
                    throw new Error("No location data");
                }

                const rooms: IRoom[] = [];

                const promises = locations.map((location) => {
                    return new Promise(async (resolve2: any) => {
                        const locationRoomFile = Object.values(files)
                            .filter((file: any) => ("./" + file.name === location.path));

                        if (!locationRoomFile.length) {
                            throw new Error("missing room file");
                        }

                        const roomSpecs: IRoomSpecs[] = await RoomParser.getRoomsFromFile(locationRoomFile[0]);
                        const geolocation: IGeoResponse = await GeoLocation.getGeolocation(location.address);

                        roomSpecs.forEach((room: IRoom) => {
                            rooms.push({
                                fullname: String(location.name),
                                shortname: String(location.code),
                                number: String(room.number),
                                name: String(location.code + "_" + room.number),
                                address: String(location.address),
                                lat: geolocation.lat,
                                lon: geolocation.lon,
                                seats: room.seats,
                                type: String(room.type),
                                furniture: String(room.furniture),
                                href: String(room.href),
                            });
                        });

                        resolve2();
                    });
                });

                await Promise.all(promises);

                resolve(rooms);
            } else {
                throw new Error("Root file missing");
            }
        }).then((rooms: IRoom[]) => (rooms))
            .catch((err) => {
                throw new Error(err);
            });
    }

    private static parseLocationData(data: string): Ilocation[] {
        const parsedData = P5.parse(data);
        const buildingNode: ASTNode[] = parsedData.childNodes[1].childNodes[1].childNodes[0].childNodes;

        return buildingNode
            .filter((node: ASTNode) => (node.nodeName === "building"))
            .map((node: ASTNode) => {
                const nodeLocation: ASTNode[] = node.childNodes
                    .filter((subNode: ASTNode) => (subNode.nodeName === "location"));

                if (!nodeLocation.length) {
                    throw new Error("missing building location");
                }

                return {
                    name: node.attrs[1].value,
                    code: node.attrs[0].value,
                    path: node.attrs[2].value,
                    address: nodeLocation[0].attrs[0].value,
                };
            });
    }

    private static validHeaders(data: string): boolean {
        return true;
    }

    private static async parseRootFile(file: any): Promise<Ilocation[]> {
        let rootLocations: Ilocation[] = [];

        const ps = new Promise((resolve, reject) => {
            file.async("text")
                .then(function (fileText: string) {
                    if (RoomParser.validHeaders(fileText)) {
                        rootLocations = RoomParser.parseLocationData(fileText);
                        resolve();
                    }
                }).catch((err: any) => {
                throw new Error("throwing this");
            });
        });

        await ps;

        return rootLocations;
    }

    private static parseRoomData(data: string): IRoomSpecs[] {
        const parsedData = P5.parse(data);
        const RoomsNode: ASTNode[] = parsedData.childNodes[1].childNodes[1].childNodes[0].childNodes[1].childNodes;

        return RoomsNode
            .filter((node: ASTNode) => (node.nodeName === "room"))
            .map((room: ASTNode) => {
                // get web
                const web: ASTNode = room.childNodes[1];
                const space: ASTNode = web.childNodes[1];

                if (typeof web === "undefined" || typeof space === "undefined") {
                    throw new Error("missing room properties");
                }

                return {
                    number: String(room.attrs[0].value),
                    href: String(web.attrs[0].value),
                    seats: parseInt(space.attrs[0].value, 10),
                    furniture: String(space.attrs[1].value),
                    type: String(space.attrs[2].value),
                };
            });
    }

    private static async getRoomsFromFile(file: any): Promise<IRoomSpecs[]> {
        return await new Promise((resolve) => {
            file.async("text")
                .then(function (fileText: string) {
                    const res = RoomParser.parseRoomData(fileText);
                    resolve(res);
                });
        }).then((result: IRoomSpecs[]) => {
            return result;
        }).catch((err: any) => {
            throw new Error(err);
        });
    }
}
