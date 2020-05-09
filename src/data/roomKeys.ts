export const mKeyMap = {
    Latitude: "lat",
    Longitude: "lon",
    Seats: "seats",
};

export const sKeyMap = {
    "Full Name": "fullname",
    "Short Name": "shortname",
    "Number": "number",
    "Name": "name",
    "Address": "address",
    "Type": "type",
    "Furniture": "furniture",
    "Link": "href",
};

export const queryKeyToDataKey = {...mKeyMap, ...sKeyMap};
