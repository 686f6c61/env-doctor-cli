# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.4.x   | YES       |
| 0.3.x   | YES       |
| < 0.3   | NO        |

## Security Enhancements in v0.4.x

Version 0.4.0 introduced comprehensive security hardening to protect against common attack vectors when processing `.env` files. Version 0.4.5 adds enhanced error messages, JSON output for CI/CD integration, and improved exit codes for better automation security.

### Path Traversal Protection

**Issue:** Previous versions were vulnerable to path traversal attacks that could allow reading/writing files outside the project directory.

**Example Attack:**
```bash
npx env-doctor -t "../../../etc/passwd" -e "malicious.example"
```

**Fix:**
All file paths are now validated using `validatePath()` which:
- Normalizes paths to prevent `../` traversal
- Ensures all file operations stay within the project directory
- Rejects paths containing null bytes (`\0`)

**Implementation:** See `src/core/validation.ts:validatePath()`

---

### Symlink Attack Prevention

**Issue:** Symbolic links could point to files outside the project, bypassing path restrictions.

**Example Attack:**
```bash
ln -s /etc/passwd .env
npx env-doctor --fix  # Could overwrite /etc/passwd
```

**Fix:**
The tool now validates symlinks using `validateSymlink()` which:
- Detects symbolic links using `fs.lstatSync()`
- Resolves symlink targets with `fs.realpathSync()`
- Ensures resolved paths remain within the project directory

**Implementation:** See `src/core/validation.ts:validateSymlink()`

---

### File Size Limits

**Issue:** No limits on file size could lead to memory exhaustion (OOM) attacks.

**Example Attack:**
```bash
dd if=/dev/zero of=.env bs=1G count=10  # 10GB file
npx env-doctor  # Process crashes
```

**Fix:**
File size is now validated before processing:
- Maximum file size: **10MB** (configurable via `MAX_FILE_SIZE`)
- Files exceeding the limit are rejected with a clear error message

**Implementation:** See `src/core/validation.ts:validateFileSize()`

---

### ReDoS Protection

**Issue:** Extremely long lines could cause Regular Expression Denial of Service.

**Example Attack:**
```bash
# Create .env with lines > 1MB
VARIABLE=${"a".repeat(1000000)}=value
```

**Fix:**
Line length is validated during parsing:
- Maximum line length: **10KB** (configurable via `MAX_LINE_LENGTH`)
- Lines exceeding the limit are skipped with a warning
- Prevents catastrophic backtracking in regex operations

**Implementation:** See `src/core/parser.ts:45-50`

---

### Variable Name Validation

**Issue:** Invalid or dangerous variable names could cause unexpected behavior.

**Fix:**
Variable names are now validated using `validateVarName()`:
- Must start with a letter or underscore
- Can only contain letters, numbers, and underscores
- Rejects dangerous names like `__PROTO__`, `CONSTRUCTOR`, `PROTOTYPE`

**Valid:** `PORT`, `API_KEY`, `DB_HOST`, `_PRIVATE`
**Invalid:** `123VAR`, `VAR-NAME`, `VAR.NAME`, `__PROTO__`

**Implementation:** See `src/core/validation.ts:validateVarName()`

---

### Suspicious Content Detection

**Issue:** Environment values could contain malicious code injections.

**Fix:**
Values are scanned for suspicious patterns:
- Command substitution: `$(command)`, `` `command` ``
- Script tags: `<script>`
- Dangerous commands: `; rm`, `&& rm`, `|| rm`

Suspicious content triggers a warning but doesn't block operation (allowing legitimate use cases).

**Implementation:** See `src/core/validation.ts:checkSuspiciousContent()`

---

### Sanitized Error Messages

**Issue:** Error messages could expose sensitive system paths.

**Before:**
```
Error reading file /home/user/secret/project/.env: ENOENT
```

**After:**
```
Error with .env
```

**Fix:**
All error messages are sanitized using `sanitizeErrorMessage()`:
- Only shows the filename, not the full path
- Full details available in `DEBUG=true` mode
- Prevents information disclosure in production

**Implementation:** See `src/core/validation.ts:sanitizeErrorMessage()`

---

### Rate Limiting (--all mode)

**Issue:** Scanning directories with thousands of `.env` files could cause performance issues.

**Fix:**
The `--all` flag now limits file scanning:
- Maximum files processed: **50** (configurable via `MAX_FILES_SCAN`)
- Excess files trigger a warning and are skipped
- Users are directed to process specific files instead

**Implementation:** See `src/core/scanner.ts:24-29`

---

### Race Condition Fixes

**Issue:** TOCTOU (Time-of-check to time-of-use) vulnerability in file operations.

**Before:**
```typescript
if (fs.existsSync(path)) {
  content = fs.readFileSync(path);  // File could be deleted/modified here
}
```

**After:**
```typescript
try {
  content = fs.readFileSync(path);
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
  content = '';
}
```

**Implementation:** See `src/core/fixer.ts:30-45`

---

## Security Best Practices

### For Users

1. **Always use `.gitignore`**
   Ensure your `.env` files are ignored to prevent accidental commits:
   ```gitignore
   .env
   .env.*
   !.env.example
   ```

2. **Use `--ci` mode in CI/CD**
   Prevents interactive prompts and enforces strict validation:
   ```bash
   npx env-doctor --ci
   ```

   Use `--json` for programmatic parsing in automation:
   ```bash
   npx env-doctor --json
   ```

3. **Limit file permissions**
   The tool automatically sets `.env` files to `0600` (owner read/write only) when using `--fix`.

4. **Review generated files**
   Always review `.env.example` files generated with `--generate` to ensure no secrets were leaked.

5. **Use specific exit codes**
   Version 0.4.5 introduces specific exit codes (0-7) for different failure scenarios, enabling better error handling in automation:
   - 0: Success
   - 1: Missing variables
   - 2: Extra variables
   - 3: Security warning
   - 4: File not found
   - 5: Invalid arguments
   - 6: Permission denied
   - 7: File size exceeded

### For Contributors

1. **Never disable validation**
   Security validations should not be bypassed or made optional.

2. **Test security features**
   All new file operations must include security tests (see `test/unit/validation.test.ts`).

3. **Follow the principle of least privilege**
   Only request file permissions when absolutely necessary.

4. **Sanitize all user input**
   Never trust file paths, variable names, or values from user input.

---

## Reporting a Vulnerability

If you discover a security vulnerability in env-doctor-cli, please report it by:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer at the repository's security contact
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

You should receive a response within 48 hours. If the vulnerability is confirmed, we will:
- Release a patch within 7 days for critical issues
- Credit you in the release notes (if desired)
- Notify users via GitHub Security Advisories

---

## Security Checklist

Before releasing a new version, ensure:

- [ ] All tests pass (`npm test`)
- [ ] Coverage remains above 99% (`npm test -- --coverage`)
- [ ] No new `npm audit` vulnerabilities
- [ ] All file operations use `validateFile()`
- [ ] Error messages are sanitized
- [ ] Input validation is comprehensive
- [ ] Documentation is updated
- [ ] All source files have MIT + Commons Clause license header
- [ ] Version numbers updated in all files

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated:** 2025-12-07
**Version:** 0.4.5
