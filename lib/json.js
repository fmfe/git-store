import fs from 'fs';
import write from 'write';

export class JsonFile {
    constructor(filename, _data) {
        this.filename = filename;
        this._data = _data;
        this.data = this.get();
    }
    get has() {
        const { filename } = this;
        return fs.existsSync(filename);
    }
    get(){
        if (this.has) {
            const text = fs.readFileSync(this.filename, { encoding: 'utf-8' });
            return JSON.parse(text);
        }
        this.data = this._data();
        return this.data;
    }
    set(data) {
        this.data = data;
        const text = JSON.stringify(data, null, 4);
        write.sync(this.filename, text);
    }
}