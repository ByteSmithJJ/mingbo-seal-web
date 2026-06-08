<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />

      <ArtTable
        :loading="loading"
        :data="filteredData"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      title="审批"
      width="900px"
      top="5vh"
      align-center
      destroy-on-close
      @close="handleDialogClose"
    >
      <div v-if="currentTask" class="approve-dialog">
        <!-- 摘要 -->
        <div class="dialog-summary">
          <div class="summary-icon">
            <Icon icon="ri:task-line" width="22" color="#fff" />
          </div>
          <div class="summary-body">
            <div class="summary-name">{{ currentTask.title }}</div>
            <div class="summary-meta">
              <span>{{ currentTask.businessNo }}</span>
              <span>发起人：{{ currentTask.applicant }}</span>
              <span>当前节点：{{ currentTask.taskName }}</span>
            </div>
          </div>
        </div>

        <!-- 三页签 -->
        <ElTabs v-model="approveActiveTab" class="approve-tabs">
          <ElTabPane label="表单信息" name="form">
            <div v-if="formLoading" class="dialog-state">
              <Icon icon="ri:loader-4-line" width="22" class="animate-spin" />
              <span>正在加载表单…</span>
            </div>
            <div v-else-if="approveFormConfig" class="detail-form">
              <FormRender
                :form-config="approveFormConfig"
                :form-data="approveFormData"
                :seals="approveSealRecords"
                mode="view"
              />
            </div>
            <ElEmpty v-else description="该流程未绑定表单模板" :image-size="60" />
          </ElTabPane>

          <ElTabPane label="流程图" name="diagram">
            <div v-if="approveActiveTab === 'diagram' && approveBpmnXml" class="diagram-legend">
              <span class="legend-item"
                ><span class="legend-dot" style="background: #e1f3d8; border-color: #67c23a" />
                已通过</span
              >
              <span class="legend-item"
                ><span class="legend-dot" style="background: #d9ecff; border-color: #409eff" />
                当前节点</span
              >
              <span class="legend-item"
                ><span class="legend-dot" style="background: #fde2e2; border-color: #f56c6c" />
                已驳回</span
              >
              <span class="legend-item"
                ><span class="legend-dot" style="background: #fdf6ec; border-color: #e6a23c" />
                已撤回</span
              >
              <span class="legend-item"
                ><span class="legend-dot" style="background: #fff; border-color: #ccc" />
                未到达</span
              >
            </div>
            <BpmnViewer
              v-if="approveActiveTab === 'diagram'"
              :xml="approveBpmnXml"
              :highlight-nodes="approveActiveNodes"
              :completed-nodes="approveCompletedNodes"
            />
          </ElTabPane>

          <ElTabPane label="流转记录" name="records">
            <ElTimeline v-if="approveRecords.length > 0" class="detail-timeline">
              <ElTimelineItem
                v-for="(r, idx) in approveRecords"
                :key="r.recordId"
                :color="
                  isApproveLastActive(idx, r.nodeCode) ? '#409EFF' : approveResultColor(r.result)
                "
                :timestamp="r.approveTime"
                placement="top"
              >
                <div
                  class="timeline-card"
                  :class="{
                    'timeline-card--active': isApproveLastActive(idx, r.nodeCode),
                    'timeline-card--reject': r.result === '1'
                  }"
                >
                  <div class="timeline-title">
                    <span class="timeline-node"
                      >{{ r.nodeName }}
                      <ElTag
                        v-if="isApproveLastActive(idx, r.nodeCode)"
                        type="primary"
                        size="small"
                        effect="dark"
                        class="ml-1"
                        >当前</ElTag
                      >
                    </span>
                    <ElTag
                      :type="
                        r.result === '0'
                          ? 'success'
                          : r.result === '1'
                            ? 'danger'
                            : r.result === '2'
                              ? 'warning'
                              : 'info'
                      "
                      size="small"
                      effect="plain"
                      >{{ approveResultText(r.result) }}</ElTag
                    >
                  </div>
                  <div class="timeline-approver"
                    ><Icon icon="ri:user-line" width="14" class="timeline-icon" />{{
                      r.approver
                    }}</div
                  >
                  <div v-if="r.comment" class="timeline-comment"
                    ><Icon icon="ri:chat-1-line" width="14" class="timeline-icon" />{{
                      r.comment
                    }}</div
                  >
                  <div v-if="r.costDuration" class="timeline-duration"
                    >耗时 {{ (r.costDuration / 1000 / 60).toFixed(1) }} 分钟</div
                  >
                </div>
              </ElTimelineItem>
            </ElTimeline>
            <ElEmpty v-else description="暂无流转记录" :image-size="60" />
          </ElTabPane>
        </ElTabs>

        <!-- 审批意见 -->
        <div class="approve-comment">
          <div class="comment-header">
            <Icon icon="ri:chat-1-line" width="16" />
            <span>审批意见</span>
          </div>
          <ElInput
            v-model="approvalForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入审批意见（必填）"
            maxlength="1000"
            show-word-limit
          />
        </div>
      </div>

      <template #footer>
        <div class="approve-footer">
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <div class="approve-actions">
            <ElTooltip content="返回上一节点，上一审批人修改后可重新提交" placement="top">
              <ElButton type="warning" :loading="submitting" @click="handleReturn">退回</ElButton>
            </ElTooltip>
            <ElTooltip content="直接终止流程，发起人可查看原因后重新发起" placement="top">
              <ElButton type="danger" :loading="submitting" @click="handleReject">驳回</ElButton>
            </ElTooltip>
            <ElButton type="primary" :loading="submitting" @click="handleApprove">通过</ElButton>
          </div>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { h } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchPendingTaskList,
    fetchInstanceDetail,
    fetchProcessDefinitionDetail,
    approveTask,
    rejectTask,
    returnTask,
    type PendingTask
  } from '@/api/process'
  import { fetchTemplateDetail } from '@/api/form'
  import { Icon } from '@iconify/vue'
  import FormRender from '@/components/business/FormRender.vue'
  import BpmnViewer from '@/components/business/BpmnViewer.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { ElMessageBox, ElMessage } from 'element-plus'

  defineOptions({ name: 'PendingApproval' })

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchPendingTaskList,
      apiParams: { pageNum: 1, pageSize: 10 },
      paginationKey: { current: 'pageNum', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'businessNo', label: '业务编号', width: 160 },
        { prop: 'title', label: '流程标题', minWidth: 180 },
        { prop: 'applicant', label: '发起人', width: 120 },
        { prop: 'taskName', label: '当前节点', width: 150 },
        {
          prop: 'applyTime',
          label: '申请时间',
          width: 170,
          formatter: (row: any) => formatDateTime(row.applyTime)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 100,
          fixed: 'right' as const,
          formatter: (row: PendingTask) =>
            h(ArtButtonTable, {
              icon: 'ri:checkbox-circle-line',
              iconColor: 'var(--el-color-primary)',
              buttonBgColor: 'var(--el-color-primary-light-9)',
              tooltip: '审批',
              onClick: () => openApprove(row)
            })
        }
      ]
    },
    transform: {
      responseAdapter: (response: any) => ({
        records: response.rows || [],
        total: response.total || 0
      })
    }
  })

  // ========== 搜索 ==========
  const searchForm = ref({ title: '' })

  const searchItems = [
    { key: 'title', type: 'input', label: '流程标题', placeholder: '请输入流程标题' }
  ]

  const filteredData = computed(() => {
    const kw = (searchForm.value.title || '').toLowerCase().trim()
    if (!kw) return data.value
    return data.value.filter((d: any) => (d.title || '').toLowerCase().includes(kw))
  })

  function handleSearch() {}
  function handleReset() {
    searchForm.value = { title: '' }
  }

  // ========== 时间格式化 ==========
  function formatDateTime(val: string | null) {
    if (!val) return '-'
    // 后端返回的可能是 ISO 格式或带 T 的格式
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  // ========== 审批弹窗 ==========
  const dialogVisible = ref(false)
  const submitting = ref(false)
  const formLoading = ref(false)
  const currentTask = ref<PendingTask | null>(null)
  const approveActiveTab = ref('form')
  const approveFormConfig = ref<Record<string, any> | null>(null)
  const approveFormData = ref<Record<string, any>>({})
  const approveRecords = ref<any[]>([])
  const approveBpmnXml = ref('')
  const approveActiveNodes = ref<string[]>([])
  const approveCompletedNodes = ref<string[]>([])
  const approveSealRecords = ref<any[]>([])
  const approvalForm = reactive({ comment: '' })

  function isApproveLastActive(idx: number, nodeCode: string) {
    if (!approveActiveNodes.value.includes(nodeCode)) return false
    for (let i = approveRecords.value.length - 1; i >= 0; i--) {
      const r = approveRecords.value[i]
      if (r.nodeCode === nodeCode && r.result !== '2') return i === idx
    }
    return false
  }

  const approveResultColor = (r: string) =>
    ({
      '3': '#409EFF',
      '0': '#67C23A',
      '1': '#F56C6C',
      '2': '#E6A23C',
      '4': '#E6A23C',
      '5': '#67C23A'
    })[r] || '#909399'
  const approveResultText = (r: string) =>
    ({ '3': '发起', '0': '通过', '1': '驳回', '2': '退回', '4': '撤回', '5': '自动通过' })[r] ||
    r ||
    '未知'

  async function openApprove(task: PendingTask) {
    currentTask.value = task
    approvalForm.comment = ''
    approveFormConfig.value = null
    approveFormData.value = {}
    approveRecords.value = []
    approveBpmnXml.value = ''
    approveActiveNodes.value = []
    approveCompletedNodes.value = []
    approveActiveTab.value = 'form'
    dialogVisible.value = true

    if (task.instanceId) {
      formLoading.value = true
      try {
        const res: any = await fetchInstanceDetail(task.instanceId)
        const payload = res.data || res
        const inst = payload.instance || payload
        const fd = payload.formData

        if (inst.formTemplateId) {
          const tRes: any = await fetchTemplateDetail(inst.formTemplateId)
          const tpl = tRes.data || tRes
          if (tpl.formConfig) {
            approveFormConfig.value =
              typeof tpl.formConfig === 'string' ? JSON.parse(tpl.formConfig) : tpl.formConfig
          }
        }

        if (fd?.formData) {
          try {
            approveFormData.value =
              typeof fd.formData === 'string' ? JSON.parse(fd.formData) : fd.formData
          } catch {
            approveFormData.value = {}
          }
        }

        // 流转记录
        approveRecords.value = payload.approvalRecords || []
        approveSealRecords.value = payload.sealRecords || []
        approveActiveNodes.value = payload.activeNodeIds || inst.activeNodeIds || []
        // 已完成：排除活跃节点、驳回(1)和退回(2)节点
        approveCompletedNodes.value = approveRecords.value
          .filter((r: any) => r.result !== '1' && r.result !== '2')
          .map((r: any) => r.nodeCode)
          .filter((code: string) => code && !approveActiveNodes.value.includes(code))
        if (inst.status === '1') approveCompletedNodes.value.push('end')

        // 流程图
        if (inst.definitionId) {
          try {
            const defRes: any = await fetchProcessDefinitionDetail(inst.definitionId)
            const defDetail = defRes.data || defRes
            approveBpmnXml.value = defDetail.bpmnXml || ''
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      } finally {
        formLoading.value = false
      }
    }
  }

  function handleDialogClose() {
    currentTask.value = null
    approveFormConfig.value = null
    approveFormData.value = {}
  }

  async function handleApprove() {
    if (!currentTask.value) return
    if (!approvalForm.comment.trim()) {
      ElMessage.warning('请填写审批意见')
      return
    }
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
    if (!approvalForm.comment.trim()) {
      ElMessage.warning('请填写审批意见')
      return
    }
    try {
      await ElMessageBox.confirm('确认驳回该申请？', '驳回确认', { type: 'warning' })
    } catch {
      return
    }
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
    if (!approvalForm.comment.trim()) {
      ElMessage.warning('请填写审批意见')
      return
    }
    try {
      await ElMessageBox.confirm('确认退回该申请？', '退回确认', { type: 'warning' })
    } catch {
      return
    }
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

<style lang="scss" scoped>
  .approve-dialog {
    .dialog-summary {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      margin-bottom: 16px;
      background: var(--el-color-primary-light-9);
      border-radius: 10px;
      border: 1px solid var(--el-color-primary-light-7);

      .summary-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: var(--el-color-primary);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .summary-body {
        flex: 1;
        min-width: 0;
      }

      .summary-name {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .summary-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .dialog-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 28px 0;
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }

    .dialog-form-section {
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 10px;
      overflow: hidden;

      .form-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: var(--el-fill-color-light);
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        border-bottom: 1px solid var(--el-border-color-lighter);
      }

      .form-section-body {
        padding: 16px;
      }
    }

    // 流程图
    .detail-form {
      min-height: 200px;
      max-width: 600px;
      margin: 0 auto;
    }

    .approve-tabs {
      :deep(.el-tabs__header) {
        margin-bottom: 12px;
      }
    }

    .diagram-legend {
      display: flex;
      gap: 20px;
      padding: 10px 16px;
      margin-bottom: 12px;
      background: var(--el-fill-color-lighter);
      border-radius: 8px;
      font-size: 13px;
      color: var(--el-text-color-secondary);

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .legend-dot {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        display: inline-block;
        border: 2px solid;
      }
    }

    // 流转记录
    .detail-timeline {
      padding: 8px 0;
      max-height: 420px;
      overflow-y: auto;

      .timeline-card {
        padding: 12px 16px;
        background: var(--el-fill-color-lighter);
        border-radius: 8px;
        margin-top: 4px;
        border-left: 3px solid transparent;

        &--active {
          background: var(--el-color-primary-light-9);
          border-left-color: var(--el-color-primary);
        }
        &--reject {
          background: var(--el-color-danger-light-9);
          border-left-color: var(--el-color-danger);
        }
      }

      .timeline-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .timeline-node {
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }
      .timeline-approver {
        font-size: 13px;
        color: var(--el-text-color-regular);
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .timeline-comment {
        margin-top: 4px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
        display: flex;
        align-items: flex-start;
        gap: 4px;
        line-height: 1.5;
      }
      .timeline-duration {
        margin-top: 4px;
        font-size: 12px;
        color: var(--el-text-color-disabled);
      }
      .timeline-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }
    }

    // 审批意见
    .approve-comment {
      margin-top: 16px;

      .comment-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: var(--el-fill-color-light);
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        border: 1px solid var(--el-border-color-lighter);
        border-bottom: none;
        border-radius: 10px 10px 0 0;
      }

      :deep(.el-textarea__inner) {
        border-radius: 0 0 10px 10px;
      }
    }
  }

  .approve-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .approve-actions {
      display: flex;
      gap: 8px;
    }
  }
</style>
