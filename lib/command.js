import { Command } from 'commander';
import mkdirp from 'mkdirp';
import inquirer from 'inquirer';
import { queueHandling, isDomain, isEmail, runCommandSuccess } from './util.js';
import { Config } from './config.js';
import { path } from 'zx';
import simpleGit from 'simple-git';
import ConsoleGrid from 'console-grid';
import { cd } from 'zx';

function onError(err) {
    let text = err.message || 'Unknown error';
    if (text.length > 120) {
        text = text.substring(0, 120) + '...';
    }
    return ConsoleGrid.Style.red(text);
}

async function init(config) {
    const prompt = inquirer.createPromptModule();
    const arr = [];
    if (!config.repository) {
        arr.push({
            name: 'repository',
            message: 'Enter your repository domain name',
            type: 'input',
            default: config.repository,
            validate: isDomain
        })
    }
    if (!config.name) {
        arr.push({
            name: 'name',
            message: 'Enter your name',
            type: 'input',
            default: config.name,
            validate: (input) => {
                return !!input
            }
        })
    }
    if (!config.email) {
        arr.push({
            name: 'email',
            message: 'Enter your email',
            type: 'input',
            default: config.email,
            validate: isEmail
        })
    }
    const res = await prompt(arr);
    config.set(res);
}

async function initCommand(config, program) {
    program
        .command('init')
        .description('initial configuration')
        .action(async () => {
            init(config);
        });
}

async function runGit(config, group, cb) {
    const choices = config.getGroupList();
    const baseDir = path.resolve();
    const runItem = async (item) => {
        mkdirp.sync(item.dir);
        const git = simpleGit(item.dir, {
            binary: 'git'
        });
        return cb(git, item);
    }
    const start = async (values) => {
        const arr = await queueHandling(values, runItem);
        cd(baseDir);
        const grid = new ConsoleGrid();
        const rows = arr.map((messages, index) => {
            return {
                folder: path.relative(baseDir, values[index].dir),
                messages: messages || ConsoleGrid.Style.green('Successful')
            }
        })
        const data = {
            columns: [
                {
                    id: "folder",
                    name: "Folder",
                    type: "string",
                    maxWidth: 100
                },
                {
                    id: "messages",
                    name: "Messages",
                    type: "string",
                    maxWidth: 500
                }
            ],
            rows
        };
        grid.render(data);
        return
    }
    if (group && choices.includes(group)) {
        return start(config.getGroupValues([group]))
    }

    const prompt = inquirer.createPromptModule();
    const res = await prompt([
        { name: 'group', type: 'checkbox', message: 'Select the group to clone', choices: config.getGroupList() }
    ]);
    return start(config.getGroupValues(res.group));
}

async function cloneCommand(config, program) {
    program
        .command('clone [group]')
        .description('Clone code')
        .action((group) => {
            return runGit(config, group, async (git, item) => {
                try {
                    await git.clone(item.url, './').catch(onError);
                    await git.addConfig('user.name', config.name);
                    await git.addConfig('user.email', config.email);
                } catch(e) {
                    return onError(e);
                }

            })
        });
}
async function mergeCommand(config, program) {
    program
        .command('merge [group]')
        .requiredOption('-f <from>', 'From which branch')
        .requiredOption('-t <to>', 'To which branch')
        .description('Merge code')
        .action(async (group, params) => {
            return runGit(config, group, async (git, item) => {
                try {
                    let fromBranch = `origin/${params.f}`;

                    await git.pull().catch(onError);
                    let res = await git.branch();
                    
                    if (res.current !== params.t) {
                        await git.checkoutLocalBranch(params.t);
                    }
                    //  --no-ff --no-commit
                    try {
                        res = await git.merge({
                            [fromBranch]: true
                        });
                        console.log(res);
                    } catch(e) {
                        await git.merge({
                            '--abort': true
                        });
                        return onError(e);
                    }
                } catch (e) {
                    return onError(e);
                }
            })
        });
}
async function runCommand(config, program) {
    program
        .command('run [group]')
        .requiredOption('-c <command>', 'Run command')
        .description('Run command')
        .action(async (group, params) => {
            return runGit(config, group, async (git, item) => {
                cd(item.dir);
                const ok = await runCommandSuccess([params.c]);
                return ok ? '' : 'Command execution failed'
            })
        });
}

export function createCommand() {
    const config = new Config();
    const program = new Command('clone');

    initCommand(config, program);
    runCommand(config, program);
    cloneCommand(config, program);
    mergeCommand(config, program);

    return {
        add(command) {
            return command(config, program);
        },
        async run() {
            if (!config.has) {
                return init(config);
            }
            program.parse(process.argv);
        }
    }
}