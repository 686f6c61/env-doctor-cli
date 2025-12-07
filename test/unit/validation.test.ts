import {
  validatePath,
  validateSymlink,
  validateFileSize,
  validateVarName,
  validateLineLength,
  checkSuspiciousContent,
  validateFile,
  sanitizeErrorMessage,
  MAX_FILE_SIZE,
  MAX_LINE_LENGTH
} from '../../src/core/validation';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Validation Module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  });

  describe('validatePath', () => {
    it('should accept valid paths within project', () => {
      const validPath = validatePath('.env', tempDir);
      expect(validPath).toBe(path.resolve(tempDir, '.env'));
    });

    it('should reject path traversal attempts', () => {
      expect(() => validatePath('../../../etc/passwd', tempDir)).toThrow('Path traversal detected');
    });

    it('should reject paths with null bytes', () => {
      expect(() => validatePath('.env\0', tempDir)).toThrow('Null byte');
    });

    it('should reject invalid input types', () => {
      expect(() => validatePath(null as any, tempDir)).toThrow('Invalid file path');
      expect(() => validatePath('' as string, tempDir)).toThrow('Invalid file path');
    });

    it('should accept nested paths within project', () => {
      const validPath = validatePath('config/.env', tempDir);
      expect(validPath).toBe(path.resolve(tempDir, 'config/.env'));
    });
  });

  describe('validateSymlink', () => {
    it('should return true for non-existent files', () => {
      const result = validateSymlink(path.join(tempDir, 'nonexistent'), tempDir);
      expect(result).toBe(true);
    });

    it('should handle ENOENT errors gracefully in symlink check', () => {
      // Spy on lstatSync to throw ENOENT error
      const lstatSpy = jest.spyOn(fs, 'lstatSync').mockImplementation(() => {
        const err: NodeJS.ErrnoException = new Error('ENOENT');
        err.code = 'ENOENT';
        throw err;
      });

      const result = validateSymlink(path.join(tempDir, 'test'), tempDir);
      expect(result).toBe(true); // Should return true for ENOENT

      lstatSpy.mockRestore();
    });

    it('should return true for regular files', () => {
      const testFile = path.join(tempDir, 'regular.txt');
      fs.writeFileSync(testFile, 'test');
      const result = validateSymlink(testFile, tempDir);
      expect(result).toBe(true);
    });

    it('should accept symlinks within project', () => {
      const target = path.join(tempDir, 'target.txt');
      const link = path.join(tempDir, 'link.txt');
      fs.writeFileSync(target, 'test');

      try {
        fs.symlinkSync(target, link);
        const result = validateSymlink(link, tempDir);
        expect(result).toBe(true);
      } catch (error) {
        // Symlinks might not be available on all systems
        console.log('Skipping symlink test - not supported on this system');
      }
    });

    it('should reject symlinks pointing outside project', () => {
      const outsideTarget = path.join(os.tmpdir(), 'outside.txt');
      const link = path.join(tempDir, 'bad-link.txt');

      fs.writeFileSync(outsideTarget, 'test');
      try {
        fs.symlinkSync(outsideTarget, link);
        expect(() => validateSymlink(link, tempDir)).toThrow('outside project');
      } finally {
        fs.unlinkSync(outsideTarget);
      }
    });
  });

  describe('validateFileSize', () => {
    it('should return 0 for non-existent files', () => {
      const size = validateFileSize(path.join(tempDir, 'nonexistent'));
      expect(size).toBe(0);
    });

    it('should accept files within size limit', () => {
      const testFile = path.join(tempDir, 'small.txt');
      fs.writeFileSync(testFile, 'small content');
      const size = validateFileSize(testFile);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(MAX_FILE_SIZE);
    });

    it('should reject files exceeding size limit', () => {
      const testFile = path.join(tempDir, 'large.txt');
      // Create a file larger than 10MB
      const largeContent = Buffer.alloc(11 * 1024 * 1024);
      fs.writeFileSync(testFile, largeContent);

      expect(() => validateFileSize(testFile)).toThrow('File too large');
    });

    it('should respect custom size limits', () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'test content');

      expect(() => validateFileSize(testFile, 5)).toThrow('File too large');
    });
  });

  describe('validateVarName', () => {
    it('should accept valid variable names', () => {
      expect(validateVarName('PORT')).toBe(true);
      expect(validateVarName('API_KEY')).toBe(true);
      expect(validateVarName('DB_HOST')).toBe(true);
      expect(validateVarName('_PRIVATE')).toBe(true);
      expect(validateVarName('VAR123')).toBe(true);
    });

    it('should reject invalid variable names', () => {
      expect(validateVarName('123VAR')).toBe(false); // Starts with number
      expect(validateVarName('VAR-NAME')).toBe(false); // Contains dash
      expect(validateVarName('VAR.NAME')).toBe(false); // Contains dot
      expect(validateVarName('VAR NAME')).toBe(false); // Contains space
      expect(validateVarName('')).toBe(false); // Empty
    });

    it('should reject dangerous variable names', () => {
      expect(validateVarName('__PROTO__')).toBe(false);
      expect(validateVarName('CONSTRUCTOR')).toBe(false);
      expect(validateVarName('PROTOTYPE')).toBe(false);
    });

    it('should handle invalid input types', () => {
      expect(validateVarName(null as any)).toBe(false);
      expect(validateVarName(undefined as any)).toBe(false);
    });
  });

  describe('validateLineLength', () => {
    it('should accept lines within limit', () => {
      const shortLine = 'PORT=3000';
      expect(validateLineLength(shortLine)).toBe(true);
    });

    it('should reject lines exceeding limit', () => {
      const longLine = 'A'.repeat(MAX_LINE_LENGTH + 1);
      expect(() => validateLineLength(longLine)).toThrow('Line too long');
    });

    it('should respect custom limits', () => {
      const line = 'A'.repeat(100);
      expect(() => validateLineLength(line, 50)).toThrow('Line too long');
    });
  });

  describe('checkSuspiciousContent', () => {
    it('should return null for safe content', () => {
      expect(checkSuspiciousContent('PORT=3000')).toBeNull();
      expect(checkSuspiciousContent('DB_HOST=localhost')).toBeNull();
      expect(checkSuspiciousContent('API_KEY=abc123')).toBeNull();
    });

    it('should detect command substitution', () => {
      expect(checkSuspiciousContent('$(rm -rf /)')).toMatch(/suspicious/i);
      expect(checkSuspiciousContent('VALUE=$(cat /etc/passwd)')).toMatch(/suspicious/i);
    });

    it('should detect backticks', () => {
      expect(checkSuspiciousContent('`rm -rf /`')).toMatch(/suspicious/i);
      expect(checkSuspiciousContent('VALUE=`ls`')).toMatch(/suspicious/i);
    });

    it('should detect script tags', () => {
      expect(checkSuspiciousContent('<script>alert(1)</script>')).toMatch(/suspicious/i);
      expect(checkSuspiciousContent('<SCRIPT>alert(1)</SCRIPT>')).toMatch(/suspicious/i);
    });

    it('should detect dangerous commands', () => {
      expect(checkSuspiciousContent('; rm -rf /')).toMatch(/suspicious/i);
      expect(checkSuspiciousContent('&& rm -rf /')).toMatch(/suspicious/i);
      expect(checkSuspiciousContent('|| rm -rf /')).toMatch(/suspicious/i);
    });
  });

  describe('validateFile', () => {
    it('should validate complete file security', () => {
      const testFile = path.join(tempDir, 'test.env');
      fs.writeFileSync(testFile, 'PORT=3000');

      const validPath = validateFile('test.env', tempDir, true);
      expect(validPath).toBe(testFile);
    });

    it('should reject when file required but does not exist', () => {
      expect(() => validateFile('nonexistent.env', tempDir, true)).toThrow('File not found');
    });

    it('should accept when file not required and does not exist', () => {
      const validPath = validateFile('new.env', tempDir, false);
      expect(validPath).toBe(path.join(tempDir, 'new.env'));
    });

    it('should reject path traversal in validateFile', () => {
      expect(() => validateFile('../../../etc/passwd', tempDir, false)).toThrow('Path traversal detected');
    });

    it('should reject files that are too large', () => {
      const largeFile = path.join(tempDir, 'large.env');
      const largeContent = Buffer.alloc(11 * 1024 * 1024);
      fs.writeFileSync(largeFile, largeContent);

      expect(() => validateFile('large.env', tempDir, true)).toThrow('File too large');
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should sanitize error messages to hide system paths', () => {
      const error = new Error('ENOENT: no such file or directory /home/user/secret/path/.env');
      const sanitized = sanitizeErrorMessage(error, '/home/user/secret/path/.env');

      expect(sanitized).toContain('.env');
      expect(sanitized).not.toContain('/home/user/secret/path');
    });

    it('should handle non-Error objects', () => {
      const sanitized = sanitizeErrorMessage('string error', '/path/to/file.env');
      expect(sanitized).toContain('file.env');
    });

    it('should include details in debug mode', () => {
      process.env.DEBUG = 'true';
      const error = new Error('Detailed error message');
      const sanitized = sanitizeErrorMessage(error, '/path/to/file.env');

      expect(sanitized).toContain('Detailed error message');

      delete process.env.DEBUG;
    });

    it('should hide details in production mode', () => {
      delete process.env.DEBUG;
      const error = new Error('Detailed error message');
      const sanitized = sanitizeErrorMessage(error, '/path/to/file.env');

      expect(sanitized).not.toContain('Detailed error message');
      expect(sanitized).toContain('file.env');
    });
  });
});
