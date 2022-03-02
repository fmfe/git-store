import mkdirp from 'mkdirp';
import { runCommandSuccess, runCommand } from './util.js';
import { cd } from 'zx';
import path from 'path'
import fs from 'fs'

/**
 * 需要测试的功能点：
 * 1.判断本地项目是否克隆 ok
 * 2.实现克隆项目 ok
 * 3.拉取代码 ok
 * 4.判断本地是否存在未提交 ok
 * 5.切换分支
 *  5.1 本地有分支，远程无分支 ok 
 *  5.3 本地有分支，远程有分支 ok
 *  5.2 本地无分支，远程无分支 ok
 *  5.4 本地无分支，远程有分支 ok
 * 6.获取当前分支 ok
 * 7.测试代码合并
 * 8.测试分支删除 ok
 */

export class Git {
    /**
     * 目录
     * SSH 请求地址
     * @param {string} url 
     */
    constructor(dir, url) {
        mkdirp.sync(dir);
        cd(dir);
        this.dir = dir;
        this.url = url;
    }
    /**
     * 判断项目是否已经克隆下来
     * @returns Promise<boolean>
     */
    async isClone() {
        return fs.existsSync(path.resolve(this.dir, '.git'));
    }
    async clone(name, email) {
        if (await this.isClone()) {
            return true;
        }
        const res = await runCommand([`git clone ${this.url} ./`]);
        if (res.success) {
            await runCommandSuccess([`git config user.name "${name}"`]);
            await runCommandSuccess([`git config user.email "${email}"`])
        }
        return res.success;
    }
    async merge(from, to) {
        if (from === to) {
            return false;
        }
        if (await this.hasChange()) {
            // 当前分支有为提交的代码
            return false;
        }
        const branch = await this.getBranch();
        if (to !== branch) {
            if (!await this.switchBranch(to)) {
                return false;
            }
        }
        if (!await this.pull()) {
            return false;
        }
        if (!this.testConflict(from)) {
            return false;
        }
        const ok = await runCommandSuccess([`git merge origin/${from}`]);
        if (!ok) {
            return false;
        }
        return this.push();
    }
    async pull() {
        return runCommandSuccess(['git pull origin'])
    }
    async push() {
        return runCommandSuccess(['git push'])
    }
    async pruned() {
        return runCommandSuccess(['git remote prune origin'])
    }
    async testConflict (branch) {
        const ok = await runCommandSuccess([`git merge origin/${branch} --no-ff --no-commit`]);
        await runCommandSuccess(['git merge --abort']);
        return ok;
    }
    async getBranch() {
        const res = await runCommand(['git rev-parse --abbrev-ref HEAD']);
        return res.stdout;
    }
    async switchBranch(branch) {
        if (await this.getBranch() === branch) {
            return true;
        }
        if (await this.hasLocalBranch(branch)) {
            return runCommandSuccess([`git checkout ${branch}`]);
        }
        await runCommand([`git checkout -b ${branch}`]);
        return runCommandSuccess([`git push --set-upstream origin ${branch}`]);
    }
    async delBranch(branch) {
        // 判断远程分支是否存在
        if (await this.hasBranch(branch)) {
            const ok = await runCommandSuccess([`git push origin --delete ${branch}`]);
            if (!ok) {
                return false;
            }
        }
        // 判断删除本地分支
        if (await this.hasLocalBranch(branch)) {
            return runCommandSuccess([`git branch -D ${branch}`])
        }
        return true;
    }
    async hasLocalBranch(branch) {
        const res = await runCommand(['git branch']);
        const arr = res.stdout.split('\n').map(str => {
            return str.trim().replace(/^\* /, '');
        });
        return arr.includes(branch);
    }
    async hasBranch(branch) {
        const res = await runCommand([`git show-branch remotes/origin/${branch}`]);
        return res.success;
    }
    /**
     * 判断当前分支是否有未提交的代码
     */
    async hasChange() {
        const res = await runCommand(['git status -s']);
        return res.success && !!res.stdout;
    }
}