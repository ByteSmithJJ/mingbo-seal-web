# 申请与审批模块 — 实现设计

> 设计日期：2026-06-01
> 状态：设计完成，待实现
> 后端：Spring Boot 3 + Flowable + MyBatis
> 前端：Vue 3 + Element Plus（Art Design Pro）

---

## 一、模块范围

| 子模块 | 说明 |
|--------|------|
| 发起审批 | 选择已部署的流程 → 填写表单 → 提交，创建流程实例 |
| 我的申请 | 我发起的申请列表，查看审批进度与详情，支持撤回 |
| 待审批 | 待我审批的列表，审批操作（通过/驳回/退回） |
| 已审批 | 我已审批的历史列表，查看详情 |

---

## 二、后端设计

### 2.1 新增数据库表（4 张）

按已有设计文档 `docs/design/seal-approval-system-design.md` 第 4.4 节的 DDL 执行建表：

- `biz_process_instance` — 流程实例运行时
- `biz_approval_record` — 审批记录
- `biz_seal_record` — 签章记录
- `biz_form_data` — 表单填写数据

### 2.2 Flowable 集成

- 添加 `flowable-spring-boot-starter` 依赖到 `pom.xml`
- 配置 Flowable 使用现有 `sealdb` 数据库，`ACT_*` 表启动时自动创建
- 流程部署：改造 `deployProcessDefinition`，调用 `RepositoryService.createDeployment()` 将 BPMN XML 部署到 Flowable，回写 `deployment_id`
- 流程启动：调用 `RuntimeService.startProcessInstanceById()` 创建 Flowable 实例，回写 `proc_inst_id` 到 `biz_process_instance`
- 任务完成：调用 `TaskService.complete(taskId, variables)` 驱动流程流转
- 流程变量：启动流程时将 `businessKey`（关联 biz 实例ID）作为流程变量传入，方便 TaskListener 中查询
- 撤回/驳回/退回通过 Flowable 的 `RuntimeService.deleteProcessInstance()` 或自定义逻辑实现

### 2.3 新增 API

#### 流程实例

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/process/instance/start` | 发起申请。Body: `{ definitionId, title, formData }`。创建实例、启动流程、保存表单数据 |
| GET | `/process/instance/myList` | 我的申请列表。Query: `{ pageNum, pageSize, status, beginTime, endTime }` |
| GET | `/process/instance/{instanceId}` | 实例详情。返回：实例信息 + 表单数据 + 审批记录列表 + 签章记录列表 |
| PUT | `/process/instance/{instanceId}/withdraw` | 撤回申请。仅审批中且无人审批时可撤回 |

#### 审批任务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/process/task/pending` | 待审批列表。Query: `{ pageNum, pageSize }`。通过 Flowable TaskService 查询 + 关联 biz 表 |
| PUT | `/process/task/{taskId}/approve` | 审批通过。Body: `{ comment }`。完成后检查节点 `allow_seal`，若为 Y 则自动创建签章记录 |
| PUT | `/process/task/{taskId}/reject` | 审批驳回。Body: `{ comment }`。终止流程 |
| PUT | `/process/task/{taskId}/return` | 审批退回。Body: `{ comment }`。退回上一节点 |
| GET | `/process/task/approved` | 已审批列表。Query: `{ pageNum, pageSize }` |

### 2.4 自动签章逻辑

```
审批通过 → 查询 biz_process_node WHERE node_code = 当前节点 AND allow_seal = 'Y'
  → 若存在：查 biz_seal_position WHERE form_template_id = 流程定义绑定的模板ID
    → 遍历位置配置，每条创建 biz_seal_record（instance_id, approval_record_id, seal_id, position_id, sealer = 审批人）
  → 若不存在：跳过
```

签章只在详情页展示（印章图片叠加在表单对应坐标上），不需要额外用户交互。

---

## 三、前端设计

### 3.1 路由规划

在 `src/router/modules/process.ts` 新增子路由：

```ts
// 发起申请
{ path: 'start', name: 'ProcessStart', component: '/process/start',
  meta: { title: 'menus.process.start', icon: 'ri:file-add-line', keepAlive: false, roles: ['admin'] } },
// 我的申请
{ path: 'my-applications', name: 'MyApplications', component: '/process/my-applications',
  meta: { title: 'menus.process.myApplications', icon: 'ri:file-list-3-line', keepAlive: true, roles: ['admin'] } },
// 申请详情
{ path: 'my-applications/:id', name: 'ApplicationDetail', component: '/process/application-detail',
  meta: { title: 'menus.process.applicationDetail', isHideTab: true } },
// 待审批
{ path: 'pending', name: 'PendingApproval', component: '/process/pending',
  meta: { title: 'menus.process.pending', icon: 'ri:task-line', keepAlive: true, roles: ['admin'] } },
// 已审批
{ path: 'approved', name: 'ApprovedHistory', component: '/process/approved',
  meta: { title: 'menus.process.approved', icon: 'ri:check-double-line', keepAlive: true, roles: ['admin'] } },
```

### 3.2 页面设计

#### 3.2.1 发起申请页 (`src/views/process/start/index.vue`)

三步向导或单页表单：
1. **选择流程**：下拉列表（仅显示已部署的流程定义），选中后显示流程名称、版本、描述
2. **填写表单**：根据流程绑定的 `form_template_id` 加载表单模板的 `form_config` JSON，使用 form-create 渲染器动态渲染可编辑表单
3. **提交**：输入流程标题，点击提交 → 调用 `POST /process/instance/start`

#### 3.2.2 我的申请页 (`src/views/process/my-applications/index.vue`)

- 使用 art-table 组件
- 列：业务编号、流程标题、流程名称、当前节点、状态（审批中/已通过/已驳回/已撤回）、申请时间
- 筛选条件：状态、时间范围
- 操作：查看详情、撤回（仅审批中显示）
- 点击行跳转详情页

#### 3.2.3 申请详情页 (`src/views/process/application-detail/index.vue`)

左右分栏布局：
- **左侧（70%）**：表单渲染（只读模式），印章图片在配置的 x/y 坐标处叠加显示（通过 `position: absolute` 定位印章 `<img>` 在表单容器上）
- **右侧（30%）**：审批时间线（el-timeline），展示每个节点的审批人、结果（通过/驳回/退回）、意见、时间、耗时

#### 3.2.4 待审批页 (`src/views/process/pending/index.vue`)

- 使用 art-table 组件
- 列：业务编号、流程标题、发起人、当前节点、申请时间
- 操作：审批（打开审批弹窗）
- **审批弹窗**：左侧表单只读 + 底部审批操作区（通过/驳回/退回三个按钮 + 审批意见 textarea）

#### 3.2.5 已审批页 (`src/views/process/approved/index.vue`)

- 使用 art-table 组件
- 列：业务编号、流程标题、发起人、审批结果、审批时间
- 操作：查看详情（复用申请详情页）

### 3.3 API 层

在 `src/api/process.ts` 新增接口函数和类型定义：

```ts
// 类型
export interface ProcessInstance {
  instanceId: number
  definitionId: number
  definitionName: string
  formTemplateId: number
  procInstId: string
  businessNo: string
  title: string
  status: string        // 0审批中 1已通过 2已驳回 3已撤回
  currentNodeCode: string
  currentNodeName: string
  applicant: string
  applyTime: string
  completeTime?: string
}

export interface ApprovalRecord {
  recordId: number
  instanceId: number
  taskId: string
  nodeCode: string
  nodeName: string
  approver: string
  result: string        // 0通过 1驳回 2退回
  comment: string
  approveTime: string
  costDuration: number
}

export interface SealRecord {
  sealRecordId: number
  instanceId: number
  approvalRecordId: number
  sealId: number
  sealName: string
  sealImage: string
  positionId: number
  posX: number
  posY: number
  sealWidth: number
  sealHeight: number
  sealer: string
  sealTime: string
}

export interface InstanceDetail {
  instance: ProcessInstance
  formData: Record<string, any>
  approvalRecords: ApprovalRecord[]
  sealRecords: SealRecord[]
}

// API 函数
export function startProcessInstance(data: { definitionId: number; title: string; formData: Record<string, any> })
export function fetchMyApplicationList(params: { pageNum: number; pageSize: number; status?: string })
export function fetchInstanceDetail(instanceId: number): Promise<InstanceDetail>
export function withdrawInstance(instanceId: number)

export function fetchPendingTaskList(params: { pageNum: number; pageSize: number })
export function approveTask(taskId: string, data: { comment: string })
export function rejectTask(taskId: string, data: { comment: string })
export function returnTask(taskId: string, data: { comment: string })
export function fetchApprovedTaskList(params: { pageNum: number; pageSize: number })
```

### 3.4 表单渲染组件

封装 `src/components/business/FormRender.vue`：

| Prop | 类型 | 说明 |
|------|------|------|
| `formConfig` | `object` | 表单设计器 JSON 配置 |
| `formData` | `object` | 表单填充数据（编辑模式为初始值，查看模式为已填写数据） |
| `mode` | `'edit' \| 'view'` | 编辑模式 / 只读模式 |
| `sealRecords` | `SealRecord[]` | 签章记录，view 模式下叠加印章图片 |

- 编辑模式：使用 form-create 渲染可交互表单
- 查看模式：渲染只读表单 + 根据 `sealRecords` 在表单容器上 `position: absolute` 叠加印章 PNG 图片

### 3.5 国际化

在 `zh.json` 和 `en.json` 的 `menus.process` 下新增：

```json
{
  "start": "发起申请",
  "myApplications": "我的申请",
  "applicationDetail": "申请详情",
  "pending": "待审批",
  "approved": "已审批"
}
```

---

## 四、审批规则

| 操作 | 效果 |
|------|------|
| 通过 | Flowable 任务完成 → 流程进入下一节点。若为最后一级，流程结束（状态=已通过）。若节点 `allow_seal=Y`，自动创建签章记录 |
| 驳回 | Flowable 流程终止 → 实例状态=已驳回 |
| 退回 | Flowable 任务退回上一节点，修改后可重新提交 |
| 撤回 | 仅审批中流程可撤回 → 实例状态=已撤回 → Flowable 实例删除 |

---

## 五、文件清单

### 后端新建

| 文件 | 说明 |
|------|------|
| `ruoyi-system/.../domain/BizProcessInstance.java` | 流程实例实体 |
| `ruoyi-system/.../domain/BizApprovalRecord.java` | 审批记录实体 |
| `ruoyi-system/.../domain/BizSealRecord.java` | 签章记录实体 |
| `ruoyi-system/.../domain/BizFormData.java` | 表单数据实体 |
| `ruoyi-system/.../mapper/BizProcessInstanceMapper.java` + `.xml` | 流程实例 Mapper |
| `ruoyi-system/.../mapper/BizApprovalRecordMapper.java` + `.xml` | 审批记录 Mapper |
| `ruoyi-system/.../mapper/BizSealRecordMapper.java` + `.xml` | 签章记录 Mapper |
| `ruoyi-system/.../mapper/BizFormDataMapper.java` + `.xml` | 表单数据 Mapper |
| `ruoyi-system/.../service/IBizProcessInstanceService.java` + `Impl` | 流程实例 Service |
| `ruoyi-system/.../service/IBizApprovalRecordService.java` + `Impl` | 审批记录 Service |
| `ruoyi-system/.../service/IBizSealRecordService.java` + `Impl` | 签章记录 Service |
| `ruoyi-system/.../service/IBizFormDataService.java` + `Impl` | 表单数据 Service |
| `ruoyi-admin/.../controller/process/BizProcessInstanceController.java` | 流程实例 Controller |
| `ruoyi-admin/.../controller/process/BizApprovalTaskController.java` | 审批任务 Controller |
| `ruoyi-system/.../listener/ApprovalTaskListener.java` | Flowable TaskListener 实现 |

### 前端新建

| 文件 | 说明 |
|------|------|
| `src/views/process/start/index.vue` | 发起申请页 |
| `src/views/process/my-applications/index.vue` | 我的申请页 |
| `src/views/process/application-detail/index.vue` | 申请详情页 |
| `src/views/process/pending/index.vue` | 待审批页 |
| `src/views/process/approved/index.vue` | 已审批页 |
| `src/components/business/FormRender.vue` | 表单渲染组件 |

### 前端修改

| 文件 | 修改内容 |
|------|---------|
| `src/api/process.ts` | 新增类型定义和 API 函数 |
| `src/router/modules/process.ts` | 新增 5 条子路由 |
| `src/locales/langs/zh.json` | 新增 i18n 菜单文案 |
| `src/locales/langs/en.json` | 新增 i18n 菜单文案 |
