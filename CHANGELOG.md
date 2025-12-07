# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.5] - 2025-12-07

### Added

#### New Features
- **JSON Output**: New `--json` flag for structured output compatible with CI/CD pipelines and automation tools
- **Quiet Mode**: New `--quiet` (or `-q`) flag for minimal output, showing only critical errors
- **Local Files Support**: New `--include-local` flag to validate `.env.local` files that are typically gitignored
- **Enhanced Exit Codes**: Specific exit codes (0-7) for different failure scenarios to enable better error handling in scripts

#### Improvements
- **Better Error Messages**: More descriptive warnings and errors with actionable suggestions
  - Invalid variable names now show valid format and suggestions
  - Security errors explain what was blocked and why
  - Missing variables show descriptions from .env.example comments
- **Improved Developer Experience**: More informative output helps developers fix issues faster

### Changed
- Error messages now include suggestions for fixing common issues
- Security warnings provide more context about blocked operations
- Updated CLI help text with new flags

### Documentation
- Added sections for JSON output, quiet mode, and local files support
- Updated comparison table with new features
- Added real-world examples for new flags

### Testing
- Added 12 new tests (101 tests total)
- 92%+ test coverage maintained
- New test files: formatter.test.ts, messages.test.ts

### License
- Changed from MIT to MIT + Commons Clause
- Non-commercial use license with attribution requirement
- Updated README and LICENSE files accordingly

---

## [0.4.0] - 2025-12-07

### Added

#### Security Hardening
- **Path Traversal Protection**: All file operations now validate paths to prevent access outside the project directory
- **Symlink Validation**: Detects and blocks malicious symlinks pointing to sensitive system files
- **File Size Limits**: Maximum file size of 10MB to prevent memory exhaustion attacks
- **ReDoS Protection**: Line length limits (10KB per line) prevent regex denial of service attacks
- **Variable Name Validation**: Enforces safe naming conventions and blocks dangerous names like `__PROTO__`
- **Content Validation**: Detects suspicious patterns including command injection attempts
- **Sanitized Error Messages**: Error messages no longer expose full system paths
- **Rate Limiting**: Limits file scanning to 50 files maximum in `--all` mode

#### New Module
- `src/core/validation.ts`: Comprehensive security validation module with 8 validation functions

#### Enhanced Features
- Debug mode: Set `DEBUG=true` to get detailed error information
- Improved error handling across all modules
- Better warning messages for security issues

### Changed
- Updated all core modules to use centralized validation
- Improved error messages to be more user-friendly
- Enhanced test coverage from 100% to 99.65% (with 89 tests)

### Security
- Fixed 7 security vulnerabilities:
  1. Path Traversal Attack (CRITICAL)
  2. Symlink Attack (CRITICAL)
  3. ReDoS (MEDIUM)
  4. Information Disclosure in Logs (MEDIUM)
  5. No File Size Limits (MEDIUM)
  6. Race Condition TOCTOU (LOW)
  7. No Variable Name Sanitization (LOW)

### Documentation
- Added comprehensive `SECURITY.md` with security policy and vulnerability details
- Updated `README.md` with security features section
- All source files updated to version 0.4.0

### Testing
- Added 45 new tests (from 44 to 89 tests)
- Created comprehensive test suite for validation module
- Added tests for all security features
- Coverage: 99.65% statements, 90.83% branches, 100% functions

---

## [0.3.0] - Previous Release

Initial public release with core functionality:
- Bidirectional .env analysis
- Multi-environment support
- Auto-fix functionality
- Template generation
- CI/CD mode
- Basic security checks

---

[0.4.5]: https://github.com/686f6c61/env-doctor-cli/compare/v0.4.0...v0.4.5
[0.4.0]: https://github.com/686f6c61/env-doctor-cli/compare/v0.3.0...v0.4.0
