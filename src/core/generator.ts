/**
 * @license MIT
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.0
 */

import fs from 'fs';
import path from 'path';
import { ParseResult } from './parser';
import { validateFile, validateVarName, sanitizeErrorMessage } from './validation';

/**
 * Checks if a variable name suggests it contains sensitive data
 */
const isSensitive = (key: string): boolean => {
  const sensitivePatterns = [
    'KEY',
    'SECRET',
    'PASSWORD',
    'PASS',
    'TOKEN',
    'CREDENTIAL',
    'AUTH',
    'PRIVATE',
    'SIGNATURE',
    'hash',
    'salt',
    'cert',
    'connection'
  ];
  const upperKey = key.toUpperCase();
  return sensitivePatterns.some(pattern => upperKey.includes(pattern));
};

/**
 * Generates a .env.example file from an existing .env file
 * sanitizing sensitive values.
 */
export const generateExample = (
  sourcePath: string,
  targetPath: string = '.env.example'
): boolean => {
  try {
    // Validate source file (must exist)
    const absoluteSource = validateFile(sourcePath, process.cwd(), true);

    // Validate target file (might not exist yet)
    const absoluteTarget = validateFile(targetPath, process.cwd(), false);

    // We read the file manually instead of using parser.ts because we want to preserve
    // the exact structure, empty lines, and comments as much as possible,
    // just replacing the values.
    const content = fs.readFileSync(absoluteSource, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    const outputLines: string[] = [];

    lines.forEach(line => {
      const trimmedLine = line.trim();

      // Passthrough empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        outputLines.push(line);
        return;
      }

      // Match variable definition
      const match = line.match(/^([^=]+)=(.*)$/);
      if (!match) {
        outputLines.push(line); // Unparseable line, just keep it
        return;
      }

      const key = match[1]; // Keep indentation/spacing of key
      const valuePart = match[2];
      const trimmedKey = key.trim();

      // Validate variable name
      if (!validateVarName(trimmedKey)) {
        console.warn(`Warning: Skipping invalid variable name: ${trimmedKey}`);
        outputLines.push(line); // Keep original line as comment might be important
        return;
      }

      // Decide if we should keep the value or sanitize it
      if (isSensitive(trimmedKey)) {
        // Replace value with empty string or placeholder?
        // Standard practice for .env.example is usually empty value
        outputLines.push(`${key}=`);
      } else {
        // Keep value for non-sensitive vars (like PORT=3000)
        outputLines.push(line);
      }
    });

    // Write with secure permissions
    fs.writeFileSync(absoluteTarget, outputLines.join('\n'), { encoding: 'utf-8', mode: 0o644 });
    return true;
  } catch (error) {
    // Sanitize error messages
    const sanitized = sanitizeErrorMessage(error, sourcePath);
    console.error(`Error generating example: ${sanitized}`);

    if (process.env.DEBUG === 'true') {
      console.error('Debug details:', error);
    }

    return false;
  }
};

