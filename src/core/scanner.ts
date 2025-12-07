/**
 * @license MIT + Commons Clause
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.5
 */

import fg from 'fast-glob';
import path from 'path';
import { MAX_FILES_SCAN } from './validation';

/**
 * Scans the current directory for environment files
 * Uses fast-glob to find .env and .env.* files while excluding templates
 * Automatically filters out template files (.env.example, .env.template, .env.sample)
 * @param includeLocal - Include .env.local files in scan (default: false for security)
 * @param maxFiles - Maximum number of files to scan (default: MAX_FILES_SCAN for safety)
 * @returns Array of file paths found (relative to cwd)
 */
export const findEnvFiles = async (includeLocal: boolean = false, maxFiles: number = MAX_FILES_SCAN): Promise<string[]> => {
  try {
    const ignorePatterns = ['node_modules', '.git', '.env.example', '.env.template', '.env.sample'];

    // By default, ignore .env.local files unless explicitly requested
    if (!includeLocal) {
      ignorePatterns.push('.env.local');
      ignorePatterns.push('.env.*.local');
    }

    const files = await fg(['.env', '.env.*'], {
      dot: true,
      ignore: ignorePatterns,
      cwd: process.cwd()
    });

    // Rate limiting: prevent scanning too many files
    if (files.length > maxFiles) {
      console.warn(`Warning: Found ${files.length} environment files, but only processing first ${maxFiles} for safety.`);
      console.warn('If you need to process more files, please run the tool on specific files instead of using --all');
      return files.slice(0, maxFiles);
    }

    return files;
  } catch (error) {
    console.error('Error scanning for env files:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
};

