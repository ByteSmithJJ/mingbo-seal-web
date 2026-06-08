# 申请与审批模块 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现印章审批系统的申请与审批完整闭环——发起申请、我的申请、待审批、已审批四个子模块，集成 Flowable 流程引擎。

**Architecture:** Flowable 引擎(ACT_*) 驱动底层流程流转，biz_* 表管理业务数据(表单、审批记录、签章记录)。后端新加 2 个 Controller（ProcessInstanceController、ApprovalTaskController），前端新建 5 个页面 + 1 个表单渲染组件。

**Tech Stack:** Spring Boot 3 + Flowable + MyBatis (后端), Vue 3 + Element Plus + form-create (前端)

**Backend project:** `F:\ideaWork\seal-approval-server`
**Frontend project:** `F:\webstromWork\seal-approval-web`

---

## 文件结构总览

### 后端新建（16个文件）

```
ruoyi-admin/src/main/java/com/ruoyi/web/controller/seal/
  BizProcessInstanceController.java    # 流程实例 API
  BizApprovalTaskController.java       # 审批任务 API

ruoyi-system/src/main/java/com/ruoyi/system/domain/
  BizProcessInstance.java              # 流程实例实体
  BizApprovalRecord.java               # 审批记录实体
  BizSealRecord.java                   # 签章记录实体
  BizFormData.java                     # 表单数据实体

ruoyi-system/src/main/java/com/ruoyi/system/mapper/
  BizProcessInstanceMapper.java        # 流程实例 Mapper
  BizApprovalRecordMapper.java         # 审批记录 Mapper
  BizSealRecordMapper.java             # 签章记录 Mapper
  BizFormDataMapper.java               # 表单数据 Mapper

ruoyi-system/src/main/resources/mapper/system/
  BizProcessInstanceMapper.xml
  BizApprovalRecordMapper.xml
  BizSealRecordMapper.xml
  BizFormDataMapper.xml

ruoyi-system/src/main/java/com/ruoyi/system/service/
  IBizProcessInstanceService.java
  IBizApprovalRecordService.java
  IBizSealRecordService.java
  IBizFormDataService.java

ruoyi-system/src/main/java/com/ruoyi/system/service/impl/
  BizProcessInstanceServiceImpl.java
  BizApprovalRecordServiceImpl.java
  BizSealRecordServiceImpl.java
  BizFormDataServiceImpl.java

ruoyi-system/src/main/java/com/ruoyi/system/listener/
  ApprovalTaskListener.java           # Flowable TaskListener
```

### 后端修改（2个文件）

```
ruoyi-system/src/main/java/com/ruoyi/system/service/impl/BizProcessDefinitionServiceImpl.java
  # 修改 deployDefinition() → 真正部署 BPMN XML 到 Flowable

pom.xml (根目录或 ruoyi-admin)
  # 添加 flowable-spring-boot-starter 依赖
```

### 前端新建（6个文件）

```
src/views/process/start/index.vue               # 发起申请
src/views/process/my-applications/index.vue      # 我的申请
src/views/process/application-detail/index.vue   # 申请详情
src/views/process/pending/index.vue             # 待审批
src/views/process/approved/index.vue            # 已审批
src/components/business/FormRender.vue           # 表单渲染组件
```

### 前端修改（3个文件）

```
src/api/process.ts              # 新增类型 + API 函数
src/router/modules/process.ts   # 新增 5 条子路由
src/locales/langs/zh.json       # 新增 i18n
src/locales/langs/en.json       # 新增 i18n
```

---

## Phase 1: 后端基础（数据库 + 实体 + Mapper + Service）

### Task 1: 加 Flowable 依赖

**Files:**
- Modify: `F:\ideaWork\seal-approval-server\ruoyi-admin\pom.xml` (或根 pom.xml)

- [ ] **Step 1: 在根 pom.xml 的 `<properties>` 中添加版本号**

```xml
<flowable.version>7.0.0</flowable.version>
```

- [ ] **Step 2: 在 ruoyi-admin/pom.xml 中添加依赖**

```xml
<dependency>
  <groupId>org.flowable</groupId>
  <artifactId>flowable-spring-boot-starter-process</artifactId>
  <version>${flowable.version}</version>
</dependency>
```

- [ ] **Step 3: 在 ruoyi-admin/src/main/resources/application.yml 中添加 Flowable 配置**

```yaml
flowable:
  database-schema-update: true
  async-executor-activate: false
  dmn:
    enabled: false
  cmmn:
    enabled: false
```

- [ ] **Step 4: 启动后端验证 Flowable 自动创建 ACT_* 表**

Run: `mvn -f F:\ideaWork\seal-approval-server spring-boot:run`
Expected: 控制台无报错，`sealdb` 中出现 `ACT_RE_*`、`ACT_RU_*`、`ACT_HI_*` 等表。

---

### Task 2: 执行 DDL 创建 4 张 business 表

- [ ] **Step 1: 连接 sealdb 执行建表 SQL**

```sql
CREATE TABLE `biz_process_instance` (
  `instance_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '实例ID',
  `definition_id` bigint(20) NOT NULL COMMENT '所属流程定义ID',
  `definition_name` varchar(100) DEFAULT '' COMMENT '流程名称',
  `form_template_id` bigint(20) DEFAULT NULL COMMENT '表单模板ID',
  `proc_inst_id` varchar(64) DEFAULT '' COMMENT 'Flowable流程实例ID',
  `business_no` varchar(64) NOT NULL COMMENT '业务编号',
  `title` varchar(200) DEFAULT '' COMMENT '流程标题',
  `status` char(1) DEFAULT '0' COMMENT '流程状态（0审批中 1已通过 2已驳回 3已撤回 4已终止）',
  `current_node_code` varchar(64) DEFAULT '' COMMENT '当前所在节点code',
  `current_node_name` varchar(100) DEFAULT '' COMMENT '当前所在节点名称',
  `applicant` varchar(64) DEFAULT '' COMMENT '发起人',
  `applicant_dept_id` bigint(20) DEFAULT NULL COMMENT '发起人部门ID',
  `apply_time` datetime DEFAULT NULL COMMENT '申请时间',
  `complete_time` datetime DEFAULT NULL COMMENT '完成时间',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`instance_id`),
  KEY `idx_definition_id` (`definition_id`),
  KEY `idx_applicant` (`applicant`),
  KEY `idx_status` (`status`),
  KEY `idx_proc_inst_id` (`proc_inst_id`),
  KEY `idx_business_no` (`business_no`)
) ENGINE=InnoDB AUTO_INCREMENT=100 COMMENT='流程实例表';

CREATE TABLE `biz_approval_record` (
  `record_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `instance_id` bigint(20) NOT NULL COMMENT '流程实例ID',
  `task_id` varchar(64) DEFAULT '' COMMENT 'Flowable任务ID',
  `node_code` varchar(64) DEFAULT '' COMMENT '审批节点code',
  `node_name` varchar(100) DEFAULT '' COMMENT '审批节点名称',
  `approver` varchar(64) DEFAULT '' COMMENT '审批人',
  `approver_dept_id` bigint(20) DEFAULT NULL COMMENT '审批人部门ID',
  `result` char(1) DEFAULT '0' COMMENT '审批结果（0通过 1驳回 2退回）',
  `comment` varchar(1000) DEFAULT '' COMMENT '审批意见',
  `approve_time` datetime DEFAULT NULL COMMENT '审批时间',
  `cost_duration` bigint(20) DEFAULT 0 COMMENT '耗时（毫秒）',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`record_id`),
  KEY `idx_instance_id` (`instance_id`),
  KEY `idx_approver` (`approver`),
  KEY `idx_task_id` (`task_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 COMMENT='审批记录表';

CREATE TABLE `biz_seal_record` (
  `seal_record_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '签章记录ID',
  `instance_id` bigint(20) NOT NULL COMMENT '流程实例ID',
  `approval_record_id` bigint(20) NOT NULL COMMENT '关联审批记录ID',
  `seal_id` bigint(20) NOT NULL COMMENT '印章ID',
  `position_id` bigint(20) NOT NULL COMMENT '印章位置配置ID',
  `sealer` varchar(64) DEFAULT '' COMMENT '盖章人',
  `seal_time` datetime DEFAULT NULL COMMENT '盖章时间',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`seal_record_id`),
  KEY `idx_instance_id` (`instance_id`),
  KEY `idx_approval_record_id` (`approval_record_id`),
  KEY `idx_seal_id` (`seal_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 COMMENT='签章记录表';

CREATE TABLE `biz_form_data` (
  `data_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '数据ID',
  `instance_id` bigint(20) NOT NULL COMMENT '流程实例ID',
  `template_id` bigint(20) DEFAULT NULL COMMENT '表单模板ID',
  `form_data` longtext COMMENT '表单填写数据JSON',
  `create_by` varchar(64) DEFAULT '' COMMENT '创建者',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` varchar(64) DEFAULT '' COMMENT '更新者',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`data_id`),
  KEY `idx_instance_id` (`instance_id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 COMMENT='表单数据表';
```

- [ ] **Step 2: 执行查询验证表创建成功**

Run: 在你的 MySQL 客户端执行 `SHOW TABLES LIKE 'biz_%';`
Expected: 列出 `biz_process_instance`, `biz_approval_record`, `biz_seal_record`, `biz_form_data`（加上已有的5张biz_表共9张）。

---

### Task 3: 创建 4 个 Domain 实体类

- [ ] **Step 1: 创建 `BizProcessInstance.java`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\domain\BizProcessInstance.java`

```java
package com.ruoyi.system.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;

public class BizProcessInstance extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long instanceId;
    private Long definitionId;
    private String definitionName;
    private Long formTemplateId;
    private String procInstId;
    private String businessNo;
    private String title;
    private String status;
    private String currentNodeCode;
    private String currentNodeName;
    private String applicant;
    private Long applicantDeptId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date applyTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date completeTime;

    public Long getInstanceId() { return instanceId; }
    public void setInstanceId(Long instanceId) { this.instanceId = instanceId; }
    public Long getDefinitionId() { return definitionId; }
    public void setDefinitionId(Long definitionId) { this.definitionId = definitionId; }
    public String getDefinitionName() { return definitionName; }
    public void setDefinitionName(String definitionName) { this.definitionName = definitionName; }
    public Long getFormTemplateId() { return formTemplateId; }
    public void setFormTemplateId(Long formTemplateId) { this.formTemplateId = formTemplateId; }
    public String getProcInstId() { return procInstId; }
    public void setProcInstId(String procInstId) { this.procInstId = procInstId; }
    public String getBusinessNo() { return businessNo; }
    public void setBusinessNo(String businessNo) { this.businessNo = businessNo; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCurrentNodeCode() { return currentNodeCode; }
    public void setCurrentNodeCode(String currentNodeCode) { this.currentNodeCode = currentNodeCode; }
    public String getCurrentNodeName() { return currentNodeName; }
    public void setCurrentNodeName(String currentNodeName) { this.currentNodeName = currentNodeName; }
    public String getApplicant() { return applicant; }
    public void setApplicant(String applicant) { this.applicant = applicant; }
    public Long getApplicantDeptId() { return applicantDeptId; }
    public void setApplicantDeptId(Long applicantDeptId) { this.applicantDeptId = applicantDeptId; }
    public Date getApplyTime() { return applyTime; }
    public void setApplyTime(Date applyTime) { this.applyTime = applyTime; }
    public Date getCompleteTime() { return completeTime; }
    public void setCompleteTime(Date completeTime) { this.completeTime = completeTime; }

    @Override
    public String toString() {
        return new org.apache.commons.lang3.builder.ToStringBuilder(this, org.apache.commons.lang3.builder.ToStringStyle.MULTI_LINE_STYLE)
            .append("instanceId", getInstanceId())
            .append("definitionId", getDefinitionId())
            .append("businessNo", getBusinessNo())
            .append("title", getTitle())
            .append("status", getStatus())
            .toString();
    }
}
```

- [ ] **Step 2: 创建 `BizApprovalRecord.java`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\domain\BizApprovalRecord.java`

```java
package com.ruoyi.system.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;

public class BizApprovalRecord
{
    private static final long serialVersionUID = 1L;

    private Long recordId;
    private Long instanceId;
    private String taskId;
    private String nodeCode;
    private String nodeName;
    private String approver;
    private Long approverDeptId;
    private String result;
    private String comment;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date approveTime;

    private Long costDuration;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date createTime;

    public Long getRecordId() { return recordId; }
    public void setRecordId(Long recordId) { this.recordId = recordId; }
    public Long getInstanceId() { return instanceId; }
    public void setInstanceId(Long instanceId) { this.instanceId = instanceId; }
    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }
    public String getNodeCode() { return nodeCode; }
    public void setNodeCode(String nodeCode) { this.nodeCode = nodeCode; }
    public String getNodeName() { return nodeName; }
    public void setNodeName(String nodeName) { this.nodeName = nodeName; }
    public String getApprover() { return approver; }
    public void setApprover(String approver) { this.approver = approver; }
    public Long getApproverDeptId() { return approverDeptId; }
    public void setApproverDeptId(Long approverDeptId) { this.approverDeptId = approverDeptId; }
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public Date getApproveTime() { return approveTime; }
    public void setApproveTime(Date approveTime) { this.approveTime = approveTime; }
    public Long getCostDuration() { return costDuration; }
    public void setCostDuration(Long costDuration) { this.costDuration = costDuration; }
    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }

    @Override
    public String toString() {
        return new org.apache.commons.lang3.builder.ToStringBuilder(this, org.apache.commons.lang3.builder.ToStringStyle.MULTI_LINE_STYLE)
            .append("recordId", getRecordId())
            .append("instanceId", getInstanceId())
            .append("taskId", getTaskId())
            .append("result", getResult())
            .toString();
    }
}
```

- [ ] **Step 3: 创建 `BizSealRecord.java`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\domain\BizSealRecord.java`

```java
package com.ruoyi.system.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;

public class BizSealRecord extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long sealRecordId;
    private Long instanceId;
    private Long approvalRecordId;
    private Long sealId;
    private Long positionId;
    private String sealer;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date sealTime;

    // 非数据库字段，用于详情展示
    private String sealName;
    private String sealImage;
    private Double posX;
    private Double posY;
    private Integer sealWidth;
    private Integer sealHeight;

    public Long getSealRecordId() { return sealRecordId; }
    public void setSealRecordId(Long sealRecordId) { this.sealRecordId = sealRecordId; }
    public Long getInstanceId() { return instanceId; }
    public void setInstanceId(Long instanceId) { this.instanceId = instanceId; }
    public Long getApprovalRecordId() { return approvalRecordId; }
    public void setApprovalRecordId(Long approvalRecordId) { this.approvalRecordId = approvalRecordId; }
    public Long getSealId() { return sealId; }
    public void setSealId(Long sealId) { this.sealId = sealId; }
    public Long getPositionId() { return positionId; }
    public void setPositionId(Long positionId) { this.positionId = positionId; }
    public String getSealer() { return sealer; }
    public void setSealer(String sealer) { this.sealer = sealer; }
    public Date getSealTime() { return sealTime; }
    public void setSealTime(Date sealTime) { this.sealTime = sealTime; }

    // 非数据库字段 getter/setter
    public String getSealName() { return sealName; }
    public void setSealName(String sealName) { this.sealName = sealName; }
    public String getSealImage() { return sealImage; }
    public void setSealImage(String sealImage) { this.sealImage = sealImage; }
    public Double getPosX() { return posX; }
    public void setPosX(Double posX) { this.posX = posX; }
    public Double getPosY() { return posY; }
    public void setPosY(Double posY) { this.posY = posY; }
    public Integer getSealWidth() { return sealWidth; }
    public void setSealWidth(Integer sealWidth) { this.sealWidth = sealWidth; }
    public Integer getSealHeight() { return sealHeight; }
    public void setSealHeight(Integer sealHeight) { this.sealHeight = sealHeight; }
}
```

- [ ] **Step 4: 创建 `BizFormData.java`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\domain\BizFormData.java`

```java
package com.ruoyi.system.domain;

import com.ruoyi.common.core.domain.BaseEntity;

public class BizFormData extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long dataId;
    private Long instanceId;
    private Long templateId;
    private String formData;

    public Long getDataId() { return dataId; }
    public void setDataId(Long dataId) { this.dataId = dataId; }
    public Long getInstanceId() { return instanceId; }
    public void setInstanceId(Long instanceId) { this.instanceId = instanceId; }
    public Long getTemplateId() { return templateId; }
    public void setTemplateId(Long templateId) { this.templateId = templateId; }
    public String getFormData() { return formData; }
    public void setFormData(String formData) { this.formData = formData; }
}
```

---

### Task 4: 创建 4 个 Mapper 接口 + XML

- [ ] **Step 1: 创建 `BizProcessInstanceMapper.java`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\mapper\BizProcessInstanceMapper.java`

```java
package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.BizProcessInstance;

public interface BizProcessInstanceMapper
{
    public BizProcessInstance selectInstanceById(Long instanceId);
    public List<BizProcessInstance> selectInstanceList(BizProcessInstance instance);
    public int insertInstance(BizProcessInstance instance);
    public int updateInstance(BizProcessInstance instance);
    public int deleteInstanceById(Long instanceId);
}
```

- [ ] **Step 2: 创建 `BizProcessInstanceMapper.xml`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\resources\mapper\system\BizProcessInstanceMapper.xml`

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.ruoyi.system.mapper.BizProcessInstanceMapper">

    <resultMap type="BizProcessInstance" id="BizProcessInstanceResult">
        <result property="instanceId"     column="instance_id"     />
        <result property="definitionId"   column="definition_id"   />
        <result property="definitionName" column="definition_name" />
        <result property="formTemplateId" column="form_template_id"/>
        <result property="procInstId"     column="proc_inst_id"    />
        <result property="businessNo"     column="business_no"     />
        <result property="title"          column="title"           />
        <result property="status"         column="status"          />
        <result property="currentNodeCode" column="current_node_code"/>
        <result property="currentNodeName" column="current_node_name"/>
        <result property="applicant"      column="applicant"       />
        <result property="applicantDeptId" column="applicant_dept_id"/>
        <result property="applyTime"      column="apply_time"      />
        <result property="completeTime"   column="complete_time"   />
        <result property="createBy"       column="create_by"       />
        <result property="createTime"     column="create_time"     />
        <result property="updateBy"       column="update_by"       />
        <result property="updateTime"     column="update_time"     />
    </resultMap>

    <sql id="selectInstanceVo">
        select instance_id, definition_id, definition_name, form_template_id, proc_inst_id,
               business_no, title, status, current_node_code, current_node_name, applicant,
               applicant_dept_id, apply_time, complete_time, create_by, create_time, update_by, update_time
        from biz_process_instance
    </sql>

    <select id="selectInstanceById" parameterType="Long" resultMap="BizProcessInstanceResult">
        <include refid="selectInstanceVo"/>
        where instance_id = #{instanceId}
    </select>

    <select id="selectInstanceList" parameterType="BizProcessInstance" resultMap="BizProcessInstanceResult">
        <include refid="selectInstanceVo"/>
        <where>
            <if test="definitionId != null">and definition_id = #{definitionId}</if>
            <if test="businessNo != null and businessNo != ''">and business_no = #{businessNo}</if>
            <if test="title != null and title != ''">and title like concat('%', #{title}, '%')</if>
            <if test="status != null and status != ''">and status = #{status}</if>
            <if test="applicant != null and applicant != ''">and applicant = #{applicant}</if>
        </where>
        order by create_time desc
    </select>

    <insert id="insertInstance" parameterType="BizProcessInstance" useGeneratedKeys="true" keyProperty="instanceId">
        insert into biz_process_instance (
            definition_id, definition_name, form_template_id, proc_inst_id,
            business_no, title, status, current_node_code, current_node_name,
            applicant, applicant_dept_id, apply_time, create_by, create_time
        ) values (
            #{definitionId}, #{definitionName}, #{formTemplateId}, #{procInstId},
            #{businessNo}, #{title}, #{status}, #{currentNodeCode}, #{currentNodeName},
            #{applicant}, #{applicantDeptId}, #{applyTime}, #{createBy}, sysdate()
        )
    </insert>

    <update id="updateInstance" parameterType="BizProcessInstance">
        update biz_process_instance
        <set>
            <if test="status != null and status != ''">status = #{status},</if>
            <if test="currentNodeCode != null">current_node_code = #{currentNodeCode},</if>
            <if test="currentNodeName != null">current_node_name = #{currentNodeName},</if>
            <if test="completeTime != null">complete_time = #{completeTime},</if>
            <if test="updateBy != null">update_by = #{updateBy},</if>
            update_time = sysdate()
        </set>
        where instance_id = #{instanceId}
    </update>

    <delete id="deleteInstanceById" parameterType="Long">
        delete from biz_process_instance where instance_id = #{instanceId}
    </delete>
</mapper>
```

- [ ] **Step 3: 创建 `BizApprovalRecordMapper.java` + `.xml`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\mapper\BizApprovalRecordMapper.java`

```java
package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.BizApprovalRecord;

public interface BizApprovalRecordMapper
{
    public BizApprovalRecord selectRecordById(Long recordId);
    public List<BizApprovalRecord> selectRecordList(BizApprovalRecord record);
    public int insertRecord(BizApprovalRecord record);
    public int updateRecord(BizApprovalRecord record);
    public int deleteRecordById(Long recordId);
}
```

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\resources\mapper\system\BizApprovalRecordMapper.xml`

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.ruoyi.system.mapper.BizApprovalRecordMapper">

    <resultMap type="BizApprovalRecord" id="BizApprovalRecordResult">
        <result property="recordId"       column="record_id"        />
        <result property="instanceId"     column="instance_id"      />
        <result property="taskId"         column="task_id"          />
        <result property="nodeCode"       column="node_code"        />
        <result property="nodeName"       column="node_name"        />
        <result property="approver"       column="approver"         />
        <result property="approverDeptId" column="approver_dept_id" />
        <result property="result"         column="result"           />
        <result property="comment"        column="comment"          />
        <result property="approveTime"    column="approve_time"     />
        <result property="costDuration"   column="cost_duration"    />
        <result property="createTime"     column="create_time"      />
    </resultMap>

    <sql id="selectRecordVo">
        select record_id, instance_id, task_id, node_code, node_name, approver,
               approver_dept_id, result, comment, approve_time, cost_duration, create_time
        from biz_approval_record
    </sql>

    <select id="selectRecordById" parameterType="Long" resultMap="BizApprovalRecordResult">
        <include refid="selectRecordVo"/> where record_id = #{recordId}
    </select>

    <select id="selectRecordList" parameterType="BizApprovalRecord" resultMap="BizApprovalRecordResult">
        <include refid="selectRecordVo"/>
        <where>
            <if test="instanceId != null">and instance_id = #{instanceId}</if>
            <if test="approver != null and approver != ''">and approver = #{approver}</if>
            <if test="result != null and result != ''">and result = #{result}</if>
        </where>
        order by create_time asc
    </select>

    <insert id="insertRecord" parameterType="BizApprovalRecord" useGeneratedKeys="true" keyProperty="recordId">
        insert into biz_approval_record (
            instance_id, task_id, node_code, node_name, approver, approver_dept_id,
            result, comment, approve_time, cost_duration, create_time
        ) values (
            #{instanceId}, #{taskId}, #{nodeCode}, #{nodeName}, #{approver}, #{approverDeptId},
            #{result}, #{comment}, #{approveTime}, #{costDuration}, sysdate()
        )
    </insert>

    <update id="updateRecord" parameterType="BizApprovalRecord">
        update biz_approval_record
        <set>
            <if test="result != null">result = #{result},</if>
            <if test="comment != null">comment = #{comment},</if>
            <if test="approveTime != null">approve_time = #{approveTime},</if>
            <if test="costDuration != null">cost_duration = #{costDuration},</if>
        </set>
        where record_id = #{recordId}
    </update>

    <delete id="deleteRecordById" parameterType="Long">
        delete from biz_approval_record where record_id = #{recordId}
    </delete>
</mapper>
```

- [ ] **Step 4: 创建 `BizSealRecordMapper.java` + `.xml`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\mapper\BizSealRecordMapper.java`

```java
package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.BizSealRecord;

public interface BizSealRecordMapper
{
    public BizSealRecord selectRecordById(Long sealRecordId);
    public List<BizSealRecord> selectRecordList(BizSealRecord record);
    public List<BizSealRecord> selectSealRecordsByInstanceId(Long instanceId);
    public int insertRecord(BizSealRecord record);
    public int deleteRecordById(Long sealRecordId);
}
```

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\resources\mapper\system\BizSealRecordMapper.xml`

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.ruoyi.system.mapper.BizSealRecordMapper">

    <resultMap type="BizSealRecord" id="BizSealRecordResult">
        <result property="sealRecordId"     column="seal_record_id"      />
        <result property="instanceId"       column="instance_id"         />
        <result property="approvalRecordId" column="approval_record_id"  />
        <result property="sealId"           column="seal_id"             />
        <result property="positionId"       column="position_id"         />
        <result property="sealer"           column="sealer"              />
        <result property="sealTime"         column="seal_time"           />
        <result property="createBy"         column="create_by"           />
        <result property="createTime"       column="create_time"         />
    </resultMap>

    <resultMap type="BizSealRecord" id="BizSealRecordWithDetailResult">
        <id property="sealRecordId" column="seal_record_id"/>
        <result property="instanceId"       column="instance_id"/>
        <result property="approvalRecordId" column="approval_record_id"/>
        <result property="sealId"           column="seal_id"/>
        <result property="positionId"       column="position_id"/>
        <result property="sealer"           column="sealer"/>
        <result property="sealTime"         column="seal_time"/>
        <result property="sealName"         column="seal_name"/>
        <result property="sealImage"        column="seal_image"/>
        <result property="posX"             column="pos_x"/>
        <result property="posY"             column="pos_y"/>
        <result property="sealWidth"        column="seal_width"/>
        <result property="sealHeight"       column="seal_height"/>
    </resultMap>

    <sql id="selectRecordVo">
        select sr.seal_record_id, sr.instance_id, sr.approval_record_id, sr.seal_id,
               sr.position_id, sr.sealer, sr.seal_time, sr.create_by, sr.create_time
        from biz_seal_record sr
    </sql>

    <select id="selectRecordById" parameterType="Long" resultMap="BizSealRecordResult">
        <include refid="selectRecordVo"/> where sr.seal_record_id = #{sealRecordId}
    </select>

    <select id="selectRecordList" parameterType="BizSealRecord" resultMap="BizSealRecordResult">
        <include refid="selectRecordVo"/>
        <where>
            <if test="instanceId != null">and sr.instance_id = #{instanceId}</if>
            <if test="sealId != null">and sr.seal_id = #{sealId}</if>
        </where>
        order by sr.create_time desc
    </select>

    <select id="selectSealRecordsByInstanceId" parameterType="Long" resultMap="BizSealRecordWithDetailResult">
        select sr.*, s.seal_name, s.seal_image, sp.pos_x, sp.pos_y, sp.seal_width, sp.seal_height
        from biz_seal_record sr
        left join biz_seal s on sr.seal_id = s.seal_id
        left join biz_seal_position sp on sr.position_id = sp.position_id
        where sr.instance_id = #{instanceId}
        order by sr.create_time desc
    </select>

    <insert id="insertRecord" parameterType="BizSealRecord" useGeneratedKeys="true" keyProperty="sealRecordId">
        insert into biz_seal_record (
            instance_id, approval_record_id, seal_id, position_id,
            sealer, seal_time, create_by, create_time
        ) values (
            #{instanceId}, #{approvalRecordId}, #{sealId}, #{positionId},
            #{sealer}, #{sealTime}, #{createBy}, sysdate()
        )
    </insert>

    <delete id="deleteRecordById" parameterType="Long">
        delete from biz_seal_record where seal_record_id = #{sealRecordId}
    </delete>
</mapper>
```

- [ ] **Step 5: 创建 `BizFormDataMapper.java` + `.xml`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\mapper\BizFormDataMapper.java`

```java
package com.ruoyi.system.mapper;

import com.ruoyi.system.domain.BizFormData;

public interface BizFormDataMapper
{
    public BizFormData selectFormDataById(Long dataId);
    public BizFormData selectFormDataByInstanceId(Long instanceId);
    public int insertFormData(BizFormData formData);
    public int updateFormData(BizFormData formData);
}
```

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\resources\mapper\system\BizFormDataMapper.xml`

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.ruoyi.system.mapper.BizFormDataMapper">

    <resultMap type="BizFormData" id="BizFormDataResult">
        <result property="dataId"     column="data_id"      />
        <result property="instanceId" column="instance_id"   />
        <result property="templateId" column="template_id"   />
        <result property="formData"   column="form_data"     />
        <result property="createBy"   column="create_by"     />
        <result property="createTime" column="create_time"   />
        <result property="updateBy"   column="update_by"     />
        <result property="updateTime" column="update_time"   />
    </resultMap>

    <select id="selectFormDataById" parameterType="Long" resultMap="BizFormDataResult">
        select data_id, instance_id, template_id, form_data, create_by, create_time, update_by, update_time
        from biz_form_data where data_id = #{dataId}
    </select>

    <select id="selectFormDataByInstanceId" parameterType="Long" resultMap="BizFormDataResult">
        select data_id, instance_id, template_id, form_data, create_by, create_time, update_by, update_time
        from biz_form_data where instance_id = #{instanceId}
    </select>

    <insert id="insertFormData" parameterType="BizFormData" useGeneratedKeys="true" keyProperty="dataId">
        insert into biz_form_data (instance_id, template_id, form_data, create_by, create_time)
        values (#{instanceId}, #{templateId}, #{formData}, #{createBy}, sysdate())
    </insert>

    <update id="updateFormData" parameterType="BizFormData">
        update biz_form_data
        <set>
            <if test="formData != null">form_data = #{formData},</if>
            <if test="updateBy != null">update_by = #{updateBy},</if>
            update_time = sysdate()
        </set>
        where instance_id = #{instanceId}
    </update>
</mapper>
```

---

### Task 5: 创建 4 个 Service 接口 + 实现

- [ ] **Step 1: 创建 `IBizProcessInstanceService.java`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\service\IBizProcessInstanceService.java`

```java
package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.BizProcessInstance;

public interface IBizProcessInstanceService
{
    public BizProcessInstance selectInstanceById(Long instanceId);
    public List<BizProcessInstance> selectInstanceList(BizProcessInstance instance);
    public int insertInstance(BizProcessInstance instance);
    public int updateInstance(BizProcessInstance instance);
    public Long startProcess(Long definitionId, String title, String formData, String username);
    public Long withdrawInstance(Long instanceId);
}
```

- [ ] **Step 2: 创建 `BizProcessInstanceServiceImpl.java`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\service\impl\BizProcessInstanceServiceImpl.java`

```java
package com.ruoyi.system.service.impl;

import java.util.Date;
import java.util.UUID;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.RuntimeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.system.domain.BizFormData;
import com.ruoyi.system.domain.BizProcessDefinition;
import com.ruoyi.system.domain.BizProcessInstance;
import com.ruoyi.system.mapper.BizProcessInstanceMapper;
import com.ruoyi.system.service.IBizFormDataService;
import com.ruoyi.system.service.IBizProcessDefinitionService;
import com.ruoyi.system.service.IBizProcessInstanceService;

@Service
public class BizProcessInstanceServiceImpl implements IBizProcessInstanceService
{
    @Autowired
    private BizProcessInstanceMapper instanceMapper;

    @Autowired
    private IBizProcessDefinitionService definitionService;

    @Autowired
    private IBizFormDataService formDataService;

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private RepositoryService repositoryService;

    @Override
    public BizProcessInstance selectInstanceById(Long instanceId)
    {
        return instanceMapper.selectInstanceById(instanceId);
    }

    @Override
    public List<BizProcessInstance> selectInstanceList(BizProcessInstance instance)
    {
        return instanceMapper.selectInstanceList(instance);
    }

    @Override
    public int insertInstance(BizProcessInstance instance)
    {
        return instanceMapper.insertInstance(instance);
    }

    @Override
    public int updateInstance(BizProcessInstance instance)
    {
        return instanceMapper.updateInstance(instance);
    }

    @Override
    @Transactional
    public Long startProcess(Long definitionId, String title, String formData, String username)
    {
        // 1. 查流程定义
        BizProcessDefinition definition = definitionService.selectDefinitionById(definitionId);
        if (definition == null || !"1".equals(definition.getStatus()))
        {
            throw new RuntimeException("流程定义不可用");
        }

        // 2. 生成业务编号
        String businessNo = UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        // 3. 创建 biz 流程实例
        BizProcessInstance instance = new BizProcessInstance();
        instance.setDefinitionId(definitionId);
        instance.setDefinitionName(definition.getDefinitionName());
        instance.setFormTemplateId(definition.getFormTemplateId());
        instance.setBusinessNo(businessNo);
        instance.setTitle(title);
        instance.setStatus("0");
        instance.setApplicant(username);
        instance.setApplyTime(new Date());
        instance.setCreateBy(username);
        instanceMapper.insertInstance(instance);

        // 4. 启动 Flowable 流程实例
        org.flowable.engine.repository.ProcessDefinition flowableDef =
            repositoryService.createProcessDefinitionQuery()
                .deploymentId(definition.getDeploymentId())
                .singleResult();
        if (flowableDef == null)
        {
            throw new RuntimeException("Flowable 未找到已部署的流程定义");
        }

        org.flowable.engine.runtime.ProcessInstance flowableInstance =
            runtimeService.startProcessInstanceById(flowableDef.getId(), instance.getInstanceId().toString());

        // 5. 回写 proc_inst_id
        BizProcessInstance update = new BizProcessInstance();
        update.setInstanceId(instance.getInstanceId());
        update.setProcInstId(flowableInstance.getId());
        instanceMapper.updateInstance(update);

        // 6. 保存表单数据
        BizFormData fd = new BizFormData();
        fd.setInstanceId(instance.getInstanceId());
        fd.setTemplateId(definition.getFormTemplateId());
        fd.setFormData(formData);
        fd.setCreateBy(username);
        formDataService.insertFormData(fd);

        return instance.getInstanceId();
    }

    @Override
    @Transactional
    public Long withdrawInstance(Long instanceId)
    {
        BizProcessInstance instance = instanceMapper.selectInstanceById(instanceId);
        if (instance == null || !"0".equals(instance.getStatus()))
        {
            throw new RuntimeException("只有审批中的流程才能撤回");
        }

        // 删除 Flowable 实例
        runtimeService.deleteProcessInstance(instance.getProcInstId(), "申请人撤回");

        // 更新 biz 状态
        BizProcessInstance update = new BizProcessInstance();
        update.setInstanceId(instanceId);
        update.setStatus("3");
        update.setCompleteTime(new Date());
        instanceMapper.updateInstance(update);

        return instanceId;
    }
}
```

- [ ] **Step 3: 创建其他 3 个 Service（简单 CRUD）**

Create: `IBizApprovalRecordService.java` / `BizApprovalRecordServiceImpl.java`
Create: `IBizSealRecordService.java` / `BizSealRecordServiceImpl.java`
Create: `IBizFormDataService.java` / `BizFormDataServiceImpl.java`

(这 3 个 Service 遵循标准模式：interface 声明 `selectXxxById`、`selectXxxList`、`insertXxx`、`updateXxx`、`deleteXxxById`，impl 用 `@Service` + `@Autowired Mapper` 直接委托。格式参考 Task 5 Step 1 和已知的现有 Service 模式。)

以下是 `IBizSealRecordService` 的完整实现（因为 Service 到 Controller 会用到它做批量插入）：

```java
package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.BizSealRecord;

public interface IBizSealRecordService
{
    public BizSealRecord selectRecordById(Long sealRecordId);
    public List<BizSealRecord> selectRecordList(BizSealRecord record);
    public List<BizSealRecord> selectSealRecordsByInstanceId(Long instanceId);
    public int insertRecord(BizSealRecord record);
    public int deleteRecordById(Long sealRecordId);
    public int batchInsertSealRecords(List<BizSealRecord> records);
}
```

```java
package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.BizSealRecord;
import com.ruoyi.system.mapper.BizSealRecordMapper;
import com.ruoyi.system.service.IBizSealRecordService;

@Service
public class BizSealRecordServiceImpl implements IBizSealRecordService
{
    @Autowired
    private BizSealRecordMapper sealRecordMapper;

    @Override public BizSealRecord selectRecordById(Long id) { return sealRecordMapper.selectRecordById(id); }
    @Override public List<BizSealRecord> selectRecordList(BizSealRecord r) { return sealRecordMapper.selectRecordList(r); }
    @Override public List<BizSealRecord> selectSealRecordsByInstanceId(Long id) { return sealRecordMapper.selectSealRecordsByInstanceId(id); }
    @Override public int insertRecord(BizSealRecord r) { return sealRecordMapper.insertRecord(r); }
    @Override public int deleteRecordById(Long id) { return sealRecordMapper.deleteRecordById(id); }

    @Override
    public int batchInsertSealRecords(List<BizSealRecord> records)
    {
        int count = 0;
        for (BizSealRecord record : records)
        {
            count += sealRecordMapper.insertRecord(record);
        }
        return count;
    }
}
```

---

## Phase 2: 后端 Flowable 集成

### Task 6: 创建 Flowable TaskListener

- [ ] **Step 1: 创建 `ApprovalTaskListener.java`**

Create: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\listener\ApprovalTaskListener.java`

```java
package com.ruoyi.system.listener;

import java.util.Date;
import java.util.List;
import org.flowable.engine.delegate.TaskListener;
import org.flowable.task.service.delegate.DelegateTask;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.ruoyi.system.domain.BizApprovalRecord;
import com.ruoyi.system.domain.BizProcessInstance;
import com.ruoyi.system.domain.BizSealPosition;
import com.ruoyi.system.domain.BizSealRecord;
import com.ruoyi.system.mapper.BizProcessInstanceMapper;
import com.ruoyi.system.service.IBizApprovalRecordService;
import com.ruoyi.system.service.IBizSealPositionService;
import com.ruoyi.system.service.IBizSealRecordService;

@Component("approvalTaskListener")
public class ApprovalTaskListener implements TaskListener
{
    private static final long serialVersionUID = 1L;

    private static BizProcessInstanceMapper instanceMapper;
    private static IBizApprovalRecordService approvalRecordService;
    private static IBizSealRecordService sealRecordService;
    private static IBizSealPositionService sealPositionService;

    @Autowired
    public void setInstanceMapper(BizProcessInstanceMapper mapper) { ApprovalTaskListener.instanceMapper = mapper; }

    @Autowired
    public void setApprovalRecordService(IBizApprovalRecordService s) { ApprovalTaskListener.approvalRecordService = s; }

    @Autowired
    public void setSealRecordService(IBizSealRecordService s) { ApprovalTaskListener.sealRecordService = s; }

    @Autowired
    public void setSealPositionService(IBizSealPositionService s) { ApprovalTaskListener.sealPositionService = s; }

    @Override
    public void notify(DelegateTask delegateTask)
    {
        String eventName = delegateTask.getEventName();
        if (TaskListener.EVENTNAME_CREATE.equals(eventName))
        {
            // 任务创建：更新流程实例的当前节点
            Long instanceId = Long.valueOf(delegateTask.getProcessInstanceBusinessKey());
            String nodeCode = delegateTask.getTaskDefinitionKey();
            String nodeName = delegateTask.getName();

            BizProcessInstance update = new BizProcessInstance();
            update.setInstanceId(instanceId);
            update.setCurrentNodeCode(nodeCode);
            update.setCurrentNodeName(nodeName);
            instanceMapper.updateInstance(update);
        }
        else if (TaskListener.EVENTNAME_COMPLETE.equals(eventName))
        {
            // 任务完成：创建审批记录
            Long instanceId = Long.valueOf(delegateTask.getProcessInstanceBusinessKey());
            String variable = (String) delegateTask.getVariable("approvalResult");
            String comment = (String) delegateTask.getVariable("approvalComment");
            String approver = (String) delegateTask.getVariable("approver");

            BizApprovalRecord record = new BizApprovalRecord();
            record.setInstanceId(instanceId);
            record.setTaskId(delegateTask.getId());
            record.setNodeCode(delegateTask.getTaskDefinitionKey());
            record.setNodeName(delegateTask.getName());
            record.setApprover(approver);
            record.setResult(variable);  // "0"通过 "1"驳回 "2"退回
            record.setComment(comment);
            record.setApproveTime(new Date());
            record.setCostDuration(System.currentTimeMillis()
                - delegateTask.getCreateTime().getTime());
            approvalRecordService.insertRecord(record);
        }
    }
}
```

**说明：**
- 使用 `@Component("approvalTaskListener")` 和静态字段注入是因为 Flowable 的 TaskListener 每次由引擎通过类名反射创建新实例，不能直接用 `@Autowired` 字段。这里用 setter + static 做桥接。
- 任务的 `businessKey` 就是 `biz_process_instance.instanceId` 的字符串形式。
- 任务创建时同步 `current_node_code`，任务完成时创建审批记录。

- [ ] **Step 2: 后端流程部署时，在 BPMN 用户任务节点上注册该 Listener**

修改 `BizProcessDefinitionServiceImpl.deployDefinition()` —— 见 Task 7。

---

### Task 7: 修改 deployDefinition → 真正部署到 Flowable

**Files:**
- Modify: `F:\ideaWork\seal-approval-server\ruoyi-system\src\main\java\com\ruoyi\system\service\impl\BizProcessDefinitionServiceImpl.java`

- [ ] **Step 1: 修改 `deployDefinition` 方法**

将原来的简单状态更新改为真正的 Flowable 部署：

```java
@Service
public class BizProcessDefinitionServiceImpl implements IBizProcessDefinitionService
{
    @Autowired
    private BizProcessDefinitionMapper definitionMapper;

    @Autowired
    private RepositoryService repositoryService;  // 新增

    // ... 其他方法不变 ...

    @Override
    @Transactional
    public int deployDefinition(Long definitionId)
    {
        BizProcessDefinition definition = definitionMapper.selectDefinitionById(definitionId);
        if (definition == null)
        {
            throw new RuntimeException("流程定义不存在");
        }
        if (!"0".equals(definition.getStatus()))
        {
            throw new RuntimeException("只有草稿状态的流程才能部署");
        }

        // 1. 解析 BPMN XML 中所有 userTask 节点，注入 ApprovalTaskListener
        String bpmnXml = definition.getBpmnXml();
        if (bpmnXml == null || bpmnXml.isEmpty())
        {
            throw new RuntimeException("BPMN XML 为空，无法部署");
        }

        String enrichedXml = injectFlowableListener(bpmnXml);

        // 2. 部署到 Flowable
        Deployment deployment = repositoryService.createDeployment()
            .key(definition.getDefinitionKey())
            .name(definition.getDefinitionName())
            .addString(definition.getDefinitionKey() + ".bpmn20.xml", enrichedXml)
            .deploy();

        // 3. 更新 biz 表状态 + deployment_id
        BizProcessDefinition update = new BizProcessDefinition();
        update.setDefinitionId(definitionId);
        update.setStatus("1");
        update.setDeploymentId(deployment.getId());
        return definitionMapper.updateDefinition(update);
    }

    /**
     * 在 BPMN XML 的每个 userTask 节点中注入 TaskListener。
     * 已包含 listener 的节点不重复注入。
     */
    private String injectFlowableListener(String xml)
    {
        // 使用正则：在 <userTask ...> 内部、</userTask> 之前注入 flowable:taskListener
        // 如果已存在 flowable:taskListener 则跳过
        xml = xml.replaceAll(
            "<userTask([^>]*)>",
            "<userTask$1>"
                + "<extensionElements>"
                + "<flowable:taskListener event=\"create\" "
                + "delegateExpression=\"${approvalTaskListener}\"/>"
                + "<flowable:taskListener event=\"complete\" "
                + "delegateExpression=\"${approvalTaskListener}\"/>"
                + "</extensionElements>"
        );
        return xml;
    }
}
```

**注意：** 需要确保 BPMN XML 中已声明 Flowable 命名空间 `xmlns:flowable="http://flowable.org/bpmn"`。可以在设计器保存时自动添加，或在 `injectFlowableListener` 中补充。

- [ ] **Step 2: 启动后端，验证编译通过**

Run: `mvn -f F:\ideaWork\seal-approval-server compile`
Expected: BUILD SUCCESS

---

### Task 8: 创建 BizProcessInstanceController

Create: `F:\ideaWork\seal-approval-server\ruoyi-admin\src\main\java\com\ruoyi\web\controller\seal\BizProcessInstanceController.java`

```java
package com.ruoyi.web.controller.seal;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.system.domain.BizFormData;
import com.ruoyi.system.domain.BizProcessInstance;
import com.ruoyi.system.service.IBizFormDataService;
import com.ruoyi.system.service.IBizProcessInstanceService;

@RestController
@RequestMapping("/process/instance")
public class BizProcessInstanceController extends BaseController
{
    @Autowired
    private IBizProcessInstanceService instanceService;

    @Autowired
    private IBizFormDataService formDataService;

    @PostMapping("/start")
    @PreAuthorize("@ss.hasPermi('process:instance:start')")
    public AjaxResult start(@RequestBody StartRequest request)
    {
        try
        {
            Long instanceId = instanceService.startProcess(
                request.getDefinitionId(),
                request.getTitle(),
                request.getFormData(),
                getUsername()
            );
            return success(instanceId);
        }
        catch (RuntimeException e)
        {
            return error(e.getMessage());
        }
    }

    @GetMapping("/myList")
    @PreAuthorize("@ss.hasPermi('process:instance:list')")
    public TableDataInfo myList(BizProcessInstance instance)
    {
        startPage();
        instance.setApplicant(getUsername());
        List<BizProcessInstance> list = instanceService.selectInstanceList(instance);
        return getDataTable(list);
    }

    @GetMapping("/{instanceId}")
    @PreAuthorize("@ss.hasPermi('process:instance:list')")
    public AjaxResult getInfo(@PathVariable Long instanceId)
    {
        BizProcessInstance instance = instanceService.selectInstanceById(instanceId);
        BizFormData formData = formDataService.selectFormDataByInstanceId(instanceId);
        return success(new InstanceDetail(instance, formData));
    }

    @PutMapping("/{instanceId}/withdraw")
    @PreAuthorize("@ss.hasPermi('process:instance:start')")
    public AjaxResult withdraw(@PathVariable Long instanceId)
    {
        try
        {
            instanceService.withdrawInstance(instanceId);
            return success();
        }
        catch (RuntimeException e)
        {
            return error(e.getMessage());
        }
    }

    // Inner DTO
    public static class StartRequest
    {
        private Long definitionId;
        private String title;
        private String formData;
        public Long getDefinitionId() { return definitionId; }
        public void setDefinitionId(Long id) { this.definitionId = id; }
        public String getTitle() { return title; }
        public void setTitle(String t) { this.title = t; }
        public String getFormData() { return formData; }
        public void setFormData(String d) { this.formData = d; }
    }

    public static class InstanceDetail
    {
        private BizProcessInstance instance;
        private BizFormData formData;
        public InstanceDetail(BizProcessInstance i, BizFormData f) { this.instance = i; this.formData = f; }
        public BizProcessInstance getInstance() { return instance; }
        public BizFormData getFormData() { return formData; }
    }
}
```

---

### Task 9: 创建 BizApprovalTaskController

Create: `F:\ideaWork\seal-approval-server\ruoyi-admin\src\main\java\com\ruoyi\web\controller\seal\BizApprovalTaskController.java`

```java
package com.ruoyi.web.controller.seal;

import java.util.*;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.system.domain.BizApprovalRecord;
import com.ruoyi.system.domain.BizProcessInstance;
import com.ruoyi.system.domain.BizSealPosition;
import com.ruoyi.system.domain.BizSealRecord;
import com.ruoyi.system.service.*;
import com.ruoyi.common.core.page.PageDomain;
import com.ruoyi.common.core.page.TableSupport;

@RestController
@RequestMapping("/process/task")
public class BizApprovalTaskController extends BaseController
{
    @Autowired
    private TaskService taskService;

    @Autowired
    private IBizProcessInstanceService instanceService;

    @Autowired
    private IBizApprovalRecordService approvalRecordService;

    @Autowired
    private IBizSealRecordService sealRecordService;

    @Autowired
    private IBizSealPositionService sealPositionService;

    @GetMapping("/pending")
    @PreAuthorize("@ss.hasPermi('process:task:list')")
    public TableDataInfo pending()
    {
        String username = getUsername();
        List<Task> tasks = taskService.createTaskQuery()
            .taskAssignee(username)
            .orderByTaskCreateTime().desc()
            .list();

        // 手动分页
        PageDomain pageDomain = TableSupport.buildPageRequest();
        int pageNum = pageDomain.getPageNum();
        int pageSize = pageDomain.getPageSize();
        int total = tasks.size();
        int fromIndex = (pageNum - 1) * pageSize;
        int toIndex = Math.min(fromIndex + pageSize, total);

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = fromIndex; i < toIndex; i++)
        {
            Task task = tasks.get(i);
            Long instanceId = Long.valueOf(task.getProcessInstanceBusinessKey());
            BizProcessInstance instance = instanceService.selectInstanceById(instanceId);

            Map<String, Object> item = new HashMap<>();
            item.put("taskId", task.getId());
            item.put("taskName", task.getName());
            item.put("instanceId", instanceId);
            item.put("businessNo", instance != null ? instance.getBusinessNo() : "");
            item.put("title", instance != null ? instance.getTitle() : "");
            item.put("applicant", instance != null ? instance.getApplicant() : "");
            item.put("applyTime", instance != null ? instance.getApplyTime() : null);
            result.add(item);
        }

        TableDataInfo dataInfo = new TableDataInfo();
        dataInfo.setTotal(total);
        dataInfo.setRows(result);
        return dataInfo;
    }

    @PutMapping("/{taskId}/approve")
    @PreAuthorize("@ss.hasPermi('process:task:approve')")
    public AjaxResult approve(@PathVariable String taskId, @RequestBody ApproveRequest request)
    {
        try
        {
            Task task = taskService.createTaskQuery().taskId(taskId).singleResult();
            if (task == null) return error("任务不存在");

            Long instanceId = Long.valueOf(task.getProcessInstanceBusinessKey());

            // 设置流程变量
            Map<String, Object> variables = new HashMap<>();
            variables.put("approvalResult", "0");
            variables.put("approvalComment", request.getComment());
            variables.put("approver", getUsername());
            taskService.complete(taskId, variables);

            // 检查是否需要自动签章
            autoSeal(instanceId, task, taskId);

            return success();
        }
        catch (Exception e)
        {
            return error(e.getMessage());
        }
    }

    @PutMapping("/{taskId}/reject")
    @PreAuthorize("@ss.hasPermi('process:task:approve')")
    public AjaxResult reject(@PathVariable String taskId, @RequestBody ApproveRequest request)
    {
        try
        {
            Task task = taskService.createTaskQuery().taskId(taskId).singleResult();
            if (task == null) return error("任务不存在");

            Long instanceId = Long.valueOf(task.getProcessInstanceBusinessKey());

            Map<String, Object> variables = new HashMap<>();
            variables.put("approvalResult", "1");
            variables.put("approvalComment", request.getComment());
            variables.put("approver", getUsername());
            taskService.complete(taskId, variables);

            // 更新实例状态为已驳回
            BizProcessInstance update = new BizProcessInstance();
            update.setInstanceId(instanceId);
            update.setStatus("2");
            update.setCompleteTime(new Date());
            instanceService.updateInstance(update);

            return success();
        }
        catch (Exception e)
        {
            return error(e.getMessage());
        }
    }

    @PutMapping("/{taskId}/return")
    @PreAuthorize("@ss.hasPermi('process:task:approve')")
    public AjaxResult returnTask(@PathVariable String taskId, @RequestBody ApproveRequest request)
    {
        try
        {
            Task task = taskService.createTaskQuery().taskId(taskId).singleResult();
            if (task == null) return error("任务不存在");

            Map<String, Object> variables = new HashMap<>();
            variables.put("approvalResult", "2");
            variables.put("approvalComment", request.getComment());
            variables.put("approver", getUsername());
            taskService.complete(taskId, variables);

            return success();
        }
        catch (Exception e)
        {
            return error(e.getMessage());
        }
    }

    @GetMapping("/approved")
    @PreAuthorize("@ss.hasPermi('process:task:list')")
    public TableDataInfo approved()
    {
        startPage();
        BizApprovalRecord query = new BizApprovalRecord();
        query.setApprover(getUsername());
        List<BizApprovalRecord> list = approvalRecordService.selectRecordList(query);
        return getDataTable(list);
    }

    /**
     * 审批通过后自动签章
     */
    private void autoSeal(Long instanceId, Task task, String taskId)
    {
        // 查流程实例对应的表单模板
        BizProcessInstance instance = instanceService.selectInstanceById(instanceId);
        if (instance == null || instance.getFormTemplateId() == null) return;

        // 查该表单模板的所有印章位置配置
        BizSealPosition query = new BizSealPosition();
        query.setFormTemplateId(instance.getFormTemplateId());
        List<BizSealPosition> positions = sealPositionService.selectPositionList(query);

        if (positions.isEmpty()) return;

        // 查刚创建的审批记录ID
        BizApprovalRecord recordQuery = new BizApprovalRecord();
        recordQuery.setInstanceId(instanceId);
        recordQuery.setTaskId(taskId);
        List<BizApprovalRecord> records = approvalRecordService.selectRecordList(recordQuery);
        Long approvalRecordId = null;
        if (!records.isEmpty()) approvalRecordId = records.get(0).getRecordId();

        Date now = new Date();
        for (BizSealPosition pos : positions)
        {
            BizSealRecord sealRecord = new BizSealRecord();
            sealRecord.setInstanceId(instanceId);
            sealRecord.setApprovalRecordId(approvalRecordId);
            sealRecord.setSealId(pos.getSealId());
            sealRecord.setPositionId(pos.getPositionId());
            sealRecord.setSealer(getUsername());
            sealRecord.setSealTime(now);
            sealRecord.setCreateBy(getUsername());
            sealRecordService.insertRecord(sealRecord);
        }
    }

    public static class ApproveRequest
    {
        private String comment;
        public String getComment() { return comment; }
        public void setComment(String c) { this.comment = c; }
    }
}
```

---

## Phase 3: 前端基础设施

### Task 10: 更新 API 层 `src/api/process.ts`

**Files:**
- Modify: `F:\webstromWork\seal-approval-web\src\api\process.ts`

在文件末尾追加以下内容：

```ts
// ==================== 申请与审批 ====================

export interface ProcessInstance {
  instanceId: number
  definitionId: number
  definitionName: string
  formTemplateId: number | null
  procInstId: string
  businessNo: string
  title: string
  status: string
  currentNodeCode: string
  currentNodeName: string
  applicant: string
  applicantDeptId: number | null
  applyTime: string
  completeTime: string | null
  createTime: string
}

export interface ApprovalRecord {
  recordId: number
  instanceId: number
  taskId: string
  nodeCode: string
  nodeName: string
  approver: string
  result: string
  comment: string
  approveTime: string
  costDuration: number
  createTime: string
}

export interface SealRecord {
  sealRecordId: number
  instanceId: number
  approvalRecordId: number
  sealId: number
  positionId: number
  sealer: string
  sealTime: string
  sealName: string
  sealImage: string
  posX: number
  posY: number
  sealWidth: number
  sealHeight: number
}

export interface PendingTask {
  taskId: string
  taskName: string
  instanceId: number
  businessNo: string
  title: string
  applicant: string
  applyTime: string
}

// 发起申请
export function startProcessInstance(data: {
  definitionId: number
  title: string
  formData: Record<string, any>
}) {
  return request.post<any>({ url: '/process/instance/start', data })
}

// 我的申请列表
export function fetchMyApplicationList(params: Record<string, any>) {
  return request.get<any>({ url: '/process/instance/myList', params })
}

// 实例详情
export function fetchInstanceDetail(instanceId: number) {
  return request.get<any>({ url: `/process/instance/${instanceId}` })
}

// 撤回申请
export function withdrawInstance(instanceId: number) {
  return request.put<any>({ url: `/process/instance/${instanceId}/withdraw` })
}

// 待审批列表
export function fetchPendingTaskList(params: Record<string, any>) {
  return request.get<any>({ url: '/process/task/pending', params })
}

// 审批通过
export function approveTask(taskId: string, data: { comment: string }) {
  return request.put<any>({ url: `/process/task/${taskId}/approve`, data })
}

// 审批驳回
export function rejectTask(taskId: string, data: { comment: string }) {
  return request.put<any>({ url: `/process/task/${taskId}/reject`, data })
}

// 审批退回
export function returnTask(taskId: string, data: { comment: string }) {
  return request.put<any>({ url: `/process/task/${taskId}/return`, data })
}

// 已审批列表
export function fetchApprovedTaskList(params: Record<string, any>) {
  return request.get<any>({ url: '/process/task/approved', params })
}
```

---

### Task 11: 更新路由 + 国际化

**Files:**
- Modify: `F:\webstromWork\seal-approval-web\src\router\modules\process.ts`
- Modify: `F:\webstromWork\seal-approval-web\src\locales\langs\zh.json`
- Modify: `F:\webstromWork\seal-approval-web\src\locales\langs\en.json`

- [ ] **Step 1: 更新 `src/router/modules/process.ts`**

在 `children` 数组中追加 5 条子路由：

```ts
import { AppRouteRecord } from '@/types/router'

export const processRoutes: AppRouteRecord = {
  path: '/process',
  name: 'Process',
  component: '/index/index',
  meta: {
    title: 'menus.process.title',
    icon: 'ri:flow-chart',
    roles: ['admin']
  },
  children: [
    {
      path: 'definition',
      name: 'ProcessDefinition',
      component: '/process/definition',
      meta: {
        title: 'menus.process.definition',
        icon: 'ri:file-list-3-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'start',
      name: 'ProcessStart',
      component: '/process/start',
      meta: {
        title: 'menus.process.start',
        icon: 'ri:file-add-line',
        keepAlive: false,
        roles: ['admin']
      }
    },
    {
      path: 'my-applications',
      name: 'MyApplications',
      component: '/process/my-applications',
      meta: {
        title: 'menus.process.myApplications',
        icon: 'ri:draft-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'my-applications/:id',
      name: 'ApplicationDetail',
      component: '/process/application-detail',
      meta: {
        title: 'menus.process.applicationDetail',
        isHideTab: true
      }
    },
    {
      path: 'pending',
      name: 'PendingApproval',
      component: '/process/pending',
      meta: {
        title: 'menus.process.pending',
        icon: 'ri:task-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'approved',
      name: 'ApprovedHistory',
      component: '/process/approved',
      meta: {
        title: 'menus.process.approved',
        icon: 'ri:check-double-line',
        keepAlive: true,
        roles: ['admin']
      }
    }
  ]
}
```

- [ ] **Step 2: 更新 `zh.json`**

在 `"process"` 对象中追加：

```json
"start": "发起申请",
"myApplications": "我的申请",
"applicationDetail": "申请详情",
"pending": "待审批",
"approved": "已审批"
```

- [ ] **Step 3: 更新 `en.json`**

在 `"process"` 对象中追加：

```json
"start": "Start Process",
"myApplications": "My Applications",
"applicationDetail": "Application Detail",
"pending": "Pending Approval",
"approved": "Approved"
```

---

## Phase 4: 前端页面 + 组件

### Task 12: 创建 FormRender 组件

Create: `F:\webstromWork\seal-approval-web\src\components\business\FormRender.vue`

```vue
<template>
  <div class="form-render" :class="{ 'is-view': mode === 'view' }">
    <div class="form-render__container" ref="formContainerRef" style="position: relative;">
      <!-- 表单渲染区域 -->
      <div ref="formRenderRef"></div>

      <!-- view 模式下叠加印章图片 -->
      <template v-if="mode === 'view' && seals.length > 0">
        <img
          v-for="(seal, idx) in seals"
          :key="idx"
          :src="seal.sealImage"
          class="form-render__seal"
          :style="sealStyle(seal)"
          :title="seal.sealName"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SealRecord } from '@/api/process'

const props = defineProps<{
  formConfig: Record<string, any>
  formData?: Record<string, any>
  mode: 'edit' | 'view'
  seals?: SealRecord[]
}>()

const formRenderRef = ref<HTMLElement>()

// 印章定位样式
function sealStyle(seal: SealRecord) {
  return {
    position: 'absolute',
    left: `${seal.posX}px`,
    top: `${seal.posY}px`,
    width: `${seal.sealWidth || 120}px`,
    height: `${seal.sealHeight || 120}px`,
    objectFit: 'contain',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 10
  }
}

// 使用 form-create 渲染表单
onMounted(() => {
  // form-create 的动态渲染需要实际集成
  // 此处预留接口：根据 formConfig JSON 渲染表单
  // 若项目已有 form-create 的嵌入方式，在此处调用
})
</script>

<style scoped lang="scss">
.form-render {
  &__container {
    min-height: 200px;
  }

  &.is-view {
    .form-render__seal {
      opacity: 0.85;
    }
  }
}
</style>
```

**注意：** 表单渲染核心依赖 `form-create` 库的 `render` 方法。实际已在 `src/views/form/designer/index.vue` 中使用 `fc-designer`。此组件的 `formConfig` 就是设计器中保存的 JSON 结构。正式实现时需要：

1. 引入 `form-create` 的渲染函数：`import { render } from 'form-create'`
2. 在 `onMounted` 中调用：`render(props.formConfig, formRenderRef.value)`
3. 若有初始数据：调用 setValue 回填

---

### Task 13: 创建发起申请页

Create: `F:\webstromWork\seal-approval-web\src\views\process\start\index.vue`

```vue
<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <template #header>
        <span class="text-lg font-medium">发起申请</span>
      </template>

      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px" class="max-w-2xl">
        <ElFormItem label="选择流程" prop="definitionId">
          <ElSelect
            v-model="form.definitionId"
            placeholder="请选择已部署的流程"
            class="w-full"
            @change="handleDefinitionChange"
          >
            <ElOption
              v-for="d in deployedDefinitions"
              :key="d.definitionId"
              :label="`${d.definitionName} (v${d.version})`"
              :value="d.definitionId!"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="流程标题" prop="title">
          <ElInput v-model="form.title" placeholder="请输入流程标题" maxlength="200" />
        </ElFormItem>

        <template v-if="selectedDefinition?.formTemplateId">
          <ElDivider content-position="left">填写表单</ElDivider>
          <FormRender
            v-if="templateConfig"
            :form-config="templateConfig"
            mode="edit"
          />
        </template>

        <ElFormItem>
          <ElButton type="primary" :loading="submitting" @click="handleSubmit">
            提交申请
          </ElButton>
          <ElButton @click="router.back()">取消</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import { fetchProcessDefinitionList } from '@/api/process'
import type { ProcessDefinition } from '@/api/process'
import { startProcessInstance } from '@/api/process'
import type { FormInstance, FormRules } from 'element-plus'
import FormRender from '@/components/business/FormRender.vue'

defineOptions({ name: 'ProcessStart' })

const router = useRouter()
const deployedDefinitions = ref<ProcessDefinition[]>([])
const selectedDefinition = ref<ProcessDefinition | null>(null)
const templateConfig = ref<Record<string, any> | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  definitionId: undefined as number | undefined,
  title: ''
})

const rules: FormRules = {
  definitionId: [{ required: true, message: '请选择流程', trigger: 'change' }],
  title: [{ required: true, message: '请输入流程标题', trigger: 'blur' }]
}

onMounted(async () => {
  const res = await fetchProcessDefinitionList({ status: '1' })
  deployedDefinitions.value = res.data?.rows || []
})

async function handleDefinitionChange(id: number) {
  // 加载流程定义详情，获取绑定的表单模板
  const { fetchProcessDefinitionDetail } = await import('@/api/process')
  const { fetchFormTemplateDetail, type FormTemplate } = await import('@/api/form')

  const defRes = await fetchProcessDefinitionDetail(id)
  if (defRes.data) {
    selectedDefinition.value = defRes.data

    if (defRes.data.formTemplateId) {
      const templateRes = await fetchFormTemplateDetail(defRes.data.formTemplateId)
      if (templateRes.data?.formConfig) {
        templateConfig.value = JSON.parse(templateRes.data.formConfig)
      }
    }
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await startProcessInstance({
        definitionId: form.definitionId!,
        title: form.title,
        formData: {}
      })
      ElMessage.success('提交成功')
      router.push('/process/my-applications')
    } catch {
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
    }
  })
}
</script>
```

---

### Task 14: 创建我的申请页

Create: `F:\webstromWork\seal-approval-web\src\views\process\my-applications\index.vue`

```vue
<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="router.push('/process/start')" v-ripple>
            发起申请
          </ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import { fetchMyApplicationList, withdrawInstance } from '@/api/process'

defineOptions({ name: 'MyApplications' })

const router = useRouter()

const {
  loading, data, pagination,
  handleSizeChange, handleCurrentChange, refreshData
} = useTable({
  fetchFn: fetchMyApplicationList
})

const statusMap: Record<string, { type: string; text: string }> = {
  '0': { type: 'warning', text: '审批中' },
  '1': { type: 'success', text: '已通过' },
  '2': { type: 'danger', text: '已驳回' },
  '3': { type: 'info', text: '已撤回' }
}

const columns = [
  { prop: 'businessNo', label: '业务编号', width: 160 },
  { prop: 'title', label: '流程标题', minWidth: 180 },
  { prop: 'definitionName', label: '流程名称', width: 140 },
  { prop: 'currentNodeName', label: '当前节点', width: 140 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row: any) => h(ElTag, { type: statusMap[row.status]?.type, size: 'small' },
      () => statusMap[row.status]?.text || '未知')
  },
  { prop: 'applyTime', label: '申请时间', width: 170 },
  {
    label: '操作',
    width: 180,
    fixed: 'right',
    render: (row: any) => [
      h(ElButton, { link: true, type: 'primary', size: 'small', onClick: () => viewDetail(row.instanceId) },
        () => '查看'),
      row.status === '0' && h(ElButton, { link: true, type: 'warning', size: 'small', onClick: () => handleWithdraw(row) },
        () => '撤回')
    ]
  }
]

function viewDetail(id: number) {
  router.push(`/process/my-applications/${id}`)
}

async function handleWithdraw(row: any) {
  await ElMessageBox.confirm('确认撤回该申请？', '提示', { type: 'warning' })
  await withdrawInstance(row.instanceId)
  ElMessage.success('已撤回')
  refreshData()
}
</script>
```

---

### Task 15: 创建申请详情页

Create: `F:\webstromWork\seal-approval-web\src\views\process\application-detail\index.vue`

```vue
<template>
  <div class="art-full-height flex gap-4">
    <!-- 左侧：表单 + 印章 -->
    <div class="flex-1 overflow-auto">
      <ElCard>
        <template #header>
          <span class="text-lg font-medium">{{ instance?.title }}</span>
          <ElTag :type="statusMap[instance?.status || '']?.type" class="ml-2">
            {{ statusMap[instance?.status || '']?.text }}
          </ElTag>
        </template>

        <div class="mb-3 text-sm text-gray-500">
          <span>业务编号：{{ instance?.businessNo }}</span>
          <span class="ml-4">发起人：{{ instance?.applicant }}</span>
          <span class="ml-4">申请时间：{{ instance?.applyTime }}</span>
        </div>

        <ElDivider />
        <FormRender
          v-if="templateConfig"
          :form-config="templateConfig"
          :form-data="formData"
          mode="view"
          :seals="sealRecords"
        />
      </ElCard>
    </div>

    <!-- 右侧：审批时间线 -->
    <div class="w-80 flex-shrink-0 overflow-auto">
      <ElCard header="审批进度">
        <ElTimeline v-if="approvalRecords.length > 0">
          <ElTimelineItem
            v-for="r in approvalRecords"
            :key="r.recordId"
            :color="resultColor(r.result)"
            :timestamp="r.approveTime"
          >
            <p class="font-medium">{{ r.nodeName }}</p>
            <p>{{ r.approver }} - {{ resultText(r.result) }}</p>
            <p v-if="r.comment" class="text-sm text-gray-500">{{ r.comment }}</p>
            <p v-if="r.costDuration" class="text-xs text-gray-400">
              耗时 {{ (r.costDuration / 1000 / 60).toFixed(1) }} 分钟
            </p>
          </ElTimelineItem>
        </ElTimeline>
        <ElEmpty v-else description="暂无审批记录" />
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchInstanceDetail, type ApprovalRecord, type SealRecord } from '@/api/process'
import { fetchFormTemplateDetail } from '@/api/form'
import FormRender from '@/components/business/FormRender.vue'

defineOptions({ name: 'ApplicationDetail' })

const route = useRoute()
const instanceId = Number(route.params.id)

const instance = ref<any>(null)
const formData = ref<Record<string, any>>({})
const templateConfig = ref<Record<string, any> | null>(null)
const approvalRecords = ref<ApprovalRecord[]>([])
const sealRecords = ref<SealRecord[]>([])

const statusMap: Record<string, { type: string; text: string }> = {
  '0': { type: 'warning', text: '审批中' },
  '1': { type: 'success', text: '已通过' },
  '2': { type: 'danger', text: '已驳回' },
  '3': { type: 'info', text: '已撤回' }
}

function resultColor(result: string) {
  return { '0': '#67C23A', '1': '#F56C6C', '2': '#E6A23C' }[result] || '#909399'
}
function resultText(result: string) {
  return { '0': '通过', '1': '驳回', '2': '退回' }[result] || '未知'
}

onMounted(async () => {
  const res = await fetchInstanceDetail(instanceId)
  if (res.data) {
    instance.value = res.data.instance
    if (res.data.formData?.formData) {
      formData.value = JSON.parse(res.data.formData.formData)
    }
    if (res.data.instance?.formTemplateId) {
      const tRes = await fetchFormTemplateDetail(res.data.instance.formTemplateId)
      if (tRes.data?.formConfig) {
        templateConfig.value = JSON.parse(tRes.data.formConfig)
      }
    }
    approvalRecords.value = res.data.approvalRecords || []
    sealRecords.value = res.data.sealRecords || []
  }
})
</script>
```

---

### Task 16: 创建待审批页

Create: `F:\webstromWork\seal-approval-web\src\views\process\pending\index.vue`

```vue
<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader :loading="loading" @refresh="refreshData" />

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 审批弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      title="审批"
      width="700px"
      align-center
      @close="handleDialogClose"
    >
      <div>
        <div class="mb-4">
          <p><strong>业务编号：</strong>{{ currentTask?.businessNo }}</p>
          <p><strong>流程标题：</strong>{{ currentTask?.title }}</p>
          <p><strong>发起人：</strong>{{ currentTask?.applicant }}</p>
        </div>
        <ElFormItem label="审批意见" prop="comment">
          <ElInput
            v-model="approvalForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入审批意见"
            maxlength="1000"
            show-word-limit
          />
        </ElFormItem>
      </div>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="warning" :loading="submitting" @click="handleReturn">退回</ElButton>
        <ElButton type="danger" :loading="submitting" @click="handleReject">驳回</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleApprove">通过</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import {
  fetchPendingTaskList, approveTask, rejectTask, returnTask,
  type PendingTask
} from '@/api/process'

defineOptions({ name: 'PendingApproval' })

const {
  loading, data, pagination,
  handleSizeChange, handleCurrentChange, refreshData
} = useTable({
  fetchFn: fetchPendingTaskList
})

const dialogVisible = ref(false)
const submitting = ref(false)
const currentTask = ref<PendingTask | null>(null)
const approvalForm = reactive({ comment: '' })

const columns = [
  { prop: 'businessNo', label: '业务编号', width: 160 },
  { prop: 'title', label: '流程标题', minWidth: 180 },
  { prop: 'applicant', label: '发起人', width: 120 },
  { prop: 'taskName', label: '当前节点', width: 150 },
  { prop: 'applyTime', label: '申请时间', width: 170 },
  {
    label: '操作',
    width: 120,
    fixed: 'right',
    render: (row: PendingTask) => h(ElButton,
      { type: 'primary', size: 'small', onClick: () => openApprove(row) },
      () => '审批'
    )
  }
]

function openApprove(task: PendingTask) {
  currentTask.value = task
  approvalForm.comment = ''
  dialogVisible.value = true
}

function handleDialogClose() {
  currentTask.value = null
}

async function handleApprove() {
  if (!currentTask.value) return
  submitting.value = true
  try {
    await approveTask(currentTask.value.taskId, { comment: approvalForm.comment })
    ElMessage.success('审批通过')
    dialogVisible.value = false
    refreshData()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleReject() {
  if (!currentTask.value) return
  submitting.value = true
  try {
    await rejectTask(currentTask.value.taskId, { comment: approvalForm.comment })
    ElMessage.success('已驳回')
    dialogVisible.value = false
    refreshData()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleReturn() {
  if (!currentTask.value) return
  submitting.value = true
  try {
    await returnTask(currentTask.value.taskId, { comment: approvalForm.comment })
    ElMessage.success('已退回')
    dialogVisible.value = false
    refreshData()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}
</script>
```

---

### Task 17: 创建已审批页

Create: `F:\webstromWork\seal-approval-web\src\views\process\approved\index.vue`

```vue
<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader :loading="loading" @refresh="refreshData" />

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import { fetchApprovedTaskList } from '@/api/process'

defineOptions({ name: 'ApprovedHistory' })

const router = useRouter()

const {
  loading, data, pagination,
  handleSizeChange, handleCurrentChange, refreshData
} = useTable({
  fetchFn: fetchApprovedTaskList
})

const resultMap: Record<string, { type: string; text: string }> = {
  '0': { type: 'success', text: '通过' },
  '1': { type: 'danger', text: '驳回' },
  '2': { type: 'warning', text: '退回' }
}

const columns = [
  { prop: 'nodeName', label: '审批节点', width: 150 },
  { prop: 'comment', label: '审批意见', minWidth: 200, showOverflowTooltip: true },
  {
    prop: 'result',
    label: '审批结果',
    width: 100,
    render: (row: any) => h(ElTag, { type: resultMap[row.result]?.type, size: 'small' },
      () => resultMap[row.result]?.text || '未知')
  },
  { prop: 'approveTime', label: '审批时间', width: 170 }
]
</script>
```

---

## 执行顺序依赖

```
Task 1 (Flowable依赖)
  → Task 2 (DDL)
    → Task 3 (实体) + Task 4 (Mapper)  [可并行]
      → Task 5 (Service)
        → Task 6 (TaskListener) + Task 7 (deploy改造)  [可并行]
          → Task 8 + Task 9 (Controller)  [可并行]
            → Task 10 (前端API)
              → Task 11 (路由+i18n)
                → Task 12 (FormRender)
                  → Task 13-17 (页面)  [可并行]
```

Task 1-2 必须先做（建表 + 依赖）。Task 3-4 可并行。Task 5 依赖 3+4。Task 6-7 可并行。Task 8-9 可并行。前端从 Task 10 开始，Task 13-17 可全部并行开发。
