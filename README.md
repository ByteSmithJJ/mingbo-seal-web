<h1 align="center">MingBo Seal Web</h1>
<p align="center">
  Enterprise E-Seal & Approval Workflow Platform · Frontend
</p>
<p align="center">
  A modern open-source admin system built with Vue 3, TypeScript, Element Plus, and Tailwind CSS
</p>

<div align="center">English | <a href="./README.zh-CN.md">简体中文</a></div>

<br />

<div align="center">

[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE) [![github stars](https://img.shields.io/github/stars/ByteSmithJJ/mingbo-seal-web)](https://github.com/ByteSmithJJ/mingbo-seal-web/stargazers) [![github forks](https://img.shields.io/github/forks/ByteSmithJJ/mingbo-seal-web)](https://github.com/ByteSmithJJ/mingbo-seal-web/network/members)

</div>

<br />

## Overview

MingBo Seal Web is the frontend of the MingBo e-signature and approval workflow platform. It delivers **full seal lifecycle management**, **visual BPMN-based approval process design**, and **fine-grained role-based access control** — enabling organizations to rapidly digitize their seal and approval operations.

> 🔗 **Backend Service**: [mingbo-seal-server](https://github.com/ByteSmithJJ/mingbo-seal-server) — Spring Boot 3 + Flowable Engine

### Key Features

- 🔐 **Seal Management** — Create, bind, authorize, revoke, and destroy seals with full lifecycle oversight
- 📋 **Approval Workflow** — Visual BPMN process designer supporting countersign, or-sign, conditional branches, and more
- 👥 **Access Control** — Three-tier permission model (menu, button, data) with flexible role + auth-code combinations
- 🎨 **Modern UI** — Light/dark themes, four menu layouts, seven accent colors — aesthetics meet productivity
- ⚡ **Developer Friendly** — Built-in utilities like useTable, ArtForm, and ArtSearchBar for rapid development
- 🌍 **i18n Ready** — Chinese and English out of the box, easily extensible to other languages
- 🧹 **Clean Start** — One-command cleanup script to strip demo content and get a production-ready scaffold

## Tech Stack

| Category       | Technology                                      |
| -------------- | ----------------------------------------------- |
| Framework      | Vue 3 (Composition API), TypeScript 5.6, Vite 7 |
| UI Library     | Element Plus 2, Tailwind CSS 4                  |
| State          | Pinia 3 (with persistence)                      |
| Routing        | Vue Router 4 (Hash mode)                        |
| HTTP           | Axios (JWT auth, auto-refresh)                  |
| Process Design | BPMN.js                                         |
| Code Quality   | ESLint, Prettier, Stylelint, Husky, Commitlint  |

## Quick Start

### Prerequisites

- **Node.js** >= 20.19.0
- **pnpm** >= 8.8.0

### Installation

```bash
# Clone the repository
git clone https://github.com/ByteSmithJJ/mingbo-seal-web.git
cd mingbo-seal-web

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open `http://localhost:3006` in your browser.

### Production Build

```bash
pnpm build    # Type-check + production bundle
pnpm serve    # Preview the build locally
```

### Clean Version

Strip all demo content and get a minimal starter scaffold:

```bash
pnpm clean:dev
```

## Project Structure

```
mingbo-seal-web/
├── src/
│   ├── api/              # API layer
│   ├── assets/           # Static assets (images, styles, SVGs)
│   ├── components/       # Components
│   │   ├── core/         # Reusable core (tables, forms, layouts)
│   │   └── business/     # Business-specific components
│   ├── config/           # Global config (themes, menus, colors)
│   ├── hooks/            # Composables (useTable, useChart, etc.)
│   ├── locales/          # i18n (zh-CN / en)
│   ├── router/           # Routes (static + dynamic permission-based)
│   ├── store/            # Pinia stores
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── views/            # Page components
├── .github/              # GitHub templates & CI workflows
├── docs/                 # Design docs
├── scripts/              # Build scripts (incl. clean:dev)
├── .env                  # Environment variables
├── package.json
└── vite.config.ts
```

## Permission Model

Two permission modes (switch via `VITE_ACCESS_MODE` env variable):

- **Frontend mode** (`frontend`): Menus and permissions are defined statically in route configs
- **Backend mode** (`backend`): Menus and permissions are delivered dynamically by the backend API

Built-in `v-auth` and `v-roles` directives for fine-grained UI element control.

## Browser Support

Latest two versions of Chrome, Edge, Safari, and Firefox.

## Acknowledgments

This project is built upon the following excellent open source projects:

| Project | Purpose | License |
| --- | --- | --- |
| **[Art Design Pro](https://github.com/Daymychen/art-design-pro)** | High-Quality Frontend Template | MIT |
| **[Vue](https://github.com/vuejs/core)** | Frontend Framework | MIT |
| **[TypeScript](https://github.com/microsoft/TypeScript)** | Type System | Apache 2.0 |
| **[Vite](https://github.com/vitejs/vite)** | Build Tool | MIT |
| **[Element Plus](https://github.com/element-plus/element-plus)** | UI Component Library | MIT |
| **[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)** | Utility-First CSS Framework | MIT |
| **[Pinia](https://github.com/vuejs/pinia)** | State Management | MIT |
| **[Vue Router](https://github.com/vuejs/router)** | Routing | MIT |
| **[Axios](https://github.com/axios/axios)** | HTTP Client | MIT |
| **[ECharts](https://github.com/apache/echarts)** | Data Visualization | Apache 2.0 |
| **[Vue I18n](https://github.com/intlify/vue-i18n)** | Internationalization | MIT |
| **[Iconify](https://github.com/iconify/iconify)** | Icon Library | MIT |
| **[BPMN.js](https://github.com/bpmn-io/bpmn-js)** | Process Designer | Custom License |
| **[VueUse](https://github.com/vueuse/vueuse)** | Composition Utilities | MIT |
| **[ESLint](https://github.com/eslint/eslint)** | Linting | MIT |
| **[Prettier](https://github.com/prettier/prettier)** | Code Formatting | MIT |

## Contributing

We warmly welcome contributions of all kinds!

- 📖 [Contributing Guide](./CONTRIBUTING.md) — Setup & PR workflow
- 📝 [Code of Conduct](./CODE_OF_CONDUCT.md) — Community standards
- 🔒 [Security Policy](./SECURITY.md) — Vulnerability reporting

## License

This project is open-sourced under the [MIT License](./LICENSE).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ByteSmithJJ/mingbo-seal-web&type=Date)](https://www.star-history.com/#ByteSmithJJ/mingbo-seal-web&Date)
