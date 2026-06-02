# Build

## Prerequisites

- Node.js 22
- npm
- Python 3.11 for the repository verification runner

## Setup

```sh
npm ci
```

## Build

```sh
npm run build
```

## Run

```sh
npm run dev
```

For a production preview:

```sh
npm run build
npm run preview
```

## Common Failures

- If dependency commands fail before installing packages, run `npm ci`.
- Lighthouse uses a local static server through LHCI and requires Chrome/Chromium.
