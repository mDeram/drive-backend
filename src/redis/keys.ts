export const PREFIX = "cloud";
export const assemble = (keys: string[]) => keys.join(":");
export const getKey = (key: string) => PREFIX + ":" + key;
export const getPrefix = (key: string) => getKey(key) + ":";

export const getSessionPrefix = () => getPrefix("sess");

export const getDownloadLinkPrefix = () => getPrefix("downloadLink");
export const getDownloadLinkKey = (clientId: string, id: string) => getDownloadLinkPrefix() + assemble([clientId, id]);
