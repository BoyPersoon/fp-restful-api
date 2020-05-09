import * as JSZip from "jszip";

export default class ZipLoader {
    public static async loadZip(content: string): Promise<{}> {
        const zip = new JSZip();

        return await zip.loadAsync(content, {base64: true})
            .then((data) => {
                const { files } = data;

                return files;
            });
    }
}
