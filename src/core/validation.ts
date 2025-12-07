/**
 * @license MIT
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.0
 *
 * Security validation module
 */

import fs from 'fs';
import path from 'path';

// Security constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_LINE_LENGTH = 10000; // 10KB per line
export const MAX_FILES_SCAN = 50; // Max files in --all mode
export const VALID_VAR_NAME = /^[A-Z_][A-Z0-9_]*$/i;

// Suspicious patterns that might indicate code injection
const SUSPICIOUS_PATTERNS = [
  /\$\(.*\)/,     // Command substitution $(...)
  /`.*`/,          // Backticks for command execution
  /<script>/i,     // XSS attempt
  /;.*rm\s/i,      // Dangerous commands
  /&&.*rm\s/i,
  /\|\|.*rm\s/i,
];

/**
 * Validates and sanitizes a file path to prevent path traversal attacks
 * @param filePath User-provided file path
 * @param cwd Current working directory (defaults to process.cwd())
 * @throws Error if path traversal is detected
 * @returns Validated absolute path
 */
export const validatePath = (filePath: string, cwd: string = process.cwd()): string => {
  // Basic input validation
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path provided');
  }

  // Prevent null bytes
  if (filePath.includes('\0')) {
    throw new Error('Security: Null byte detected in path');
  }

  // Resolve the absolute path
  const absolutePath = path.resolve(cwd, filePath);

  // Prevent path traversal - ensure path is within project directory
  const normalizedCwd = path.normalize(cwd + path.sep);
  const normalizedPath = path.normalize(absolutePath + path.sep);

  if (!normalizedPath.startsWith(normalizedCwd)) {
    throw new Error(`Security: Path traversal detected. Path must be within project directory.`);
  }

  return absolutePath;
};

/**
 * Validates that a file is safe to read/write (not a dangerous symlink)
 * @param filePath Absolute path to validate
 * @param cwd Current working directory
 * @throws Error if symlink points outside project
 * @returns true if safe
 */
export const validateSymlink = (filePath: string, cwd: string = process.cwd()): boolean => {
  try {
    if (!fs.existsSync(filePath)) {
      return true; // Non-existent files are safe (will be created)
    }

    const stats = fs.lstatSync(filePath);

    if (stats.isSymbolicLink()) {
      const realPath = fs.realpathSync(filePath);
      const normalizedCwd = path.normalize(cwd + path.sep);
      const normalizedRealPath = path.normalize(realPath + path.sep);

      if (!normalizedRealPath.startsWith(normalizedCwd)) {
        throw new Error('Security: Symlink points outside project directory');
      }
    }

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return true; // File doesn't exist, safe to create
    }
    throw error;
  }
};

/**
 * Validates file size to prevent memory exhaustion
 * @param filePath Absolute path to file
 * @param maxSize Maximum allowed size in bytes
 * @throws Error if file is too large
 * @returns File size in bytes
 */
export const validateFileSize = (filePath: string, maxSize: number = MAX_FILE_SIZE): number => {
  if (!fs.existsSync(filePath)) {
    return 0; // Non-existent file
  }

  const stats = fs.statSync(filePath);

  if (stats.size > maxSize) {
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const maxMB = (maxSize / 1024 / 1024).toFixed(2);
    throw new Error(`File too large: ${sizeMB}MB (max: ${maxMB}MB)`);
  }

  return stats.size;
};

/**
 * Validates a variable name follows safe naming conventions
 * @param varName Variable name to validate
 * @returns true if valid, false otherwise
 */
export const validateVarName = (varName: string): boolean => {
  if (!varName || typeof varName !== 'string') {
    return false;
  }

  // Check for valid environment variable naming
  if (!VALID_VAR_NAME.test(varName)) {
    return false;
  }

  // Prevent dangerous names
  const dangerousNames = ['__PROTO__', 'CONSTRUCTOR', 'PROTOTYPE'];
  if (dangerousNames.includes(varName.toUpperCase())) {
    return false;
  }

  return true;
};

/**
 * Validates line length to prevent ReDoS attacks
 * @param line Line content to validate
 * @param maxLength Maximum allowed length
 * @throws Error if line is too long
 * @returns true if valid
 */
export const validateLineLength = (line: string, maxLength: number = MAX_LINE_LENGTH): boolean => {
  if (line.length > maxLength) {
    throw new Error(`Line too long: ${line.length} bytes (max: ${maxLength})`);
  }
  return true;
};

/**
 * Checks if content contains suspicious patterns
 * @param content Content to check
 * @returns Warning message if suspicious, null otherwise
 */
export const checkSuspiciousContent = (content: string): string | null => {
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      return `Suspicious pattern detected: potential code injection`;
    }
  }
  return null;
};

/**
 * Comprehensive file validation combining all security checks
 * @param filePath User-provided file path
 * @param cwd Current working directory
 * @param requireExists Whether file must exist
 * @returns Validated absolute path
 */
export const validateFile = (
  filePath: string,
  cwd: string = process.cwd(),
  requireExists: boolean = true
): string => {
  // 1. Validate path (prevent traversal)
  const absolutePath = validatePath(filePath, cwd);

  // 2. Check if file exists when required
  if (requireExists && !fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${path.basename(absolutePath)}`);
  }

  // 3. Validate symlinks
  validateSymlink(absolutePath, cwd);

  // 4. Validate file size
  if (fs.existsSync(absolutePath)) {
    validateFileSize(absolutePath);
  }

  return absolutePath;
};

/**
 * Safe error message that doesn't expose system paths
 * @param error Original error
 * @param filePath File path (will show only basename)
 * @returns Sanitized error message
 */
export const sanitizeErrorMessage = (error: unknown, filePath: string): string => {
  const fileName = path.basename(filePath);

  if (error instanceof Error) {
    // Don't expose full stack traces or system paths
    if (process.env.DEBUG === 'true') {
      return `Error with ${fileName}: ${error.message}`;
    }
    return `Error with ${fileName}`;
  }

  return `Error with ${fileName}`;
};
