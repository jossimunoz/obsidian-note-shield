interface IMemoryStorageData {
    value: any;
    expiration?: number; // Expiration time in milliseconds
}

export class MemoryStorage {
    private data: { [key: string]: IMemoryStorageData };

    constructor() {
        this.data = {};
    }

    private isExpired(key: string): boolean {
        const item = this.data[key];
        if (item && item.expiration && Date.now() > item.expiration) {
            return true;
        }
        return false;
    }

    set(key: string, value: any, expirationTime?: number) {
        const data: IMemoryStorageData = {
            value: value,
        };

        if (expirationTime) {
            data.expiration = Date.now() + expirationTime;
        }

        this.data[key] = data;
    }

    get(key: string): any {
        if (this.isExpired(key)) {
            this.remove(key);
            return undefined;
        }

        const item = this.data[key];
        return item ? item.value : undefined;
    }

    remove(key: string) {
        delete this.data[key];
    }

    update(key: string, value: any, expirationTime?: number) {
        if (this.data.hasOwnProperty(key)) {
            this.set(key, value, expirationTime);
        } else {
            console.log(`Key '${key}' does not exist.`);
        }
    }

    clear() {
        this.data = {};
    }

    getAllKeys(): string[] {
        return Object.keys(this.data);
    }
}
