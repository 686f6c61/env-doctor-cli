/**
 * @license MIT
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.0
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

// Helper function to handle analysis of a single file
const analyzeFile = async (targetPath: string, examplePath: string, options: any): Promise<boolean> => {
    // Validate file paths for security
    try {
        validateFile(targetPath, process.cwd(), false); // false = file might not exist yet
        validateFile(examplePath, process.cwd(), false);
    } catch (error) {
        console.error(chalk.red(`Security validation failed: ${error instanceof Error ? error.message : 'Invalid path'}`));
        return false;
    }

    // Security Check: .gitignore
    const isIgnored = checkGitIgnore(targetPath);
    if (!isIgnored) {
        if (options.ci) {
            console.error(`SECURITY ERROR: ${targetPath} is not ignored in .gitignore`);
            return false;
        } else {
            console.warn(chalk.bgRed.white.bold(` ⚠️  SECURITY WARNING `));
            console.warn(chalk.red(`File ${chalk.bold(targetPath)} is NOT ignored in .gitignore!`));
            console.warn(chalk.yellow('This could expose your secrets. Add it to .gitignore immediately.\n'));
        }
    }

    if (!options.ci) {
        console.log(chalk.blue(`Checking ${targetPath} against ${examplePath}...\n`));
    }

    // Read and parse files
    const targetEnv = readEnvFile(targetPath);
    const exampleEnv = readEnvFile(examplePath);

    if (!targetEnv && !exampleEnv) {
        console.error(chalk.red(`Error: Could not find ${targetPath} or ${examplePath}`));
        return false;
    }

    if (!exampleEnv) {
        if (!options.ci) {
            console.warn(chalk.yellow(`Warning: Template file ${examplePath} not found. Comparison skipped.`));
        }
    }

    // Analyze differences
    const result = analyzeEnv(targetEnv, exampleEnv);
    let hasError = false;

    // Report results first
    if (result.missing.length > 0) {
        console.log(chalk.red(`❌ Missing variables in ${targetPath} (${result.missing.length}):`));
        
        const tableData = [['Variable', 'Description']];
        result.missing.forEach(key => {
            const comment = exampleEnv?.variables[key]?.comment || '-';
            tableData.push([chalk.bold(key), comment]);
        });

        console.log(table(tableData));
        hasError = true;
    } else {
        if (!options.ci) {
            console.log(chalk.green(`✅ All variables from ${examplePath} are present in ${targetPath}`));
        }
    }

    if (result.extra.length > 0 && !options.ci) {
        console.log(chalk.yellow(`⚠️  Extra variables in ${targetPath} (not in example) (${result.extra.length}):`));
        result.extra.forEach(key => {
            console.log(`   - ${key}`);
        });
        console.log('');
    }

    // FIX LOGIC with Confirmation
    if (options.fix && result.missing.length > 0 && exampleEnv) {
        console.log(chalk.blue(`\n🔧 Auto-fix requested.`));
        console.log(`I will add the ${result.missing.length} missing variables to ${targetPath}.`);
        
        // In --all mode or --ci mode, interactive prompt might be tricky.
        // For now we keep it interactive unless --ci (which usually shouldn't fix interactively).
        // If --ci is set, we might skip fix or force it? Let's skip fix in CI for safety unless explicit force flag (not implemented).
        
        const confirmed = options.ci ? false : await askConfirmation('Do you want to proceed?');
        
        if (confirmed) {
             const success = fixEnv(targetPath, result.missing, exampleEnv);
             if (success) {
                 console.log(chalk.green(`✅ Successfully added missing variables to ${targetPath}`));
                 hasError = false; // Resolved
             } else {
                 console.error(chalk.red(`❌ Failed to write to ${targetPath}`));
             }
        } else {
             if (!options.ci) console.log(chalk.yellow('Operation cancelled.'));
        }
    }

    // Summary
    const pctColor = result.percentage === 100 ? chalk.green : (result.percentage > 80 ? chalk.yellow : chalk.red);
    console.log(chalk.bold(`\n📊 Summary for ${targetPath}: ${result.synced.length}/${result.totalExample} variables synced (${pctColor(result.percentage + '%')})`));
    console.log('---------------------------------------------------\n');

    return !hasError;
};

export const runCLI = async () => {
  const program = new Command();

  program
    .name('env-doctor')
    .description('The ESLint for your .env files')
    .version('0.4.0');

  program
    .option('-t, --target <file>', 'Target .env file to check', '.env')
    .option('-e, --example <file>', 'Example .env file to compare against', '.env.example')
    .option('-a, --all', 'Check all .env files found in current directory')
    .option('-f, --fix', 'Automatically add missing variables to target file')
    .option('-g, --generate', 'Generate .env.example from target .env file')
    .option('--no-colors', 'Disable colored output')
    .option('--ci', 'CI mode: stricter exit codes, no colors (unless forced), minimal output');

  program.action(async (options) => {
    // CI Mode adjustments
    if (options.ci) {
      process.env.FORCE_COLOR = '0'; 
      options.colors = false;
    }

    // GENERATE LOGIC (Single file mode usually)
    if (options.generate) {
        console.log(chalk.blue(`🔄 Generating ${options.example} from ${options.target}...`));
        const success = generateExample(options.target, options.example);
        if (success) {
            console.log(chalk.green(`✅ Successfully generated ${options.example}`));
            process.exit(0);
        } else {
            console.error(chalk.red(`❌ Failed to generate ${options.example}`));
            process.exit(1);
        }
    }

    let filesToCheck: string[] = [];
    
    if (options.all) {
        console.log(chalk.blue('🔍 Scanning for environment files...'));
        const foundFiles = await findEnvFiles();
        if (foundFiles.length === 0) {
            console.warn(chalk.yellow('No environment files found.'));
            process.exit(0);
        }
        filesToCheck = foundFiles;
        console.log(chalk.gray(`Found: ${filesToCheck.join(', ')}\n`));
    } else {
        filesToCheck = [options.target];
    }

    let globalSuccess = true;

    for (const file of filesToCheck) {
        const success = await analyzeFile(file, options.example, options);
        if (!success) {
            globalSuccess = false;
        }
    }

    if (!globalSuccess) {
        process.exit(1);
    }
  });

  program.parse(process.argv);
};
