# 发起申请页面重设计

> 日期：2026-06-02
> 状态：已确认，待实现

## 目标

将当前简陋的下拉框选择流程页面，改为卡片画廊式浏览体验，参考钉钉/飞书 OA 发起流程的交互模式。

## 设计

### 两步交互

1. **浏览阶段**：卡片网格展示所有已部署流程（status=1），顶部搜索栏按名称过滤
2. **发起阶段**：点击卡片「发起流程」按钮 → 弹窗填写标题 + 动态表单 → 提交

### 页面结构

- **搜索栏**：流程名称输入框 + 搜索/重置按钮
- **卡片网格**：24 格响应式（xs=24, sm=12, md=8, lg=6），每张卡片含图标、名称、版本号、备注描述、发起按钮
- **空状态**：无已部署流程时显示 ElEmpty
- **加载态**：数据加载中显示 loading
- **发起弹窗**：600px 宽，含流程标题输入框 + 可选 FormRender 表单

### 技术要点

- 复用现有 `ArtSearchBar`、`ElCard`、`ElDialog`、`FormRender` 组件
- 复用现有 API：`fetchProcessDefinitionList`、`fetchProcessDefinitionDetail`、`startProcessInstance`、`fetchTemplateDetail`
- 路由不变：`/process/start`
