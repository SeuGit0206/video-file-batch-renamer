# Contributing Guidelines

Thank you for your interest in contributing to our project! We welcome community contributions, including bug reports, feature requests, documentation improvements, and pull requests.

Please read through these guidelines before submitting a contribution to ensure a smooth collaboration process.

---

## Code of Conduct & Community Guidelines

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md) to maintain a respectful, welcoming, and inclusive environment for all contributors and community members.

- **Be Respectful**: Treat all community members with courtesy and kindness regardless of background or experience level.
- **Constructive Discussion**: Focus feedback on ideas and technical solutions. Avoid personal criticisms or dismissive language.
- **Beginner Friendly**: We value questions and ideas from newcomers as much as from experienced maintainers.
- **Full Policy**: Please review [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for enforcement details and report procedures.

---

## Issue vs. Discussions Separation

To maintain project focus and rapid bug resolution, we separate discussions and work items clearly:

| Category | Channel | Purpose |
| :--- | :--- | :--- |
| 🐛 **Bug Reports** | [GitHub Issues](../../issues) | Reproducible defects, runtime crashes, and unexpected behavior |
| 💡 **Feature Proposals** | [GitHub Discussions (Ideas)](../../discussions) | New feature suggestions, rule additions, UI improvement ideas |
| ❓ **Questions & Support** | [GitHub Discussions (Q&A)](../../discussions) | Troubleshooting, setup help, configuration advice, usage questions |
| 💬 **General Chat & Showcase** | [GitHub Discussions (General / Show and tell)](../../discussions) | General commentary, workflow sharing, community intros |
| 🚀 **Announcements** | [GitHub Discussions (Announcements)](../../discussions) | Maintainer news, major release updates, and roadmap announcements |

---

## How to Contribute

### 1. Reporting Bugs

If you find a bug:
1. Check the existing [Issues](../../issues) to see if it has already been reported.
2. If not, open a new issue using the **Bug Report** template.
3. Provide clear steps to reproduce, expected vs. actual behavior, and environment details.

### 2. Suggesting Features

If you have an idea for an enhancement:
1. Search existing issues and pull requests to ensure it hasn't been proposed yet.
2. Open a new issue using the **Feature Request** template.
3. Clearly describe the problem, proposed solution, and potential alternatives.

### 3. Submitting Pull Requests

We love pull requests! To help us review and merge your changes efficiently, please follow these steps:

#### Prerequisites
- **Node.js**: v18 or higher
- **Package Manager**: `npm`

#### Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   npm install
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Code Quality & Testing Constraints**
   Before submitting your PR, ensure all checks pass locally:
   - **Linter**: `npm run lint` (Must pass with 0 errors and 0 warnings)
   - **Type Check & Build**: `npm run build`
   - **Unit & Component Tests**: `npm run test:unit` (All tests must pass)
   - **Playwright E2E Tests**: `npm run test:e2e` (All screen scenarios must pass)
   - **Coverage Verification**: `npm run test:coverage`

4. **Commit Guidelines**
   Use concise, descriptive commit messages:
   - `feat: add new feature`
   - `fix: resolve issue with metadata parsing`
   - `docs: update setup instructions in README`
   - `refactor: optimize caching adapter`

5. **Submit PR**
   - Push your branch to GitHub and create a Pull Request against `main`.
   - Fill out the **Pull Request Template** completely.
   - Maintain 100% backward compatibility with public APIs unless explicitly discussed.

---

## Architecture Principles

When contributing code to core packages:
- Respect **Clean Architecture** and **SOLID** design principles.
- Decouple interface definitions from concrete implementations.
- Register services via the `CompositionRoot` dependency injection container.
- Ensure zero regression in existing test suites.

Thank you for helping make this project better!
