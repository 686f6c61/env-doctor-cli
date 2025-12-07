import { parseEnv, readEnvFile } from '../../src/core/parser';
import fs from 'fs';
import path from 'path';

jest.mock('fs');

describe('Parser Core', () => {
  const mockExistsSync = fs.existsSync as jest.Mock;
  const mockReadFileSync = fs.readFileSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseEnv', () => {
    it('should parse basic key=value pairs', () => {
      const input = `PORT=3000\nHOST=localhost`;
      const result = parseEnv(input);
      expect(result.variables['PORT'].value).toBe('3000');
      expect(result.variables['HOST'].value).toBe('localhost');
    });

    // COVERS: Empty lines and whitespace-only lines (lines 41-42)
    it('should ignore empty lines and whitespace lines', () => {
      const input = `
      
      VAR=1
         
      `;
      const result = parseEnv(input);
      expect(Object.keys(result.variables)).toHaveLength(1);
      expect(result.variables['VAR'].value).toBe('1');
    });

    // COVERS: Comment blocks pure (lines 47-49)
    it('should handle pure comment blocks resetting properly', () => {
        const input = `
        # Block 1
        # Block 1 continued
        VAR1=1
        
        # Block 2 (orphaned)
        
        VAR2=2
        `;
        const result = parseEnv(input);
        expect(result.variables['VAR1'].comment).toContain('Block 1');
        expect(result.variables['VAR2'].comment).toBeUndefined(); // Block 2 was reset by empty line
    });

    // COVERS: Non-matching lines (lines 57-58)
    it('should ignore lines that are not comments and not variables', () => {
        const input = `
        # Comment
        INVALID_LINE_NO_EQUALS
        VAR=1
        `;
        const result = parseEnv(input);
        expect(result.variables['VAR'].value).toBe('1');
        // The comment should be reset because of the invalid line in between
        expect(result.variables['VAR'].comment).toBeUndefined();
    });

    it('should handle quoted values', () => {
      const input = `MESSAGE="Hello World"`;
      const result = parseEnv(input);
      expect(result.variables['MESSAGE'].value).toBe('Hello World');
      expect(result.variables['MESSAGE'].isQuoted).toBe(true);
    });

    // COVERS: Quoted value logic (lines 85-86, 97-98)
    it('should handle quoted values with comments after closing quote', () => {
      const input = `KEY="value" # My Comment`;
      const result = parseEnv(input);
      expect(result.variables['KEY'].value).toBe('value');
      expect(result.variables['KEY'].comment).toBe('My Comment');
    });

    it('should handle quoted values with spaces but NO comment after closing quote', () => {
        const input = `KEY="value"   `;
        const result = parseEnv(input);
        expect(result.variables['KEY'].value).toBe('value');
        expect(result.variables['KEY'].comment).toBeUndefined();
    });

    it('should handle quoted values where closing quote is the last char', () => {
        const input = `KEY="value"`;
        const result = parseEnv(input);
        expect(result.variables['KEY'].value).toBe('value');
    });

    it('should handle unquoted values with inline comments', () => {
      const input = `HOST=localhost # Local server`;
      const result = parseEnv(input);
      expect(result.variables['HOST'].value).toBe('localhost');
      expect(result.variables['HOST'].comment).toBe('Local server');
    });

    it('should handle single quotes', () => {
       const input = `KEY='Value'`;
       const result = parseEnv(input);
       expect(result.variables['KEY'].value).toBe('Value');
       expect(result.variables['KEY'].isQuoted).toBe(true);
    });

    it('should skip lines that are too long with warning', () => {
      const longLine = 'A'.repeat(11000); // Exceeds MAX_LINE_LENGTH
      const input = `VALID=1\n${longLine}\nVALID2=2`;

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = parseEnv(input);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping line'));
      expect(result.variables['VALID']).toBeDefined();
      expect(result.variables['VALID2']).toBeDefined();

      consoleWarnSpy.mockRestore();
    });

    it('should skip invalid variable names with warning', () => {
      const input = `VALID=1\n123INVALID=2\nVALID2=3`;

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = parseEnv(input);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid variable name'));
      expect(result.variables['VALID']).toBeDefined();
      expect(result.variables['VALID2']).toBeDefined();
      expect(result.variables['123INVALID']).toBeUndefined();

      consoleWarnSpy.mockRestore();
    });

    it('should warn about suspicious content', () => {
      const input = `SAFE=value\nSUSPICIOUS=$(rm -rf /)\nSAFE2=value2`;

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = parseEnv(input);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Suspicious'));
      expect(result.variables['SUSPICIOUS']).toBeDefined(); // Still parsed, just warned
      expect(result.variables['SAFE']).toBeDefined();

      consoleWarnSpy.mockRestore();
    });

    it('should handle unclosed quoted value', () => {
      const input = `KEY="unclosed`;
      const result = parseEnv(input);
      // When closing quote is not found (closingIndex <= 0), value stays as-is
      expect(result.variables['KEY']).toBeDefined();
    });

    it('should combine block comments with inline comments', () => {
      const input = `# This is a block comment\nKEY=value # inline comment`;
      const result = parseEnv(input);
      expect(result.variables['KEY'].comment).toContain('This is a block comment');
      expect(result.variables['KEY'].comment).toContain('inline comment');
    });
  });

  describe('readEnvFile', () => {
    it('should return null if file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      const result = readEnvFile('.env');
      expect(result).toBeNull();
    });

    it('should parse content if file exists', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('A=1');
      const result = readEnvFile('.env');
      expect(result?.variables['A'].value).toBe('1');
    });

    // COVERS: readEnvFile catch block (line 131)
    it('should return null on read error', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => { throw new Error('Read error'); });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = readEnvFile('.env');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log debug details when DEBUG=true', () => {
      process.env.DEBUG = 'true';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => { throw new Error('Test error'); });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      readEnvFile('.env');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error with'));
      expect(consoleSpy).toHaveBeenCalledWith('Debug details:', expect.any(Error));

      consoleSpy.mockRestore();
      delete process.env.DEBUG;
    });
  });
});
