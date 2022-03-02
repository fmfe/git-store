import { Git } from './git.js';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { queueHandling, isDomain, isEmail } from './util.js';
import { Config } from './config.js';


async function initCommand(config, program) {
    program
        .command('init')
        .description('initial configuration')
        .action(async () => {
            const prompt = inquirer.createPromptModule();
            const res = await prompt([
                {
                    name: 'repository',
                    message: 'Enter your repository domain name',
                    type: 'input',
                    validate: isDomain
                },
                {
                    name: 'name',
                    message: 'Enter your name',
                    type: 'input',
                    validate: (input) => {
                        return !!input
                    }
                },
                {
                    name: 'email',
                    message: 'Enter your email',
                    type: 'input',
                    validate: isEmail
                },
            ]);
            config.set(res);
        });
}

async function runGit(config, group, cb) {
    const choices = config.getGroupList();
    const runItem = async (item) => {
        const git = new Git(item.dir, item.url);
        return cb(git);
    }
    if (group && choices.includes(group)) {
        return queueHandling(config.getGroupValues([group]), runItem);
    }

    const prompt = inquirer.createPromptModule();
    const res = await prompt([
        { name: 'group', type: 'checkbox', message: 'Select the group to clone', choices: config.getGroupList() }
    ]);
    return queueHandling(config.getGroupValues(res.group), runItem);
}

async function cloneCommand(config, program) {
    program
        .command('clone [group]')
        .description('Clone code')
        .action((group) => {
            return runGit(config, group, async (git) => {
                return git.clone(config.name, config.email);
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
            return runGit(config, group, async (git) => {
                return git.merge(params.f, params.t);
            })
        });
}
async function runCommand(config, program) {
    program
        .command('run [group]')
        .requiredOption('-c <command>', 'Run command')
        .description('Run command')
        .action(async (group, params) => {
            return runGit(config, group, async (git) => {
                return git.runCommand(params.c);
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
                return console.log('Configuration not found');
            }
            program.parse(process.argv);
        }
    }
}