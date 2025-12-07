/**
 * @license MIT + Commons Clause
 * @author 686f6c61 <https://github.com/686f6c61>
 * @repository https://github.com/686f6c61/env-doctor-cli
 * @version 0.4.5
 */

import fs from 'fs';
import path from 'path';
import {
  validateLineLength,
  validateVarName,
  checkSuspiciousContent,
  sanitizeErrorMessage
} from './validation';

export interface EnvVar {
  key: string;
  value: string;
  line: number;
  comment?: string;
  isQuoted: boolean;
}

export interface ParseResult {
  variables: Record<string, EnvVar>;
  raw: string;
  lines: string[];
}

/**
 * Parses the content of a .env file
 * @param content Raw content of the file
 * @returns Parsed object with variables and metadata
 */
export const parseEnv = (content: string): ParseResult => {
  const variables: Record<string, EnvVar> = {};
  const lines = content.split(/\r?\n/);
  
  let currentCommentBlock: string[] = [];

  lines.forEach((line, index) => {
    // Validate line length to prevent ReDoS
    try {
      validateLineLength(line);
    } catch (error) {
      console.warn(`Warning: Skipping line ${index + 1}: ${error instanceof Error ? error.message : 'Line too long'}`);
      currentCommentBlock = [];
      return;
    }

    const trimmedLine = line.trim();

    // Empty line resets comment block
    if (!trimmedLine) {
      currentCommentBlock = [];
      return;
    }

    // Capture comment lines
    if (trimmedLine.startsWith('#')) {
      const commentContent = trimmedLine.substring(1).trim();
      currentCommentBlock.push(commentContent);
      return;
    }

    // Basic parsing logic (key=value)
    // Supports inline comments #
    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (!match) {
      // If line is not a comment and not a variable, reset comment block
      currentCommentBlock = [];
      return;
    }

    const key = match[1].trim();

    // Validate variable name
    if (!validateVarName(key)) {
      console.warn(`Warning: Invalid variable name at line ${index + 1}: ${key}`);
      currentCommentBlock = [];
      return;
    }

    let value = match[2].trim();

    // Check for suspicious content in value
    const suspiciousWarning = checkSuspiciousContent(value);
    if (suspiciousWarning) {
      console.warn(`Warning: ${suspiciousWarning} in variable ${key} at line ${index + 1}`);
    }
    let inlineComment = '';
    let isQuoted = false;

    // Handle quotes
    if (value.startsWith('"') || value.startsWith("'")) {
      const quoteChar = value[0];
      isQuoted = true;
      // Try to find the closing quote
      const closingIndex = value.lastIndexOf(quoteChar);
      if (closingIndex > 0) {
        // Check for comments after the closing quote
        const rest = value.substring(closingIndex + 1).trim();
        value = value.substring(1, closingIndex);
        
        if (rest.startsWith('#')) {
          inlineComment = rest.substring(1).trim();
        }
      }
    } else {
      // Handle inline comments for unquoted values
      const commentIndex = value.indexOf('#');
      if (commentIndex !== -1) {
        inlineComment = value.substring(commentIndex + 1).trim();
        value = value.substring(0, commentIndex).trim();
      }
    }

    // Combine block comments and inline comments
    // Prefer block comments for description if available
    let finalComment = inlineComment;
    if (currentCommentBlock.length > 0) {
      // Join block comments with spaces or newlines? 
      // For display in table, maybe just the last line or joined is better.
      // Let's join them to provide full context.
      const blockCommentStr = currentCommentBlock.join(' ');
      finalComment = finalComment ? `${blockCommentStr} (${finalComment})` : blockCommentStr;
    }

    variables[key] = {
      key,
      value,
      line: index + 1,
      comment: finalComment || undefined,
      isQuoted
    };

    // Reset comment block after assigning to a variable
    currentCommentBlock = [];
  });

  return {
    variables,
    raw: content,
    lines
  };
};

/**
 * Reads and parses a .env file from disk
 * @param filePath Path to the file
 */
export const readEnvFile = (filePath: string): ParseResult | null => {
  try {
    // Use basic path resolution without full validation
    // Full validation is done in the calling context (CLI)
    const absolutePath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    return parseEnv(content);
  } catch (error) {
    // Sanitize error messages to avoid exposing system paths
    const sanitized = sanitizeErrorMessage(error, filePath);
    console.error(sanitized);

    // Log full details only in debug mode
    if (process.env.DEBUG === 'true') {
      console.error('Debug details:', error);
    }

    return null;
  }
};
