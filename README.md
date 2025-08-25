# Caplin SDET Techinical Tests

This project contains automated tests for the London Stock Exchange using Playwright with TypeScript and the Page Object Pattern.

## Requirements

- **Node.js**: download node.js (https://nodejs.org/en/download/)
- **npm**: Comes bundled with Node.js
- **Playwright**: Installed via `npm init playwright@latest`

## Installation

- Clone the repository
- Install dependencies:
    npm install, 
    node.js
- Install playwright:
    npm init playwright@latest

## Running Tests

### Headless mode 
- npx playwright test - for all tests
- npx playwright test ftse.spec.ts - for particular file
### Headed mode
- npx playwright test --headed

### Run using specific browser
- npx playwright test iplayer.spec.ts --project chromium

### Run using specific tag
- npx playwright test iplayer.spec.ts --grep @regression

## View Test Report
- npx playwright show-report

## Playwright Configuration

- **Playwright Config**: The configuration file (`playwright.config.ts`) contains settings for browsers, test retries, failed test screenshots and failed test videos

## ESLint

- ESLint is configured in this project to ensure code quality and consistency. It is set up to work with TypeScript and Playwright.

### Installation

To install ESLint and its dependencies, run:
- npm install eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin --save-dev

### Configuration

- The ESLint is configured in eslint.config.mjs file where we define set of rules like unused variables, console warnings and explicit any

### Run

- npx eslint .

## Project Structure

- **pages/**: Contains Page Object classes for different pages (e.g., `homePage.ts`, `ftse100Page.ts`)
- **tests/**: Contains test files (e.g., `ftse.spec.ts`)
- **README.md**: Documentation for the project