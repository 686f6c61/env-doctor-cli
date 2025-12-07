/**
 * @license MIT
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.0
 */

import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import { validatePath } from './validation';

/**
 * Checks if a specific file pattern is ignored in .gitignore
 * @param filename The filename to check (e.g., '.env')
 * @param cwd Current working directory (optional, defaults to process.cwd())
 * @returns true if ignored or .gitignore doesn't exist (fail open), false if definitely not ignored
 */
export const checkGitIgnore = (filename: string, cwd: string = process.cwd()): boolean => {
  try {
    // Validate the filename path first
    const fullPath = validatePath(filename, cwd);

    const gitIgnorePath = path.resolve(cwd, '.gitignore');
    if (!fs.existsSync(gitIgnorePath)) {
      return false; // No .gitignore means nothing is ignored!
    }

    const content = fs.readFileSync(gitIgnorePath, 'utf-8');
    const ig = ignore().add(content);

    // Relative path from cwd is required for 'ignore' package
    const relativePath = path.relative(cwd, fullPath);

    return ig.ignores(relativePath);
  } catch (error) {
    console.warn('Could not check .gitignore:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};
