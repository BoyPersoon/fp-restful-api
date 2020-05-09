import * as http from "http";

export interface IGeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}

export default class GeoLocation {

    public static async getGeolocation(address: string): Promise<IGeoResponse> {
        const teamNumber: (number|string) = "BoyPersoon";
        const encodedAddress = GeoLocation.getEncodedGeoLocation(address);
        const queryUrl: string = `http://sdmm.cs.ubc.ca:11316/api/v1/team${teamNumber}/${encodedAddress}`;

        return GeoLocation.HTTPClientRequest(queryUrl);
    }

    private static getEncodedGeoLocation(address: string): string {
        // will not encode ~!@#$&*()=:/,;?+'
        return encodeURIComponent(address);
    }

    private static async HTTPClientRequest(queryURI: string): Promise<IGeoResponse> {
        return await new Promise((resolve, reject) => {
            http.get(queryURI, (res) => {
                const {statusCode} = res;
                const contentType = res.headers["content-type"];

                if (statusCode !== 200) {
                    throw new Error("Request Failed.\n" +
                        `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    throw new Error("Invalid content-type.\n" +
                        `Expected application/json but received ${contentType}`);
                }

                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        const jsonifiedData = JSON.parse(rawData);
                        resolve(jsonifiedData);
                    } catch (error) {
                        throw new Error(error.message);
                    }
                });
            }).on("error", (error) => {
                throw new Error(error.message);
            });
        }).then((data: IGeoResponse) => {
            return data;
        });
    }
}
