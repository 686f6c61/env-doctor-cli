/**
 * @license MIT + Commons Clause
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.5
 */

/**
 * Standard structure for enhanced error messages
 * Contains title, issue description, suggestion, and optional details
 */
export interface ErrorMessage {
  title: string;
  issue: string;
  suggestion: string;
  details?: string;
}

/**
 * Get enhanced error message for invalid variable name
 * Provides context-specific suggestions based on the type of naming violation
 * @param varName The invalid variable name
 * @param line Line number where the invalid name was found
 * @returns Formatted error message with suggestions
 */
export function getInvalidVarNameMessage(varName: string, line: number): string {
  const isStartsWithNumber = /^\d/.test(varName);
  const hasInvalidChars = /[^A-Z0-9_]/i.test(varName);

  let suggestion = '';
  if (isStartsWithNumber) {
    suggestion = `Rename to "VAR_${varName}" or "MY_${varName}"`;
  } else if (hasInvalidChars) {
    const sanitized = varName.replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
    suggestion = `Rename to "${sanitized}"`;
  } else {
    suggestion = 'Use only letters, numbers, and underscores';
  }

  return `[WARN] Invalid variable name at line ${line}: "${varName}"

    Issue: Variable names must start with a letter or underscore
    Valid format: A-Z, a-z, 0-9, _ (must not start with a number)

    Suggestion: ${suggestion}`;
}

/**
 * Get enhanced error message for path traversal
 * Explains that the attempted path escapes the project directory
 * @param attemptedPath The path that was blocked
 * @param projectRoot The root directory of the project
 * @returns Formatted security error message
 */
export function getPathTraversalMessage(attemptedPath: string, projectRoot: string): string {
  return `[SECURITY ERROR] Path traversal detected

    Attempted path: ${attemptedPath}
    Blocked reason: Path escapes project directory

    The file path tries to access files outside your project.
    This is blocked for security reasons.

    Ensure your file path stays within: ${projectRoot}`;
}

/**
 * Get enhanced error message for symlink attack
 * Explains that the symlink points outside the project directory
 * @param symlinkPath Path to the symbolic link
 * @param targetPath Where the symlink points to
 * @returns Formatted security error message
 */
export function getSymlinkBlockedMessage(symlinkPath: string, targetPath: string): string {
  return `[SECURITY ERROR] Symbolic link blocked

    Symlink: ${symlinkPath}
    Points to: ${targetPath}
    Blocked reason: Target is outside project directory

    Symbolic links pointing outside the project are blocked to prevent
    unauthorized access to sensitive files.`;
}

/**
 * Get enhanced error message for file size exceeded
 * Suggests splitting large files into multiple smaller environment files
 * @param filePath Path to the file that exceeded the limit
 * @param actualSize Actual file size in bytes
 * @param maxSize Maximum allowed file size in bytes
 * @returns Formatted security error message with file sizes in MB
 */
export function getFileSizeExceededMessage(filePath: string, actualSize: number, maxSize: number): string {
  const actualMB = (actualSize / (1024 * 1024)).toFixed(2);
  const maxMB = (maxSize / (1024 * 1024)).toFixed(0);

  return `[SECURITY ERROR] File size limit exceeded

    File: ${filePath}
    Size: ${actualMB} MB
    Maximum allowed: ${maxMB} MB

    This limit prevents memory exhaustion attacks.

    If this is a legitimate file, consider splitting it into multiple
    smaller environment files (e.g., .env.services, .env.features)`;
}

/**
 * Get enhanced error message for line too long (ReDoS protection)
 * Warns about extremely long lines that could cause regex denial of service
 * @param line Line number that exceeded the limit
 * @param length Actual line length in characters
 * @param maxLength Maximum allowed line length in characters
 * @returns Formatted warning message with line lengths in KB
 */
export function getLineTooLongMessage(line: number, length: number, maxLength: number): string {
  const lengthKB = (length / 1024).toFixed(2);
  const maxKB = (maxLength / 1024).toFixed(0);

  return `[WARN] Line too long at line ${line}

    Length: ${lengthKB} KB
    Maximum allowed: ${maxKB} KB

    Extremely long lines are skipped to prevent Regular Expression
    Denial of Service (ReDoS) attacks.

    Suggestion: Split long values across multiple variables or use
    external configuration files for large data.`;
}

/**
 * Get enhanced error message for suspicious content
 * Warns about potentially malicious patterns in environment variable values
 * @param varName Name of the variable containing suspicious content
 * @param line Line number where the suspicious content was found
 * @param pattern Type of suspicious pattern detected (e.g., "command substitution", "script tag")
 * @returns Formatted warning message with pattern description
 */
export function getSuspiciousContentMessage(varName: string, line: number, pattern: string): string {
  const patterns: Record<string, string> = {
    'command substitution': 'Contains $(...) or backticks which could execute commands',
    'script tag': 'Contains <script> tag which could be XSS attempt',
    'dangerous command': 'Contains shell commands (rm, curl, wget) which could be malicious'
  };

  const description = patterns[pattern] || 'Contains suspicious pattern';

  return `[WARN] Suspicious content detected in "${varName}" at line ${line}

    Pattern: ${pattern}
    Issue: ${description}

    While this may be legitimate, please verify this is intentional.
    Environment variables should contain configuration data, not executable code.`;
}

/**
 * Get enhanced message for missing .gitignore entry
 * Provides actionable steps to add .env files to .gitignore
 * @param envFile Path to the .env file not found in .gitignore
 * @returns Formatted security warning with .gitignore patterns to add
 */
export function getGitignoreMissingMessage(envFile: string): string {
  return `[SECURITY WARNING] .env file not in .gitignore

    File: ${envFile}

    Your .env file is not listed in .gitignore and may be committed to git,
    exposing sensitive credentials.

    Action required: Add the following to your .gitignore:

    .env
    .env.*
    !.env.example`;
}

/**
 * Get exit code description
 * Maps exit codes (0-7) to human-readable descriptions
 * @param code Exit code number
 * @returns Description of what the exit code means
 */
export function getExitCodeDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Success - All variables synchronized',
    1: 'Missing variables detected',
    2: 'Extra variables detected',
    3: 'Security warning',
    4: 'File not found',
    5: 'Invalid arguments',
    6: 'Permission denied',
    7: 'File size exceeded'
  };

  return descriptions[code] || 'Unknown error';
}
