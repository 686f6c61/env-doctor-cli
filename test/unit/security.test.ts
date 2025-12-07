import { checkGitIgnore } from '../../src/core/security';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Security Core (Real FS)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envcheck-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  });

  it('should return true if file is explicitly ignored', () => {
    fs.writeFileSync(path.join(tempDir, '.gitignore'), '.env');
    expect(checkGitIgnore('.env', tempDir)).toBe(true);
  });

  it('should return true if ignored by wildcard', () => {
    fs.writeFileSync(path.join(tempDir, '.gitignore'), 'secret.*');
    expect(checkGitIgnore('secret.key', tempDir)).toBe(true);
  });

  it('should return true if ignored by dotfile wildcard', () => {
    fs.writeFileSync(path.join(tempDir, '.gitignore'), '.env.*');
    expect(checkGitIgnore('.env.local', tempDir)).toBe(true);
  });

  it('should return false if explicitly un-ignored (negation)', () => {
    fs.writeFileSync(path.join(tempDir, '.gitignore'), '*.env\n!public.env');
    expect(checkGitIgnore('public.env', tempDir)).toBe(false);
  });

  it('should return false if not in .gitignore', () => {
    fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules');
    expect(checkGitIgnore('other.file', tempDir)).toBe(false);
  });

  it('should return false if .gitignore does not exist', () => {
    expect(checkGitIgnore('.env', tempDir)).toBe(false);
  });

  // TEST ADDED FOR COVERAGE: Error handling
  it('should catch errors and return false', () => {
      // We can't easily force fs error on real fs without permissions mess.
      // So we spy on fs.readFileSync to throw
      const spy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
          throw new Error('Forced error');
      });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Create dummy gitignore so it enters the read block
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '');
      
      const result = checkGitIgnore('.env', tempDir);
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      spy.mockRestore();
      consoleSpy.mockRestore();
  });
});
