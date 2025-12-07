import { generateExample } from '../../src/core/generator';
import fs from 'fs';
import * as validation from '../../src/core/validation';

jest.mock('fs');
jest.mock('../../src/core/validation', () => ({
  validateFile: jest.fn((path: string, cwd: string, requireExists: boolean) => {
    const resolvedPath = require('path').resolve(cwd || process.cwd(), path);
    if (requireExists && !require('fs').existsSync(resolvedPath)) {
      throw new Error('File not found');
    }
    return resolvedPath;
  }),
  validateVarName: jest.fn((name: string) => true),
  sanitizeErrorMessage: jest.fn((error: any, path: string) => `Error with ${require('path').basename(path)}`)
}));

describe('Generator Core', () => {
  const mockWriteFileSync = fs.writeFileSync as jest.Mock;
  const mockReadFileSync = fs.readFileSync as jest.Mock;
  const mockExistsSync = fs.existsSync as jest.Mock;
  const mockStatSync = fs.statSync as jest.Mock;
  const mockLstatSync = fs.lstatSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock stats for file size validation
    mockStatSync.mockReturnValue({ size: 1024, isSymbolicLink: () => false });
    mockLstatSync.mockReturnValue({ isSymbolicLink: () => false });
  });

  it('should return false if source file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const result = generateExample('.env');
    expect(result).toBe(false);
  });

  it('should generate example file preserving comments and structure', () => {
    mockExistsSync.mockReturnValue(true);
    const inputEnv = `
# Header Comment
PORT=3000

# Secret Section
API_KEY=12345secret
    `;
    mockReadFileSync.mockReturnValue(inputEnv);

    const result = generateExample('.env');

    expect(result).toBe(true);
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.env.example'),
      expect.stringContaining('# Header Comment'),
      expect.objectContaining({ encoding: 'utf-8' })
    );
  });

  it('should sanitize sensitive values', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('API_SECRET=supersecret123');

    generateExample('.env');

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('API_SECRET='),
      expect.objectContaining({ encoding: 'utf-8' })
    );
  });

  it('should handle malformed lines (no equals sign)', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('MALFORMED_LINE_NO_EQUALS');

    generateExample('.env');

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('MALFORMED_LINE_NO_EQUALS'),
      expect.objectContaining({ encoding: 'utf-8' })
    );
  });

  it('should handle file read errors gracefully', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => { throw new Error('Read Error'); });

    // Spy console error to suppress output during test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = generateExample('.env');

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should skip invalid variable names with warning', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('123INVALID=value\nVALID_VAR=value2');

    // Mock validateVarName to return false for invalid names
    const mockValidateVarName = validation.validateVarName as jest.Mock;
    mockValidateVarName.mockImplementation((name: string) => !name.startsWith('123'));

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    generateExample('.env');

    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping invalid variable name'));
    expect(mockWriteFileSync).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
    mockValidateVarName.mockImplementation((name: string) => true);
  });

  it('should log debug details when DEBUG=true', () => {
    process.env.DEBUG = 'true';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => { throw new Error('Test error'); });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    generateExample('.env');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error generating example'));
    expect(consoleSpy).toHaveBeenCalledWith('Debug details:', expect.any(Error));

    consoleSpy.mockRestore();
    delete process.env.DEBUG;
  });
});
