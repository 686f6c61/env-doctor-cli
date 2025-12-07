import {
  getInvalidVarNameMessage,
  getPathTraversalMessage,
  getSymlinkBlockedMessage,
  getFileSizeExceededMessage,
  getLineTooLongMessage,
  getSuspiciousContentMessage,
  getGitignoreMissingMessage,
  getExitCodeDescription
} from '../../src/utils/messages';

describe('Messages Utils', () => {
  describe('getInvalidVarNameMessage', () => {
    it('should provide helpful message for number-starting variable', () => {
      const message = getInvalidVarNameMessage('123VAR', 5);
      expect(message).toContain('Invalid variable name');
      expect(message).toContain('123VAR');
      expect(message).toContain('line 5');
      expect(message).toContain('VAR_123');
    });

    it('should provide helpful message for invalid characters', () => {
      const message = getInvalidVarNameMessage('VAR-NAME', 10);
      expect(message).toContain('Invalid variable name');
      expect(message).toContain('VAR-NAME');
    });
  });

  describe('getPathTraversalMessage', () => {
    it('should explain path traversal attempt', () => {
      const message = getPathTraversalMessage('../../../etc/passwd', '/home/user/project');
      expect(message).toContain('Path traversal detected');
      expect(message).toContain('../../../etc/passwd');
      expect(message).toContain('/home/user/project');
    });
  });

  describe('getSymlinkBlockedMessage', () => {
    it('should explain symlink block', () => {
      const message = getSymlinkBlockedMessage('.env', '/etc/passwd');
      expect(message).toContain('Symbolic link blocked');
      expect(message).toContain('.env');
      expect(message).toContain('/etc/passwd');
    });
  });

  describe('getFileSizeExceededMessage', () => {
    it('should show file size in MB', () => {
      const message = getFileSizeExceededMessage('.env', 15 * 1024 * 1024, 10 * 1024 * 1024);
      expect(message).toContain('File size limit exceeded');
      expect(message).toContain('15.00 MB');
      expect(message).toContain('10 MB');
    });
  });

  describe('getLineTooLongMessage', () => {
    it('should show line length in KB', () => {
      const message = getLineTooLongMessage(10, 20 * 1024, 10 * 1024);
      expect(message).toContain('Line too long');
      expect(message).toContain('line 10');
      expect(message).toContain('20.00 KB');
      expect(message).toContain('10 KB');
    });
  });

  describe('getSuspiciousContentMessage', () => {
    it('should detect command substitution pattern', () => {
      const message = getSuspiciousContentMessage('MY_VAR', 5, 'command substitution');
      expect(message).toContain('Suspicious content detected');
      expect(message).toContain('MY_VAR');
      expect(message).toContain('line 5');
      expect(message).toContain('command substitution');
    });

    it('should detect script tag pattern', () => {
      const message = getSuspiciousContentMessage('API_KEY', 12, 'script tag');
      expect(message).toContain('script tag');
    });

    it('should detect dangerous command pattern', () => {
      const message = getSuspiciousContentMessage('CMD', 7, 'dangerous command');
      expect(message).toContain('dangerous command');
    });

    it('should handle unknown patterns', () => {
      const message = getSuspiciousContentMessage('VAR', 1, 'unknown pattern');
      expect(message).toContain('Contains suspicious pattern');
    });
  });

  describe('getGitignoreMissingMessage', () => {
    it('should provide actionable advice for missing gitignore', () => {
      const message = getGitignoreMissingMessage('.env');
      expect(message).toContain('not in .gitignore');
      expect(message).toContain('.env');
      expect(message).toContain('Add the following');
    });
  });

  describe('getInvalidVarNameMessage edge cases', () => {
    it('should handle variable with no specific fix suggestion', () => {
      const message = getInvalidVarNameMessage('VALIDNAME', 1);
      expect(message).toContain('Invalid variable name');
      expect(message).toContain('Use only letters, numbers, and underscores');
    });
  });

  describe('getExitCodeDescription', () => {
    it('should describe exit code 0', () => {
      expect(getExitCodeDescription(0)).toContain('Success');
    });

    it('should describe exit code 1', () => {
      expect(getExitCodeDescription(1)).toContain('Missing variables');
    });

    it('should return unknown for invalid code', () => {
      expect(getExitCodeDescription(99)).toContain('Unknown');
    });
  });
});
