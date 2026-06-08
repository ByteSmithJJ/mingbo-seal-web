# 贡献指南

感谢您考虑为 MingBo Seal Web 做出贡献！以下是一些指导原则，帮助您顺利参与项目开发。

## 行为准则

本项目采用 [Contributor Covenant 行为准则](./CODE_OF_CONDUCT.md)。参与即表示您同意遵守其条款。

## 如何贡献

### 报告 Bug

1. 在 [Issues](https://github.com/ByteSmithJJ/mingbo-seal-web/issues) 中搜索，确认 Bug 未被报告过
2. 使用 Bug Report 模板创建新 Issue
3. 提供详细的重现步骤、环境信息和期望行为

### 功能建议

1. 在 [Issues](https://github.com/ByteSmithJJ/mingbo-seal-web/issues) 中搜索，确认该功能未被建议过
2. 使用 Feature Request 模板创建新 Issue
3. 描述功能的使用场景和期望效果

### 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 稳定发布分支，仅通过 PR 从 `dev` 合入，禁止直推 |
| `dev` | 日常开发集成分支，所有功能分支从此拉出并合回 |

### 提交代码

1. **Fork** 本项目
2. 从 `dev` 分支创建您的 feature 分支：
   ```bash
   git checkout dev
   git checkout -b feature/your-feature
   ```
3. 进行代码修改
4. 确保代码通过检查：
   ```bash
   pnpm lint       # ESLint 检查
   pnpm build      # 类型检查 + 构建
   ```
5. 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范提交：
   ```bash
   pnpm commit     # 使用 cz-git 交互式提交
   ```
6. 推送到您的仓库并提交 Pull Request **到 `dev` 分支**

## 开发环境

### 前置要求

- **Node.js** >= 20.19.0
- **pnpm** >= 8.8.0

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/ByteSmithJJ/mingbo-seal-web.git
cd mingbo-seal-web

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 代码风格

本项目使用统一的代码规范工具：

- **Prettier** — 代码格式化（无分号、单引号、2空格缩进）
- **ESLint** — JavaScript/TypeScript/Vue 代码检查
- **Stylelint** — CSS/SCSS 样式检查

提交前会自动运行 lint-staged 检查，也可以手动运行：

```bash
pnpm lint:prettier    # 格式化所有文件
pnpm fix              # ESLint 自动修复
pnpm lint:stylelint   # Stylelint 自动修复
```

## Commit 规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，使用 `cz-git` 辅助提交：

- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构
- `style`: 代码格式调整
- `docs`: 文档更新
- `chore`: 构建/工具变更

## PR 审核流程

1. 维护者会审核您的 PR
2. CI 检查必须全部通过
3. 可能会要求修改或补充
4. 审核通过后合并到 `dev` 分支，后续由维护者将 `dev` 合并到 `main` 并发布

## 项目结构

```
src/
  api/              # API 接口定义
  assets/           # 静态资源（图片、样式）
  components/       # 组件
    core/           # 核心可复用组件
    business/       # 业务组件
  config/           # 全局配置
  hooks/            # 组合式函数
  locales/          # 国际化
  router/           # 路由
  store/            # 状态管理
  types/            # TypeScript 类型
  utils/            # 工具函数
  views/            # 页面组件
```

## 许可证

贡献的代码将采用 [MIT License](./LICENSE) 开源。
