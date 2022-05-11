# TakeShape Netlify build plugin

Automatically create and configure a [TakeShape](https://www.takeshape.io/) project for use with your Netlify site.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/takeshape/netlify-plugin-takeshape)

The plugin will
- create a TakeShape project for your Netlify site, if it does not exist already
- (optional) import a [pattern](https://app.takeshape.io/docs/import-export/patterns) when creating the project
- create read-only and read-write API keys for the project and add them to the build environment
- in subsequent builds, deploy any changes to your pattern's `schema.json` file, if present

## Installation

### File-based configuration

Add the following to your `netlify.toml` file:
```toml
[[plugins]]
  package = "@takeshape/netlify-plugin-takeshape"

  # Optional: specify the timzeone for your TakeShape project (defaults to "America/New_York")
  [plugins.imports]
    timezone = "America/Los_Angeles"
```

Then, add the package as a dev dependency:
```
npm install -D @takeshape/netlify-plugin-takeshape
```

### Environment variables

1. Create a new [personal access token](https://app.takeshape.io/personal-access-tokens).
2. In the Netlify UI, go to **Site settings > Build & deploy > Environment > Environment variables** and set the personal access token as the value of the `TAKESHAPE_ACCESS_TOKEN` environment variable.

Refer to the [Netlify docs](https://docs.netlify.com/configure-builds/environment-variables/) for further information about configuring environment variables.

## Before building

If you wish to create your TakeShape project from a [pattern](https://app.takeshape.io/docs/import-export/patterns), add the `schema.json` and any other pattern files to a `.takeshape/pattern` directory in the repository for your Netlify site. The build plugin will import the pattern when creating your project and, in subsequent builds, will deploy any changes to your `.takeshape/pattern/schema.json` file.

## Authenticating your Netlify site with TakeShape

The plugin will automatically create API keys for your TakeShape project and add them to the Netlify build as the `TAKESHAPE_READ_ONLY_API_KEY` and `TAKESHAPE_READ_WRITE_KEY` environment variables. Refer to the [Netlify docs](https://docs.netlify.com/configure-builds/environment-variables/#access-variables) for instructions for accessing environment variables either during or after the build.