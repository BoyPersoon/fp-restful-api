
export const mKeyMap = {
    Audit: "audit",
    Pass: "pass",
    Fail: "fail",
    Avg: "avg",
    Year: "year",
};

export const sKeyMap = {
    Subject: "dept",
    Course: "id",
    Professor: "instructor",
    Title: "title",
    id: "uuid",
};

export const courseKeyMap = {...mKeyMap, ...sKeyMap};

export const queryKeyToDataKey = {
    Average: "avg",
    Pass: "pass",
    Fail: "fail",
    Audit: "audit",
    Department: "dept",
    ID: "id",
    Instructor: "instructor",
    Title: "title",
    UUID: "uuid",
    Year: "year",
};
