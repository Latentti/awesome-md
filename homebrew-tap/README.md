# Homebrew Tap for awesome-md

Read-only Markdown viewer for macOS, optimized for AI-powered development workflows.

## Installation

```bash
brew tap Latentti/awesome-md
brew install --cask awesome-md
```

Or install directly in one command:

```bash
brew install --cask Latentti/awesome-md/awesome-md
```

## Usage

```bash
awesome-md --dir /path/to/project --title "My Project"
```

## Upgrade

```bash
brew upgrade --cask awesome-md
```

## Uninstall

```bash
brew uninstall --cask awesome-md
```

## Note on Gatekeeper

awesome-md is not currently code-signed or notarized. On first launch, macOS Gatekeeper may block the app. To allow it:

```bash
xattr -d com.apple.quarantine /Applications/awesome-md.app
```

Or right-click the app in Finder and select "Open".
