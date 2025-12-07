# env-doctor-cli

[![npm version](https://img.shields.io/npm/v/env-doctor-cli.svg)](https://www.npmjs.com/package/env-doctor-cli)
[![License: MIT+CC](https://img.shields.io/badge/License-MIT%2BCommons%20Clause-blue.svg)](https://github.com/686f6c61/env-doctor-cli/blob/main/LICENSE)

> **"The ESLint for your .env files"**

## The Problem

How many times have you pulled code from a repository only to find that the application crashes because a new environment variable was added but not documented? Or deployed to production and discovered that a critical API key was missing from your `.env` file? Managing environment variables across development, staging, and production environments is a universal challenge that every development team faces.

Traditional solutions require manual comparison between `.env` and `.env.example` files, which is error-prone and time-consuming. Most teams discover missing variables only after deployment failures, costing valuable time and potentially affecting users.

## The Solution

**env-doctor-cli** is a zero-configuration CLI tool that acts like ESLint for your environment files. It automatically detects missing, extra, or misconfigured environment variables before they cause problems. The tool validates your `.env` files against `.env.example` templates, ensuring perfect synchronization across all environments and team members.

Beyond basic validation, version 0.4.0+ introduces enterprise-grade security features that protect against common attack vectors like path traversal, symlink exploits, and code injection attempts. This makes it suitable not just for development teams, but for production-critical applications where security is paramount.

## Comparison with Alternatives

When evaluating environment variable management tools, it's important to understand not just what they do, but how comprehensively they solve the problem. While several tools exist in the ecosystem, most focus on a single aspect (validation OR generation OR type checking), leaving gaps in your workflow.

**env-doctor-cli** takes a holistic approach, combining validation, generation, security hardening, and developer experience into a single tool. The comparison below highlights how we stack up against the most popular alternatives in the Node.js ecosystem:

| Feature | env-doctor-cli | dotenv-safe | envalid | sync-dotenv |
| :--- | :---: | :---: | :---: | :---: |
| **Missing Variable Detection** | [YES] | [YES] | [YES] | [YES] |
| **Interactive Auto-Fix** | [YES] | [NO] | [NO] | [NO] |
| **Template Generation** | [YES] | [NO] | [NO] | [YES] |
| **Multi-environment Scan** | [YES] | [NO] | [NO] | [NO] |
| **Security Checks (.gitignore)** | [YES] | [NO] | [NO] | [NO] |
| **Path Traversal Protection** | [YES] | [NO] | [NO] | [NO] |
| **File Size Validation** | [YES] | [NO] | [NO] | [NO] |
| **Content Injection Detection** | [YES] | [NO] | [NO] | [NO] |
| **Contextual Documentation** | [YES] | [NO] | [NO] | [NO] |
| **Zero Config Setup** | [YES] | [NO] | [NO] | [NO] |
| **CI/CD Ready** | [YES] | [YES] | [YES] | [YES] |
| **JSON Output** | [YES] | [NO] | [NO] | [NO] |
| **Quiet Mode** | [YES] | [NO] | [NO] | [NO] |
| **Local Files Support** | [YES] | [NO] | [NO] | [NO] |

## Features

The following features work together to create a comprehensive environment management solution. Each feature addresses a specific pain point in the development workflow, from initial project setup through CI/CD pipelines to production deployments:

*   **Bidirectional Analysis**: Compares your local `.env` file against `.env.example` to detect missing or extra variables.
*   **Multi-environment Support**: Automatically scans and validates all `.env.*` files in your project directory.
*   **Contextual Documentation**: Extracts comments from your example file to display helpful descriptions for missing variables.
*   **Security Checks**: Verifies that your environment files are properly ignored in `.gitignore` to prevent secret leaks.
*   **Auto-Fix**: Automatically appends missing variables to your target file (with interactive confirmation).
*   **Template Generation**: Generates a sanitized `.env.example` file from your current `.env`, preserving structure but removing secrets.
*   **CI/CD Mode**: Optimized output for Continuous Integration pipelines with strict exit codes.
*   **Security Hardening (v0.4.0+)**: Protection against path traversal, symlink attacks, ReDoS, and malicious content injection.

## Installation

The tool can be installed as a development dependency (recommended for team projects) or run directly via `npx` for one-off checks. Installing as a dev dependency allows you to integrate it into your package.json scripts and ensure all team members use the same version.

**Install as development dependency (recommended):**

```bash
npm install -D env-doctor-cli
```

**Run directly without installation:**

```bash
npx env-doctor-cli
```

Once installed, the tool is available via the `env-doctor` command. You can verify the installation by running `npx env-doctor --version`.

## Usage

The tool is designed to fit seamlessly into your existing workflow, whether you're working locally, collaborating with a team, or deploying through CI/CD pipelines. All commands follow intuitive naming conventions and provide helpful output to guide you through any issues discovered.

Below are the most common use cases, from basic validation to advanced workflows:

### Basic Validation

The most common use case is validating your local `.env` file against the project's `.env.example` template. This ensures you have all required variables configured before running the application. The tool will display a detailed report showing which variables are missing, which are extra (possibly obsolete), and the synchronization percentage.

```bash
npx env-doctor
```

The output includes helpful context from comments in your `.env.example` file, making it easy to understand what each missing variable is for.

### Multi-environment Validation

Many projects maintain separate environment files for different contexts (development, testing, staging, production). Rather than validating each file individually, the `--all` flag automatically discovers and validates every environment file in your project. This is particularly useful for ensuring consistency across all environments before deployment.

```bash
npx env-doctor --all
```

The tool automatically excludes template files like `.env.example`, `.env.template`, and `.env.sample`, focusing only on actual environment configurations. For safety, it limits scanning to 50 files maximum to prevent resource exhaustion.

### Automatic Repair

When the tool detects missing variables, manually copying them from `.env.example` can be tedious and error-prone, especially when dealing with many variables. The `--fix` flag automates this process by intelligently appending missing variables to your target file, preserving the original structure and including helpful comments from the template.

```bash
npx env-doctor --fix
```

Before making any changes, the tool shows you exactly what will be added and prompts for confirmation (unless running in CI mode). Added variables are clearly marked with a comment header, making it easy to identify and configure them. The tool sets secure file permissions (0600) automatically to protect sensitive data.

### Template Generation

Creating a `.env.example` file from scratch is tedious, and manually sanitizing an existing `.env` file risks accidentally committing secrets. The `--generate` flag solves this by automatically creating a safe template file that preserves your structure, comments, and non-sensitive values while removing anything that looks like a secret.

```bash
npx env-doctor --generate
```

The tool uses intelligent pattern matching to identify sensitive variables (anything with "KEY", "SECRET", "PASSWORD", "TOKEN", etc. in the name) and empties their values. Non-sensitive configuration like `PORT=3000` or `NODE_ENV=development` is preserved, giving new developers helpful defaults. The generated file maintains the exact structure of your original, including all comments and empty lines.

### Continuous Integration (CI/CD)

In automated environments like GitHub Actions or GitLab CI, you need deterministic behavior, clear exit codes, and no interactive prompts. The `--ci` flag is specifically designed for these scenarios, providing machine-readable output and failing fast if any validation errors are detected.

```bash
npx env-doctor --ci
```

In CI mode, the tool disables colors, suppresses interactive confirmations, and exits with code 1 on any failure. This makes it perfect for gating deployments on environment variable validation. The concise output is also ideal for CI logs, focusing on errors rather than verbose success messages.

### JSON Output for Automation

For programmatic parsing and CI/CD integration, you can output results in JSON format instead of human-readable tables.

```bash
npx env-doctor --json
```

This outputs structured JSON that can be easily parsed by scripts, monitoring tools, or CI/CD pipelines:

```json
{
  "status": "fail",
  "sync_percentage": 85.7,
  "missing": ["API_KEY", "DATABASE_URL"],
  "extra": ["OLD_FEATURE_FLAG"],
  "total_in_example": 14,
  "total_in_target": 12,
  "file_checked": ".env",
  "template": ".env.example"
}
```

**Use cases:**
- Parse results in CI/CD pipelines
- Send notifications to Slack/Discord with missing variables
- Generate reports in monitoring dashboards
- Block deployments based on specific conditions

### Quiet Mode

For minimal output in logs or when you only care about errors, use the `--quiet` or `-q` flag.

```bash
npx env-doctor --quiet
```

In quiet mode:
- No colored output
- No tables or visual formatting
- Only critical errors are shown
- Exit code still indicates status

**Example output:**

```bash
# Success (no output)
$ npx env-doctor --quiet
$ echo $?
0

# Failure (minimal output)
$ npx env-doctor --quiet
Missing: API_KEY, DB_HOST
$ echo $?
1
```

### Local Files Support

Many projects use `.env.local` files for developer-specific overrides that should not be committed. By default, env-doctor ignores these files, but you can include them in validation.

```bash
npx env-doctor --include-local
```

**What gets checked:**

Without `--include-local` (default):
- ✓ `.env`, `.env.development`, `.env.production`
- ✗ `.env.local`, `.env.development.local` (ignored)

With `--include-local`:
- ✓ All .env files including `.env.local` variants

**Note:** Local files are typically gitignored and contain developer-specific configuration. Only validate them if you need to ensure all developers have the correct local setup.

## CLI Options Reference

The tool provides a comprehensive set of options to handle different workflows and edge cases. All options can be combined (except when they conflict logically, like `--fix` and `--generate`). The table below documents every available option:

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--target <file>` | `-t` | The target environment file to check. | `.env` |
| `--example <file>` | `-e` | The template/example file to compare against. | `.env.example` |
| `--all` | `-a` | Automatically scan and check all `.env*` files found. | `false` |
| `--fix` | `-f` | Automatically add missing variables to the target file. | `false` |
| `--generate` | `-g` | Generate a `.env.example` file from the target file. | `false` |
| `--json` | | **NEW** Output results in JSON format for parsing. | `false` |
| `--quiet` | `-q` | **NEW** Minimal output, only show errors. | `false` |
| `--include-local` | | **NEW** Include `.env.local` files in validation. | `false` |
| `--ci` | | Enable strict CI mode (no colors, no interaction). | `false` |
| `--no-colors` | | Disable colored output in the terminal. | `false` |
| `--version` | `-V` | Show current version number. | |
| `--help` | `-h` | Display help information. | |

## Real-World Examples

These examples demonstrate common scenarios you'll encounter when managing environment variables in production applications. Each example is taken from real-world usage patterns.

**Validate a specific environment file:**

When working with multiple environments, you often need to validate a specific configuration against the template.

```bash
npx env-doctor -t .env.production -e .env.example
```

**Generate a template from production configuration:**

After making changes to production variables, you may want to update the template for other team members.

```bash
npx env-doctor -t .env.production -g
```

**Add this to your package.json scripts:**

Integrate validation into your development workflow for consistent team practices.

```json
{
  "scripts": {
    "env:check": "env-doctor",
    "env:check:all": "env-doctor --all",
    "env:fix": "env-doctor --fix",
    "prestart": "env-doctor"
  }
}
```

**Integrate with CI/CD pipeline (GitHub Actions):**

Prevent deployments with missing or misconfigured environment variables.

```yaml
steps:
  - uses: actions/checkout@v3
  - name: Install dependencies
    run: npm ci
  - name: Validate environment variables
    run: npx env-doctor --ci
  - name: Run tests
    run: npm test
```

## Testing & Quality Assurance

Quality is not optional for a tool that handles security-critical configuration. This project maintains **99.65% test coverage** across all core modules, with particular emphasis on security validation logic. We use Jest for unit testing with 89 comprehensive test cases that verify both happy paths and edge cases.

The test suite includes:
- Security attack simulations (path traversal, symlink attacks, ReDoS)
- File system edge cases (permissions, missing files, race conditions)
- Parser robustness (malformed files, encoding issues, edge cases)
- Integration scenarios (multi-file validation, auto-fix workflows)

**Run the complete test suite:**

```bash
npm test
```

**View detailed coverage report:**

```bash
npm test -- --coverage
```

Our high coverage standards ensure that every security feature and validation rule works as intended, giving you confidence that the tool won't miss critical issues.

## Security Hardening (v0.4.0+)

Environment files often contain sensitive credentials and API keys, making them attractive targets for attacks. Version 0.4.0 introduced comprehensive security hardening that protects against both accidental misuse and malicious exploitation. These protections are transparent to normal usage but activate automatically when suspicious patterns are detected.

**What's Protected:**

- **Path Traversal Protection** - Validates all file paths to prevent access outside the project directory. Blocks attempts like `../../../etc/passwd` or null byte injection.

- **Symlink Validation** - Detects and blocks symbolic links that point to files outside your project, preventing privilege escalation attacks where a malicious `.env` symlink could expose system files.

- **File Size Limits** - Enforces a 10MB maximum file size to prevent memory exhaustion attacks that could crash your development environment or CI/CD pipeline.

- **ReDoS Protection** - Limits individual lines to 10KB to prevent Regular Expression Denial of Service attacks that could hang the parser indefinitely.

- **Content Injection Detection** - Scans variable values for suspicious patterns like command substitution (`$(...)`, backticks), script tags, or dangerous shell commands. Warns without blocking to allow legitimate use cases.

- **Variable Name Validation** - Enforces standard environment variable naming conventions (alphanumeric + underscore, must start with letter/underscore) and blocks dangerous names like `__PROTO__` or `CONSTRUCTOR`.

- **Sanitized Error Messages** - Never exposes full system paths in error messages, preventing information disclosure that could aid attackers. Debug details are available via `DEBUG=true` when needed.

- **Rate Limiting** - Limits `--all` mode to scanning 50 files maximum, preventing resource exhaustion if run in a directory with thousands of files.

**Security is opt-out, not opt-in.** All protections are active by default without requiring configuration. For complete security details, vulnerability reporting procedures, and the security policy, see [SECURITY.md](https://github.com/686f6c61/env-doctor-cli/blob/main/SECURITY.md).

## Why This Tool Exists

This project was born from frustration with the fragmented state of environment variable management in Node.js. Existing tools either focused narrowly on validation OR generation OR type checking, requiring teams to cobble together multiple solutions. None addressed the security implications of handling sensitive configuration files.

The goal was to create a single tool that handles the complete lifecycle: from generating templates, to validating configurations, to fixing issues, all while maintaining enterprise-grade security standards. The result is a tool that's simple enough for small projects yet robust enough for production-critical applications.

## Contributing

Contributions are welcome! Whether you're reporting bugs, suggesting features, or submitting pull requests, please see the [GitHub repository](https://github.com/686f6c61/env-doctor-cli) for contribution guidelines.

For security-related issues, please follow the responsible disclosure process outlined in [SECURITY.md](https://github.com/686f6c61/env-doctor-cli/blob/main/SECURITY.md).

## Author & Support

**Developed by 686f6c61**

- GitHub: [@686f6c61](https://github.com/686f6c61)
- Repository: [env-doctor-cli](https://github.com/686f6c61/env-doctor-cli)
- Issues: [Report bugs or request features](https://github.com/686f6c61/env-doctor-cli/issues)

If this tool saves you time or prevents production issues, consider starring the repository on GitHub. It helps others discover the tool and motivates continued development.

## License

This project is licensed under the **MIT License + Commons Clause**.

**What this means:**
- [YES] Free to use for personal, educational, and internal business purposes
- [YES] Free to modify and adapt to your needs
- [YES] Free to share and redistribute (with attribution)
- [NO] Cannot be sold or used to provide commercial services
- [REQUIRED] Must credit the original author: **686f6c61**

For the complete license terms, see the [LICENSE](https://github.com/686f6c61/env-doctor-cli/blob/main/LICENSE) file.

For commercial licensing inquiries, please open an issue on GitHub.
