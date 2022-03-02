import { $ } from 'zx'

/**
 * 运行命令
 * @param  {...string} args 
 * @returns Promise<{success: boolean, stdout: string}>
 */
export async function runCommand(...args) {
    try {
        const res = await $(...args);
        return {
            success: res.exitCode === 0 || res.exitCode === '0',
            stdout: res.stdout.trimEnd()
        }
    } catch (e) {
        return { success: false, stdout: e instanceof Error ? e.message : '' }
    }
}

/**
 * 判断命令是否执行成功
 * @param  {...string} args 
 * @returns Promise<boolean>
 */
export async function runCommandSuccess(...args) {
    const res = await runCommand(...args);
    return res.success;
}

/**
 * 
 * @param {any[]} arr 
 */
export async function queueHandling(arr, cb) {
    const item = arr.shift();
    if (!item) {
        return;
    }
    await cb(item);
    return queueHandling(arr, cb);
}

export function isDomain(input) {
    return /^[a-zA-Z0-9_-]+\.[.a-zA-Z0-9_-]+$/.test(input);
}

export function isEmail(input) {
    return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(input)
}
