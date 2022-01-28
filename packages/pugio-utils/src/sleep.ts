export const sleep = (timeout = 500) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(undefined);
        }, timeout);
    });
};
