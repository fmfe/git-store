import path from 'path';
import { JsonFile } from './json.js'

const baseDir = path.resolve();
const filename = path.resolve(baseDir, 'git-store.json');


function createConfig(config = {}) {
    return {
        name: '',
        email: '',
        repository: '',
        groups: {},
        ...config
    }
}

export class Config extends JsonFile {
    constructor() {
        super(filename, createConfig);
    }
    get name () {
        return this.data.name;
    }
    get email () {
        return this.data.email;
    }
    get repository () {
        return this.data.repository;
    }
    get groups () {
        return this.data.groups;
    }
    getGroupList() {
        const arr = Object.keys(this.groups);
        return arr;
    }
    getGroupValues(keys) {
        const arr  = [];
        const { groups, data } = this;
        console.log(data);
        keys.forEach(key => {
            arr.push(...groups[key]);
        });
        return arr.map(url => {
            return {
                dir: path.resolve(baseDir, url),
                url: `git@${data.repository}:${url}.git`
            };
        })
    }
    set(data) {
        super.set(createConfig(data));
    }
}