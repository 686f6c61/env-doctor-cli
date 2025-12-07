/**
 * @license MIT + Commons Clause
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.5
 */

import fs from 'fs';
import path from 'path';
import { EnvVar, ParseResult } from './parser';
import { validateFile, sanitizeErrorMessage } from './validation';

/**
 * Appends missing variables to the target .env file
 * @param targetPath Path to the target file
 * @param missingKeys List of keys that are missing
 * @param exampleEnv Parsed example environment to get defaults and comments
 * @returns true if successful, false otherwise
 */
export const fixEnv = (
  targetPath: string,
  missingKeys: string[],
  exampleEnv: ParseResult
): boolean => {
  try {
    // Validate file path and security (requireExists=false since we might create it)
    const absolutePath = validateFile(targetPath, process.cwd(), false);
    let content = '';

    // Read existing content if file exists (avoid race condition)
    try {
      content = fs.readFileSync(absolutePath, 'utf-8');
      // Ensure we start on a new line if the file doesn't end with one
      if (content && !content.endsWith('\n')) {
        content += '\n';
      }
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      // Only ignore ENOENT (file doesn't exist), throw other errors
      if (nodeErr.code !== 'ENOENT') {
        throw err;
      }
      // File doesn't exist, content stays empty
      content = '';
    }

    const linesToAdd: string[] = [];
    if (content) {
      linesToAdd.push('\n# --- Added by env-doctor-cli ---\n');
    }

    missingKeys.forEach(key => {
      const exampleVar = exampleEnv.variables[key];
      if (!exampleVar) return;

      // Add comment if exists
      if (exampleVar.comment) {
        // If the comment was a block comment in example, it might contain newlines.
        // Our parser stores it as a string, but if we joined lines, we might want to split them back?
        // For simplicity in v0.3.0, we just write it as a comment.
        // If the comment has parentheses added by parser "Block (Inline)", we might want to clean it up,
        // but for now, raw display is safe.
        linesToAdd.push(`# ${exampleVar.comment}`);
      }

      // Add variable
      // We copy the value from example as default.
      // If we wanted empty values, we would put empty string.
      // But usually .env.example contains safe defaults or empty strings.
      const value = exampleVar.value;
      
      // Handle quoting if needed (simple check)
      let finalValue = value;
      if (exampleVar.isQuoted) {
        // We try to preserve the style of quotes if possible, or default to double quotes
        finalValue = `"${value}"`; 
      }

      linesToAdd.push(`${key}=${finalValue}`);
      linesToAdd.push(''); // Empty line for spacing
    });

    const newContent = content + linesToAdd.join('\n');
    
    // Security: Ensure .env files are only readable by the owner (0600)
    fs.writeFileSync(absolutePath, newContent, { encoding: 'utf-8', mode: 0o600 });


    return true;
  } catch (error) {
    // Sanitize error messages
    const sanitized = sanitizeErrorMessage(error, targetPath);
    console.error(`Error fixing file: ${sanitized}`);

    if (process.env.DEBUG === 'true') {
      console.error('Debug details:', error);
    }

    return false;
  }
};

