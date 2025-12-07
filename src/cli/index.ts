/**
 * @license MIT + Commons Clause
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.5
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readEnvFile } from '../core/parser';
import { analyzeEnv } from '../core/analyzer';
import { checkGitIgnore } from '../core/security';
import { fixEnv } from '../core/fixer';
import { generateExample } from '../core/generator';
import { findEnvFiles } from '../core/scanner';
import { askConfirmation } from '../utils/prompt';
import { table } from 'table';
import { validateFile } from '../core/validation';
import { formatAsJson, formatQuiet } from '../utils/formatter';
import { getGitignoreMissingMessage } from '../utils/messages';

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_MISSING_VARS = 1;
const EXIT_EXTRA_VARS = 2;
const EXIT_SECURITY_WARNING = 3;
const EXIT_FILE_NOT_FOUND = 4;
const EXIT_INVALID_ARGS = 5;
const EXIT_PERMISSION_DENIED = 6;
const EXIT_FILE_TOO_LARGE = 7;

// Helper function to handle analysis of a single file
const analyzeFile = async (targetPath: string, examplePath: string, options: any): Promise<{success: boolean, exitCode: number, jsonData?: any}> => {
    const securityWarnings: string[] = [];

    // Validate file paths for security
    try {
        validateFile(targetPath, process.cwd(), false); // false = file might not exist yet
        validateFile(examplePath, process.cwd(), false);
    } catch (error) {
        if (options.json) {
            const errorData = {
                status: 'fail',
                error: error instanceof Error ? error.message : 'Invalid path',
                exit_code: EXIT_INVALID_ARGS
            };
            return { success: false, exitCode: EXIT_INVALID_ARGS, jsonData: errorData };
        }
        if (!options.quiet) {
            console.error(chalk.red(`Security validation failed: ${error instanceof Error ? error.message : 'Invalid path'}`));
        }
        return { success: false, exitCode: EXIT_INVALID_ARGS };
    }

    // Security Check: .gitignore
    const isIgnored = checkGitIgnore(targetPath);
    if (!isIgnored) {
        securityWarnings.push(`${targetPath} is not in .gitignore`);
        if (options.ci || options.json) {
            // In CI/JSON mode, just record warning
        } else if (!options.quiet) {
            console.warn(getGitignoreMissingMessage(targetPath));
            console.log('');
        }
    }

    if (!options.ci && !options.quiet && !options.json) {
        console.log(chalk.blue(`Checking ${targetPath} against ${examplePath}...\n`));
    }

    // Read and parse files
    const targetEnv = readEnvFile(targetPath);
    const exampleEnv = readEnvFile(examplePath);

    if (!targetEnv && !exampleEnv) {
        if (options.json) {
            const errorData = {
                status: 'fail',
                error: `Could not find ${targetPath} or ${examplePath}`,
                exit_code: EXIT_FILE_NOT_FOUND
            };
            return { success: false, exitCode: EXIT_FILE_NOT_FOUND, jsonData: errorData };
        }
        if (!options.quiet) {
            console.error(chalk.red(`Error: Could not find ${targetPath} or ${examplePath}`));
        }
        return { success: false, exitCode: EXIT_FILE_NOT_FOUND };
    }

    if (!exampleEnv) {
        if (!options.ci && !options.quiet && !options.json) {
            console.warn(chalk.yellow(`Warning: Template file ${examplePath} not found. Comparison skipped.`));
        }
    }

    // Analyze differences
    const result = analyzeEnv(targetEnv, exampleEnv);
    let exitCode = EXIT_SUCCESS;

    // Determine exit code
    if (result.missing.length > 0) {
        exitCode = EXIT_MISSING_VARS;
    } else if (result.extra.length > 0) {
        exitCode = EXIT_EXTRA_VARS;
    }

    if (securityWarnings.length > 0 && exitCode === EXIT_SUCCESS) {
        exitCode = EXIT_SECURITY_WARNING;
    }

    // JSON Output Mode
    if (options.json) {
        const jsonData = formatAsJson(
            result.missing,
            result.extra,
            result.totalExample,
            result.totalTarget,
            targetPath,
            examplePath,
            securityWarnings
        );
        return { success: result.missing.length === 0, exitCode, jsonData };
    }

    // Quiet Mode
    if (options.quiet) {
        const quietOutput = formatQuiet(result.missing, result.extra);
        if (quietOutput) {
            console.log(quietOutput);
        }
        return { success: result.missing.length === 0, exitCode };
    }

    // Normal Output
    // Report results first
    if (result.missing.length > 0) {
        console.log(chalk.red(`[✗] Missing variables in ${targetPath} (${result.missing.length}):`));

        const tableData = [['Variable', 'Description']];
        result.missing.forEach(key => {
            const comment = exampleEnv?.variables[key]?.comment || '-';
            tableData.push([chalk.bold(key), comment]);
        });

        console.log(table(tableData));
    } else {
        if (!options.ci) {
            console.log(chalk.green(`[✓] All variables from ${examplePath} are present in ${targetPath}`));
        }
    }

    if (result.extra.length > 0 && !options.ci) {
        console.log(chalk.yellow(`[!] Extra variables in ${targetPath} (not in example) (${result.extra.length}):`));
        result.extra.forEach(key => {
            console.log(`   - ${key}`);
        });
        console.log('');
    }

    // FIX LOGIC with Confirmation
    if (options.fix && result.missing.length > 0 && exampleEnv) {
        console.log(chalk.blue(`\n[FIX] Auto-fix requested.`));
        console.log(`I will add the ${result.missing.length} missing variables to ${targetPath}.`);

        const confirmed = options.ci ? false : await askConfirmation('Do you want to proceed?');

        if (confirmed) {
             const success = fixEnv(targetPath, result.missing, exampleEnv);
             if (success) {
                 console.log(chalk.green(`[✓] Successfully added missing variables to ${targetPath}`));
                 exitCode = EXIT_SUCCESS; // Resolved
             } else {
                 console.error(chalk.red(`[✗] Failed to write to ${targetPath}`));
             }
        } else {
             if (!options.ci) console.log(chalk.yellow('Operation cancelled.'));
        }
    }

    // Summary
    const pctColor = result.percentage === 100 ? chalk.green : (result.percentage > 80 ? chalk.yellow : chalk.red);
    console.log(chalk.bold(`\n[Summary] ${targetPath}: ${result.synced.length}/${result.totalExample} variables synced (${pctColor(result.percentage + '%')})`));
    console.log('---------------------------------------------------\n');

    return { success: result.missing.length === 0, exitCode };
};

export const runCLI = async () => {
  const program = new Command();

  program
    .name('env-doctor')
    .description('The ESLint for your .env files')
    .version('0.4.5');

  program
    .option('-t, --target <file>', 'Target .env file to check', '.env')
    .option('-e, --example <file>', 'Example .env file to compare against', '.env.example')
    .option('-a, --all', 'Check all .env files found in current directory')
    .option('-f, --fix', 'Automatically add missing variables to target file')
    .option('-g, --generate', 'Generate .env.example from target .env file')
    .option('--json', 'Output results in JSON format')
    .option('-q, --quiet', 'Quiet mode: minimal output, only show errors')
    .option('--include-local', 'Include .env.local files in validation')
    .option('--no-colors', 'Disable colored output')
    .option('--ci', 'CI mode: stricter exit codes, no colors (unless forced), minimal output');

  program.action(async (options) => {
    // CI Mode adjustments
    if (options.ci || options.json) {
      process.env.FORCE_COLOR = '0';
      options.colors = false;
    }

    // GENERATE LOGIC (Single file mode usually)
    if (options.generate) {
        if (!options.quiet) {
            console.log(chalk.blue(`[Generating] ${options.example} from ${options.target}...`));
        }
        const success = generateExample(options.target, options.example);
        if (success) {
            if (!options.quiet) {
                console.log(chalk.green(`[✓] Successfully generated ${options.example}`));
            }
            process.exit(EXIT_SUCCESS);
        } else {
            if (!options.quiet) {
                console.error(chalk.red(`[✗] Failed to generate ${options.example}`));
            }
            process.exit(EXIT_PERMISSION_DENIED);
        }
    }

    let filesToCheck: string[] = [];

    if (options.all) {
        if (!options.quiet && !options.json) {
            console.log(chalk.blue('[Scanning] Looking for environment files...'));
        }
        const foundFiles = await findEnvFiles(options.includeLocal);
        if (foundFiles.length === 0) {
            if (!options.quiet && !options.json) {
                console.warn(chalk.yellow('No environment files found.'));
            }
            process.exit(EXIT_FILE_NOT_FOUND);
        }
        filesToCheck = foundFiles;
        if (!options.quiet && !options.json) {
            console.log(chalk.gray(`Found: ${filesToCheck.join(', ')}\n`));
        }
    } else {
        filesToCheck = [options.target];
    }

    let globalExitCode = EXIT_SUCCESS;
    const allResults: any[] = [];

    for (const file of filesToCheck) {
        const result = await analyzeFile(file, options.example, options);

        if (options.json) {
            allResults.push(result.jsonData);
        }

        // Track highest exit code
        if (result.exitCode > globalExitCode) {
            globalExitCode = result.exitCode;
        }
    }

    // Output JSON if requested
    if (options.json) {
        if (allResults.length === 1) {
            console.log(JSON.stringify(allResults[0], null, 2));
        } else {
            console.log(JSON.stringify({ files: allResults }, null, 2));
        }
    }

    process.exit(globalExitCode);
  });

  program.parse(process.argv);
};
