# 印章审批系统 — 设计方案

> 设计日期：2026-05-26
> 状态：设计完成，待实现
> 后端：Spring Boot 3 + Flowable + MyBatis
> 前端：Vue 3 + Element Plus（Art Design Pro）

---

## 一、业务概述

业务人员登录系统 → 选择已部署的审批流程 → 填写表单 → 提交启动流程 → 逐级审批 → 每级审批通过后可在指定位置加盖电子印章。

**关键技术选型：**

| 组件 | 选型 |
|------|------|
| 表单设计器 | 开源表单设计器（待定） |
| 流程引擎 | Flowable（`ACT_*` 表管底层流转，`biz_*` 表管业务层） |
| 流程设计器 | BPMN 设计器（在线画流程，生成 BPMN 2.0 XML） |
| 签章方式 | 表单上指定 x/y 坐标加盖印章图片（PNG 透明底） |

**Flowable 与 biz 表的分工：**

| 层 | 职责 | 表 |
|----|------|-----|
| Flowable 引擎层 | BPMN 部署/解析、流程流转、任务分配、历史归档 | `ACT_RE_*` `ACT_RU_*` `ACT_HI_*` |
| 业务层 | 印章、表单模板、签章坐标、节点业务配置、审批意见、签章记录 | `biz_*` |

关联方式：`biz_process_definition.deployment_id` → Flowable 部署ID，`biz_process_instance.proc_inst_id` → Flowable 流程实例ID，`biz_approval_record.task_id` → Flowable 任务ID。

---

## 二、系统功能模块

### 1. 印章管理

| 子模块 | 说明 |
|--------|------|
| 印章信息管理 | CRUD，印章图片（PNG 透明底）、名称、编号、类型（公章/合同章/财务章/法人章/部门章等）、启用/停用 |
| 印章授权管理 | 授权对象类型（部门/角色/岗位/用户），授权类型（管理权/申请权/使用权），有效期 |
| 印章位置配置 | 独立功能页面：选择表单 → 回显表单内容 → 输入 x/y 坐标 → 预览盖章位置 → 保存。一个印章在一个表单上可以有多个盖章位置 |

### 2. 表单模板管理

| 子模块 | 说明 |
|--------|------|
| 表单设计 | 集成开源表单设计器，拖拽设计表单 |
| 表单模板 CRUD | 保存表单 JSON 结构到数据库 |
| 表单版本管理 | 修改后生成新版本，已启动的流程不受影响 |

### 3. 流程管理（完整生命周期）

| 子模块 | 说明 |
|--------|------|
| 流程设计 | BPMN 设计器在线画流程；开始节点绑定表单；用户任务节点指定审批人/角色；各节点设置表单字段可见/可编辑；设置审批后是否允许签章 |
| 流程部署 | 设计好的流程发布为可用版本，支持版本管理，已部署的流程才能被发起 |
| 流程定义列表 | 查看/编辑/部署/停用/删除流程定义 |

### 4. 申请与审批（四大核心功能）

| 子模块 | 说明 |
|--------|------|
| 发起审批 | 选择已部署的流程 → 填写表单 → 提交，创建流程实例 |
| 我的申请 | 我发起的申请列表，查看审批进度，支持撤回 |
| 待审批 | 待我审批的列表，查看表单 → 审批（通过/驳回/退回）→ 审批后签章 |
| 已审批 | 我已审批的历史列表 |

### 5. 流程监控

| 子模块 | 说明 |
|--------|------|
| 流程实例列表 | 全部实例，筛选进行中/已完成/已驳回 |
| 审批进度追踪 | 流程图高亮显示当前所在节点 |
| 签章记录查询 | 查看流程中所有的盖章记录 |

---

## 三、审批规则

- **通过**：进入下一级审批节点；若为最后一级，则流程结束（已完成）
- **驳回**：流程立即终止（已驳回），发起人可查看驳回原因
- **退回**：退回到上一节点，修改后可重新提交

---

## 四、数据库表设计（DDL）

> 所有表遵循 RuoYi 现有规范：bigint(20) 自增主键、create_by/create_time/update_by/update_time 审计字段、char(1) 状态位、InnoDB 引擎、utf8mb4 字符集。

### 复用现有表

| 现有关联表 | 业务中使用场景 |
|-----------|--------------|
| `sys_user` | 发起人、审批人、印章管理员 |
| `sys_role` | 审批节点指定角色、印章授权对象 |
| `sys_dept` | 印章授权对象、审批人所在部门 |
| `sys_post` | 印章授权对象（岗位类型） |
| `sys_dict_type` / `sys_dict_data` | 印章类型、授权类型等字典值 |

### 4.1 印章管理（3 张表）

```sql
-- ----------------------------
-- 1、印章信息表
-- ----------------------------
drop table if exists biz_seal;
create table biz_seal (
  seal_id           bigint(20)      not null auto_increment    comment '印章ID',
  seal_name         varchar(64)     not null                   comment '印章名称',
  seal_code         varchar(64)     not null                   comment '印章编号（唯一）',
  seal_type         varchar(20)     default ''                 comment '印章类型（字典: seal_type）',
  seal_image        varchar(500)    default ''                 comment '印章图片路径（PNG透明底）',
  status            char(1)         default '0'                comment '状态（0启用 1停用）',
  create_by         varchar(64)     default ''                 comment '创建者',
  create_time       datetime                                   comment '创建时间',
  update_by         varchar(64)     default ''                 comment '更新者',
  update_time       datetime                                   comment '更新时间',
  remark            varchar(500)    default null               comment '备注',
  primary key (seal_id),
  unique key uk_seal_code (seal_code)
) engine=innodb auto_increment=100 comment = '印章信息表';

-- ----------------------------
-- 2、印章授权表
-- ----------------------------
drop table if exists biz_seal_authorization;
create table biz_seal_authorization (
  auth_id           bigint(20)      not null auto_increment    comment '授权ID',
  seal_id           bigint(20)      not null                   comment '印章ID',
  target_type       varchar(20)     not null                   comment '授权对象类型（dept/role/post/user）',
  target_id         bigint(20)      not null                   comment '授权对象ID',
  auth_type         varchar(20)     not null                   comment '授权类型（manage/apply/use）',
  begin_time        datetime                                   comment '授权开始时间',
  end_time          datetime                                   comment '授权结束时间（null表示永久）',
  status            char(1)         default '0'                comment '状态（0启用 1停用）',
  create_by         varchar(64)     default ''                 comment '创建者',
  create_time       datetime                                   comment '创建时间',
  update_by         varchar(64)     default ''                 comment '更新者',
  update_time       datetime                                   comment '更新时间',
  remark            varchar(500)    default null               comment '备注',
  primary key (auth_id),
  key idx_seal_id (seal_id),
  key idx_target (target_type, target_id)
) engine=innodb auto_increment=100 comment = '印章授权表';

-- ----------------------------
-- 3、印章位置配置表
-- ----------------------------
drop table if exists biz_seal_position;
create table biz_seal_position (
  position_id       bigint(20)      not null auto_increment    comment '位置ID',
  seal_id           bigint(20)      not null                   comment '印章ID',
  form_template_id  bigint(20)      not null                   comment '表单模板ID',
  position_name     varchar(64)     default ''                 comment '位置名称（如"落款处"）',
  pos_x             decimal(10,2)   default 0                  comment 'X坐标（相对表单左上角，px）',
  pos_y             decimal(10,2)   default 0                  comment 'Y坐标（相对表单左上角，px）',
  seal_width        int(4)          default 120                comment '印章显示宽度（px）',
  seal_height       int(4)          default 120                comment '印章显示高度（px）',
  page_no           int(4)          default 1                  comment '所在页码',
  sort              int(4)          default 0                  comment '排序号',
  create_by         varchar(64)     default ''                 comment '创建者',
  create_time       datetime                                   comment '创建时间',
  update_by         varchar(64)     default ''                 comment '更新者',
  update_time       datetime                                   comment '更新时间',
  remark            varchar(500)    default null               comment '备注',
  primary key (position_id),
  key idx_seal_id (seal_id),
  key idx_form_template_id (form_template_id)
) engine=innodb auto_increment=100 comment = '印章位置配置表';
```

### 4.2 表单模板（1 张表）

```sql
-- ----------------------------
-- 4、表单模板表
-- ----------------------------
drop table if exists biz_form_template;
create table biz_form_template (
  template_id       bigint(20)      not null auto_increment    comment '模板ID',
  template_name     varchar(100)    not null                   comment '模板名称',
  template_key      varchar(64)     not null                   comment '模板唯一标识',
  form_config       longtext        default null               comment '表单设计器JSON结构',
  version           int(4)          default 1                  comment '版本号',
  status            char(1)         default '0'                comment '状态（0草稿 1已发布 2已停用）',
  del_flag          char(1)         default '0'                comment '删除标志（0存在 2删除）',
  create_by         varchar(64)     default ''                 comment '创建者',
  create_time       datetime                                   comment '创建时间',
  update_by         varchar(64)     default ''                 comment '更新者',
  update_time       datetime                                   comment '更新时间',
  remark            varchar(500)    default null               comment '备注',
  primary key (template_id),
  unique key uk_template_key (template_key, version)
) engine=innodb auto_increment=100 comment = '表单模板表';
```

### 4.3 流程管理（2 张表）

```sql
-- ----------------------------
-- 5、流程定义表
-- ----------------------------
drop table if exists biz_process_definition;
create table biz_process_definition (
  definition_id     bigint(20)      not null auto_increment    comment '定义ID',
  definition_name   varchar(100)    not null                   comment '流程名称',
  definition_key    varchar(64)     not null                   comment '流程唯一标识',
  bpmn_xml          longtext        default null               comment 'BPMN 2.0 XML',
  form_template_id  bigint(20)      default null               comment '开始节点绑定的表单模板ID',
  deployment_id     varchar(64)     default ''                 comment 'Flowable部署ID',
  version           int(4)          default 1                  comment '版本号',
  status            char(1)         default '0'                comment '状态（0草稿 1已部署 2已停用）',
  del_flag          char(1)         default '0'                comment '删除标志（0存在 2删除）',
  create_by         varchar(64)     default ''                 comment '创建者',
  create_time       datetime                                   comment '创建时间',
  update_by         varchar(64)     default ''                 comment '更新者',
  update_time       datetime                                   comment '更新时间',
  remark            varchar(500)    default null               comment '备注',
  primary key (definition_id),
  unique key uk_definition_key (definition_key, version)
) engine=innodb auto_increment=100 comment = '流程定义表';

-- ----------------------------
-- 6、流程节点配置表
-- ----------------------------
drop table if exists biz_process_node;
create table biz_process_node (
  node_id           bigint(20)      not null auto_increment    comment '节点ID',
  definition_id     bigint(20)      not null                   comment '所属流程定义ID',
  node_code         varchar(64)     not null                   comment 'BPMN节点ID（如Activity_1a2b3c）',
  node_name         varchar(100)    default ''                 comment '节点显示名称（如"部门经理审批"）',
  node_type         varchar(20)     default ''                 comment '节点类型（start/userTask/gateway/end）',
  assignee_type     varchar(20)     default ''                 comment '审批人类型（user/role/initiator）',
  assignee_value    varchar(500)    default ''                 comment '审批人值（user_id或role_id，多个逗号分隔）',
  form_visible      char(1)         default 'Y'                comment '表单是否可见（Y是 N否）',
  form_editable     char(1)         default 'N'                comment '表单是否可编辑（Y是 N否）',
  allow_seal        char(1)         default 'N'                comment '审批通过后是否允许签章（Y是 N否）',
  sort              int(4)          default 0                  comment '节点排序号',
  create_by         varchar(64)     default ''                 comment '创建者',
  create_time       datetime                                   comment '创建时间',
  update_by         varchar(64)     default ''                 comment '更新者',
  update_time       datetime                                   comment '更新时间',
  primary key (node_id),
  key idx_definition_id (definition_id)
) engine=innodb auto_increment=100 comment = '流程节点配置表';
```

### 4.4 流程实例 & 审批 & 签章（4 张表）

```sql
-- ----------------------------
-- 7、流程实例表
-- ----------------------------
drop table if exists biz_process_instance;
create table biz_process_instance (
  instance_id       bigint(20)      not null auto_increment    comment '实例ID',
  definition_id     bigint(20)      not null                   comment '所属流程定义ID',
  definition_name   varchar(100)    default ''                 comment '流程名称（冗余）',
  form_template_id  bigint(20)      default null               comment '表单模板ID',
  proc_inst_id      varchar(64)     default ''                 comment 'Flowable流程实例ID',
  business_no       varchar(64)     not null                   comment '业务编号（唯一）',
  title             varchar(200)    default ''                 comment '流程标题',
  status            char(1)         default '0'                comment '流程状态（0审批中 1已通过 2已驳回 3已撤回 4已终止）',
  current_node_code varchar(64)     default ''                 comment '当前所在节点code',
  current_node_name varchar(100)    default ''                 comment '当前所在节点名称',
  applicant         varchar(64)     default ''                 comment '发起人（user_name）',
  applicant_dept_id bigint(20)      default null               comment '发起人所属部门ID',
  apply_time        datetime                                   comment '申请时间',
  complete_time     datetime                                   comment '完成时间',
  create_by         varchar(64)     default ''                 comment '创建者',
  create_time       datetime                                   comment '创建时间',
  update_by         varchar(64)     default ''                 comment '更新者',
  update_time       datetime                                   comment '更新时间',
  primary key (instance_id),
  unique key uk_business_no (business_no),
  unique key uk_proc_inst_id (proc_inst_id),
  key idx_applicant (applicant),
  key idx_status (status),
  key idx_definition_id (definition_id)
) engine=innodb auto_increment=100 comment = '流程实例表';

-- ----------------------------
-- 8、审批记录表
-- ----------------------------
drop table if exists biz_approval_record;
create table biz_approval_record (
  record_id         bigint(20)      not null auto_increment    comment '记录ID',
  instance_id       bigint(20)      not null                   comment '流程实例ID',
  task_id           varchar(64)     default ''                 comment 'Flowable任务ID',
  node_code         varchar(64)     default ''                 comment '审批节点code',
  node_name         varchar(100)    default ''                 comment '审批节点名称',
  approver          varchar(64)     default ''                 comment '审批人（user_name）',
  approver_dept_id  bigint(20)      default null               comment '审批人所属部门ID',
  result            char(1)         default '0'                comment '审批结果（0通过 1驳回 2退回）',
  comment           varchar(1000)   default ''                 comment '审批意见',
  approve_time      datetime                                   comment '审批时间',
  cost_duration     bigint(20)      default 0                  comment '耗时（毫秒）',
  create_time       datetime                                   comment '创建时间（任务到达时间）',
  primary key (record_id),
  key idx_instance_id (instance_id),
  key idx_approver (approver),
  key idx_task_id (task_id)
) engine=innodb auto_increment=100 comment = '审批记录表';

-- ----------------------------
-- 9、签章记录表
-- ----------------------------
drop table if exists biz_seal_record;
create table biz_seal_record (
  seal_record_id    bigint(20)      not null auto_increment    comment '签章记录ID',
  instance_id       bigint(20)      not null                   comment '流程实例ID',
  approval_record_id bigint(20)     not null                   comment '关联审批记录ID',
  seal_id           bigint(20)      not null                   comment '印章ID',
  position_id       bigint(20)      not null                   comment '印章位置配置ID',
  sealer            varchar(64)     default ''                 comment '盖章人（user_name）',
  seal_time         datetime                                   comment '盖章时间',
  create_by         varchar(64)     default ''                 comment '创建者',
  create_time       datetime                                   comment '创建时间',
  primary key (seal_record_id),
  key idx_instance_id (instance_id),
  key idx_approval_record_id (approval_record_id),
  key idx_seal_id (seal_id)
) engine=innodb auto_increment=100 comment = '签章记录表';
```

### 4.5 表单数据（1 张表）

```sql
-- ----------------------------
-- 10、表单数据表
-- ----------------------------
drop table if exists biz_form_data;
create table biz_form_data (
  data_id           bigint(20)      not null auto_increment    comment '数据ID',
  instance_id       bigint(20)      not null                   comment '流程实例ID（一对一）',
  template_id       bigint(20)      default null               comment '表单模板ID',
  form_data         longtext        default null               comment '表单填写数据JSON',
  create_by         varchar(64)     default ''                 comment '创建者（发起人）',
  create_time       datetime                                   comment '创建时间',
  update_by         varchar(64)     default ''                 comment '更新者',
  update_time       datetime                                   comment '更新时间',
  primary key (data_id),
  unique key uk_instance_id (instance_id)
) engine=innodb auto_increment=100 comment = '表单数据表';
```

---

## 五、ER 关系总览

```
sys_user ────────────────────────────────────────────────────┐
sys_role ────────────────────────────────────────────────┐   │
sys_dept ────────────────────────────────────────────┐   │   │
sys_post ────────────────────────────────────────┐   │   │   │
                                                  │   │   │   │
  ┌────────────────────────────────────────────────┼───┼───┼───┼──┐
  │ biz_seal_authorization                        │   │   │   │  │
  │ (target_type + target_id → 上述表id)          │   │   │   │  │
  └──────────┬─────────────────────────────────────┼───┼───┼───┼──┘
             │                                    │   │   │   │
  ┌──────────▼──────┐                             │   │   │   │
  │ biz_seal        │                             │   │   │   │
  └──────┬──────────┘                             │   │   │   │
         │                                        │   │   │   │
  ┌──────▼────────────┐                           │   │   │   │
  │ biz_seal_position │                           │   │   │   │
  │ → form_template_id│                           │   │   │   │
  └──────┬────────────┘                           │   │   │   │
         │                                        │   │   │   │
  ┌──────▼──────────┐    ┌──────────────────────┐ │   │   │   │
  │ biz_seal_record │←───│ biz_approval_record  │ │   │   │   │
  └─────────────────┘    │ → task_id (Flowable) │ │   │   │   │
                         └──────┬───────────────┘ │   │   │   │
                                │                 │   │   │   │
  ┌─────────────────────────────▼─────────────────┘   │   │   │
  │ biz_process_instance                             │   │   │
  │ → proc_inst_id (Flowable)                        │   │   │
  │ → applicant (sys_user)                           │   │   │
  │ → applicant_dept_id (sys_dept)                   │   │   │
  └──────┬──────────────┬────────────────────────────┘   │   │
         │              │                                │   │
  ┌──────▼──────┐  ┌────▼────────────────┐               │   │
  │ biz_form_data│  │ biz_process_       │               │   │
  │ (instance_id)│  │ definition         │               │   │
  └──────────────┘  │ → deployment_id    │               │   │
                    │ → form_template_id │               │   │
                    └──────┬─────────────┘               │   │
                           │                             │   │
                    ┌──────▼──────────┐                  │   │
                    │ biz_process_node│                  │   │
                    └─────────────────┘                  │   │
                                                        │   │
  ┌─────────────────────────────────────────────────────┘   │
  │ biz_form_template                                      │
  └────────────────────────────────────────────────────────┘
```

---

## 六、汇总

| # | 表名 | 所属模块 | 用途 |
|---|------|---------|------|
| 1 | `biz_seal` | 印章管理 | 印章基本信息 |
| 2 | `biz_seal_authorization` | 印章管理 | 印章授权（灵活绑定 dept/role/post/user） |
| 3 | `biz_seal_position` | 印章管理 | 印章在表单上的盖章位置坐标 |
| 4 | `biz_form_template` | 表单模板 | 表单设计 JSON + 版本号 |
| 5 | `biz_process_definition` | 流程管理 | BPMN XML + 绑定表单 + Flowable 部署ID |
| 6 | `biz_process_node` | 流程管理 | BPMN 节点解析后的审批配置 |
| 7 | `biz_process_instance` | 流程实例 | 运行中的流程实例 + Flowable 实例ID |
| 8 | `biz_approval_record` | 审批记录 | 每级审批的处理记录 + Flowable 任务ID |
| 9 | `biz_seal_record` | 签章记录 | 审批后的盖章记录 |
| 10 | `biz_form_data` | 表单数据 | 提交的表单填写数据 JSON |

**Flowable 关联字段总结：**

| biz 表 | Flowable 关联字段 | 说明 |
|--------|-----------------|------|
| `biz_process_definition` | `deployment_id` | 部署后回写 |
| `biz_process_instance` | `proc_inst_id` | 启动流程后回写 |
| `biz_approval_record` | `task_id` | 任务完成后回写 |
