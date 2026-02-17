# Multi-Proxy Management

`ihpp` allows you to manage multiple proxy targets simultaneously from a single instance.

## Proxy Configuration
Each proxy consists of:
- **Name**: A friendly identifier.
- **Listen Address**: The local port `ihpp` will listen on (e.g., `:8080`).
- **Target URL**: Where the traffic should be forwarded to.

## Dynamic Proxies
You can create proxies dynamically through the UI. These are kept in memory until you explicitly export them to your configuration file.

:::tip
Dynamic proxies are highlighted in the UI to remind you they are temporary.
:::

## Configuration File
Proxies can be persisted in a `.proxy.config.toml` file. This is the recommended way to manage long-term projects.

### [Screenshot Placeholder: Proxy Management Dashboard]
