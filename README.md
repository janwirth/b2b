# B2B 🎛️🎚️🎛️

✨ Write tests in human language (Gherkin) and verify program behavior with headless browser automation (Puppeteer).

🚀 Easy setup. No test-ids needed in your html - it reads the page like a human.

![Demo](https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExazBmem53ZGg0OW5jY2lwYXY0Nzl5NncyamlsNXV2ZmxtMDMzdDczMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5TCesEg1W2NHsWenYI/giphy.gif)

## Quick Start

1. 🌐 Start a server on localhost:3000
2. ⚡ Run `bun x @janwirth/b2b init`
   This will create an example feature file:

   ```gherkin
   Feature: Example

   Scenario: Example
     When I open localhost:3000
     Then I see "Hello, World!"
   ```

3. 👀 Run `bun x @janwirth/b2b watch` to start interactive mode
4. ✅ Run `bun x @janwirth/b2b run` to run all features

![Watch mode](https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHBrcGVuMjg5ODF0OWdiMDE4emlzbjZvemNscWsxcXM0NXp2emZqaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/U8YmUzgsHpysM1LExG/giphy.gif)

## Use Cases

- 🛡️ **Quality Assurance**: Prevent regression bugs. Avoid the "two steps forward, one step back" problem.

- 🗺️ **Design Handoff via (Happy) Path Mapping**: Map user journeys through UI designs. Gherkin files mirror design complexity and reveal user effort required.

- 🤝 **Client Handoff**: Demonstrate functionality with executable specifications. Clients see exactly how features work; requirement changes reflect immediately in test scenarios.

- 🤖 **AI-Assisted Engineering**: Natural language test scenarios work well with AI tools like Cursor. Unit tests fall short for long-running processes and UI testing. The structured Gherkin format helps AI understand requirements and suggest improvements.

## Features

- 📝 Feature parser
- 🏷️ Annotations `@skip` and `@focus`
- 📹 Screen recordings and failure screenshots
- 👀 Watch mode
- 🎯 Content-based element finding
- 👁️ OCR image processing

## Perspectives

- 🎬 Effortlessly record product demos for marketing purposes using the latest UI

## Creating new Features

I used this prompt to generate the mock reset step:

```
Let's use @tdd.mdc to create a new feature.

We need to have a step that pings an endpoint to reset the application for a testable state (clearing test-created data etc.)

The @mock-server.ts  should have some isCleared variable that is visible in an endpoint so that the test runner can verify it with I see

When I open localhost:3000/reset-status
Then I see "stale data"
When I ping localhost:3000/reset
And I reload
Then I see "cleared"
```
