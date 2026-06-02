module.exports = {
  ci: {
    collect: {
      staticDistDir: "dist",
      url: ["http://localhost/"],
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --user-data-dir=/tmp/popyson-io-lhci-chrome",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["warn", { minScore: 0.8 }],
        "categories:best-practices": ["warn", { minScore: 0.8 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".tmp/lhci",
    },
  },
};
