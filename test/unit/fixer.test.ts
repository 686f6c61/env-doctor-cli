import { fixEnv } from '../../src/core/fixer';
import { ParseResult } from '../../src/core/parser';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('../../src/core/validation', () => ({
  validateFile: jest.fn((path: string, cwd: string, requireExists: boolean) => {
    return require('path').resolve(cwd || process.cwd(), path);
  }),
  sanitizeErrorMessage: jest.fn((error: any, path: string) => `Error with ${require('path').basename(path)}`)
}));

describe('Fixer Core', () => {
  const mockWriteFileSync = fs.writeFileSync as jest.Mock;
  const mockReadFileSync = fs.readFileSync as jest.Mock;
  const mockExistsSync = fs.existsSync as jest.Mock;
  const mockStatSync = fs.statSync as jest.Mock;
  const mockLstatSync = fs.lstatSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    // Mock stats for file size validation
    mockStatSync.mockReturnValue({ size: 1024, isSymbolicLink: () => false });
    mockLstatSync.mockReturnValue({ isSymbolicLink: () => false });
  });

  const mockExampleEnv: ParseResult = {
    variables: {
      VAR: { key: 'VAR', value: 'val', line: 1, isQuoted: false }
    },
    raw: '',
    lines: []
  };

  it('should append missing variables to existing file', () => {
    mockReadFileSync.mockReturnValue('EXISTING=1\n');
    fixEnv('.env', ['VAR'], mockExampleEnv);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('EXISTING=1\n\n# --- Added by env-doctor-cli ---\n\nVAR=val\n'),
      { encoding: 'utf-8', mode: 0o600 }
    );
  });

  it('should ensure newline before appending if missing', () => {
    mockReadFileSync.mockReturnValue('EXISTING=1'); // No newline at end
    fixEnv('.env', ['VAR'], mockExampleEnv);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('EXISTING=1\n\n# --- Added by env-doctor-cli ---\n'),
      { encoding: 'utf-8', mode: 0o600 }
    );
  });

  it('should handle quoted variables and comments', () => {
    mockReadFileSync.mockReturnValue('');
    const complexExample: ParseResult = {
        variables: {
            QUOTED: { key: 'QUOTED', value: 'val', line: 1, isQuoted: true, comment: 'Comment' }
        },
        raw: '',
        lines: []
    }
    fixEnv('.env', ['QUOTED'], complexExample);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('# Comment\nQUOTED="val"'),
      { encoding: 'utf-8', mode: 0o600 }
    );
  });

  it('should create file if it does not exist', () => {
    // Mock ENOENT error for readFileSync
    const enoentError: NodeJS.ErrnoException = new Error('File not found');
    enoentError.code = 'ENOENT';
    mockReadFileSync.mockImplementation(() => { throw enoentError; });

    fixEnv('.env', ['VAR'], mockExampleEnv);
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('should return false on error', () => {
    mockReadFileSync.mockImplementation(() => { throw new Error('Write error'); });

    // Spy console error to suppress output during test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = fixEnv('.env', ['VAR'], mockExampleEnv);

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log debug details when DEBUG=true', () => {
    process.env.DEBUG = 'true';
    mockReadFileSync.mockImplementation(() => { throw new Error('Test error'); });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    fixEnv('.env', ['VAR'], mockExampleEnv);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error fixing file'));
    expect(consoleSpy).toHaveBeenCalledWith('Debug details:', expect.any(Error));

    consoleSpy.mockRestore();
    delete process.env.DEBUG;
  });

  it('should skip missing keys that do not exist in exampleEnv', () => {
    mockReadFileSync.mockReturnValue('');

    // Try to fix with a key that doesn't exist in exampleEnv
    const result = fixEnv('.env', ['NONEXISTENT_KEY'], mockExampleEnv);

    // Should still return true (no error), but key won't be added
    expect(result).toBe(true);
    expect(mockWriteFileSync).toHaveBeenCalled();

    const writtenContent = mockWriteFileSync.mock.calls[0][1];
    expect(writtenContent).not.toContain('NONEXISTENT_KEY');
  });
});
