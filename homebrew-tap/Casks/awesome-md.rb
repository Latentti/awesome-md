cask "awesome-md" do
  version "1.0.0"
  sha256 "3d729224ab9a9980001345312c42eaa81d12227baa696cba593fd056f23221c1"

  url "https://github.com/Latentti/awesome-md/releases/download/v#{version}/awesome-md-#{version}-universal.dmg"
  name "awesome-md"
  desc "Read-only Markdown viewer for macOS, optimized for AI-powered development workflows"
  homepage "https://github.com/Latentti/awesome-md"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: ">= :ventura"

  app "awesome-md.app"
  binary "#{appdir}/awesome-md.app/Contents/MacOS/awesome-md", target: "awesome-md"

  zap trash: [
    "~/Library/Application Support/awesome-md",
    "~/Library/Caches/awesome-md",
    "~/Library/Preferences/com.electron.awesome-md.plist",
    "~/Library/Saved Application State/com.electron.awesome-md.savedState",
    "~/Library/Logs/awesome-md",
  ]

  caveats <<~EOS
    awesome-md is not currently code-signed or notarized.
    On first launch, macOS Gatekeeper may block the app.
    To allow it, run:
      xattr -d com.apple.quarantine /Applications/awesome-md.app
    Or right-click the app in Finder and select "Open".
  EOS
end
