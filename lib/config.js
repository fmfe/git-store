import path from 'path';
import { JsonFile } from './json.js'

const baseDir = path.resolve();
const gitStore = path.resolve(baseDir, 'git-store.json');
const gitConfig = path.resolve(baseDir, 'git-config.json');


function createConfig(config = {}) {
    return {
        name: '',
        email: '',
        ...config
    }
}

export class Config {
    constructor() {
        this.gitStore = new JsonFile(gitStore, () => ({
            repository: '',
        }));
        this.gitConfig = new JsonFile(gitConfig, () => createConfig);
    }
    get has() {
        return this.gitConfig.has;
    }
    get data () {
        return {
            ...this.gitConfig.data,
            ...this.gitStore.data
        }
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
            url = url.replace(/^\//, '');
            return {
                dir: path.resolve(baseDir, url),
                url: `git@${data.repository}:${url}.git`
            };
        })
    }
    set(data) {
        const d = { ...this.data, ...data };
        this.gitConfig.set({
            name: d.name,
            email: d.email
        });
        this.gitStore.set({
            groups: d.groups,
            repository: d.repository
        });
    }
}