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

    <!-- 查看详情弹窗 -->
    <ElDialog
      v-model="detailVisible"
      :title="detailInstance?.title || '审批详情'"
      width="900px"
      top="5vh"
      align-center
      destroy-on-close
      @close="handleDetailClose"
    >
      <div v-loading="detailLoading" class="detail-dialog">
        <template v-if="!detailLoading && detailInstance">
          <div class="detail-header">
            <div class="detail-header-row">
              <span class="detail-label">业务编号</span>
              <span class="detail-value">{{ detailInstance.businessNo }}</span>
              <ElTag :type="statusMap[detailInstance.status]?.type" size="small" effect="dark">
                {{ statusMap[detailInstance.status]?.text }}
              </ElTag>
            </div>
            <div class="detail-header-row">
              <span class="detail-label">流程名称</span>
              <span class="detail-value">{{ detailInstance.definitionName }}</span>
              <span class="detail-label ml-6">发起人</span>
              <span class="detail-value">{{ detailInstance.applicant }}</span>
              <span class="detail-label ml-6">申请时间</span>
              <span class="detail-value">{{ detailInstance.applyTime }}</span>
            </div>
          </div>

          <ElTabs v-model="detailActiveTab" class="detail-tabs">
            <ElTabPane label="表单信息" name="form">
              <div v-if="detailConfig" class="detail-form">
                <FormRender
                  :form-config="detailConfig"
                  :form-data="detailFormData"
                  :seals="detailSealRecords"
                  mode="view"
                />
              </div>
              <ElEmpty v-else description="该流程未绑定表单模板" :image-size="60" />
            </ElTabPane>
            <ElTabPane label="流程图" name="diagram">
              <div v-if="detailActiveTab === 'diagram' && detailBpmnXml" class="diagram-legend">
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
                v-if="detailActiveTab === 'diagram'"
                :xml="detailBpmnXml"
                :highlight-nodes="detailActiveNodes"
                :completed-nodes="detailCompletedNodes"
                :rejected-nodes="detailRejectedNodes"
                :withdrawn-nodes="detailWithdrawnNodes"
              />
            </ElTabPane>
            <ElTabPane label="流转记录" name="records">
              <ElTimeline v-if="detailRecords.length > 0" class="detail-timeline">
                <ElTimelineItem
                  v-for="(r, idx) in detailRecords"
                  :key="r.recordId"
                  :color="isLastActive(idx, r.nodeCode) ? '#409EFF' : detailResultColor(r.result)"
                  :timestamp="r.approveTime"
                  placement="top"
                  :class="{ 'is-active': isLastActive(idx, r.nodeCode) }"
                >
                  <div
                    class="timeline-card"
                    :class="{
                      'timeline-card--active': isLastActive(idx, r.nodeCode),
                      'timeline-card--reject': r.result === '1'
                    }"
                  >
                    <div class="timeline-title">
                      <span class="timeline-node"
                        >{{ r.nodeName }}
                        <ElTag
                          v-if="isLastActive(idx, r.nodeCode)"
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
                        >{{ detailResultText(r.result) }}</ElTag
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
        </template>
      </div>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { h } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchApprovedTaskList,
    fetchInstanceDetail,
    fetchProcessDefinitionDetail
  } from '@/api/process'
  import { fetchTemplateDetail } from '@/api/form'
  import { Icon } from '@iconify/vue'
  import FormRender from '@/components/business/FormRender.vue'
  import BpmnViewer from '@/components/business/BpmnViewer.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'

  defineOptions({ name: 'ApprovedHistory' })

  const resultMap: Record<string, { type: string; text: string }> = {
    '0': { type: 'success', text: '通过' },
    '1': { type: 'danger', text: '驳回' },
    '2': { type: 'warning', text: '退回' }
  }

  const statusMap: Record<string, { type: string; text: string }> = {
    '0': { type: 'warning', text: '审批中' },
    '1': { type: 'success', text: '已通过' },
    '2': { type: 'danger', text: '已驳回' },
    '3': { type: 'warning', text: '已撤回' }
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchApprovedTaskList,
      apiParams: { pageNum: 1, pageSize: 10 },
      paginationKey: { current: 'pageNum', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'businessNo', label: '业务编号', width: 160 },
        { prop: 'title', label: '流程标题', minWidth: 180 },
        { prop: 'applicant', label: '发起人', width: 120 },
        { prop: 'taskName', label: '审批节点', width: 140 },
        {
          prop: 'result',
          label: '审批结果',
          width: 100,
          formatter: (row: any) => {
            const r = resultMap[row.result] || { type: 'info', text: row.result || '未知' }
            return h(ElTag, { size: 'small', type: r.type }, () => r.text)
          }
        },
        {
          prop: 'approveTime',
          label: '审批时间',
          width: 170,
          formatter: (row: any) => formatDateTime(row.approveTime)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 80,
          fixed: 'right' as const,
          formatter: (row: any) =>
            h(ArtButtonTable, { type: 'view', tooltip: '详情', onClick: () => openDetail(row) })
        }
      ]
    },
    transform: {
      responseAdapter: (response: any) => {
        const rows = response.rows || []
        // 同一实例只保留最新一条记录
        const seen = new Set()
        const deduped = []
        for (const r of rows) {
          if (!seen.has(r.instanceId)) {
            seen.add(r.instanceId)
            deduped.push(r)
          }
        }
        return { records: deduped, total: deduped.length }
      }
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

  function formatDateTime(val: string | null) {
    if (!val) return '-'
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  function handleSearch() {
    getData()
  }
  function handleReset() {
    searchForm.value = { title: '' }
    resetSearchParams()
  }

  // ========== 详情弹窗 ==========
  const detailVisible = ref(false)
  const detailLoading = ref(false)
  const detailActiveTab = ref('form')
  const detailInstance = ref<any>(null)
  const detailFormData = ref<Record<string, any>>({})
  const detailConfig = ref<Record<string, any> | null>(null)
  const detailRecords = ref<any[]>([])
  const detailBpmnXml = ref('')
  const detailActiveNodes = ref<string[]>([])
  const detailCompletedNodes = ref<string[]>([])
  const detailRejectedNodes = ref<string[]>([])
  const detailWithdrawnNodes = ref<string[]>([])
  const detailSealRecords = ref<any[]>([])

  const detailResultColor = (r: string) =>
    ({
      '3': '#409EFF',
      '0': '#67C23A',
      '1': '#F56C6C',
      '2': '#E6A23C',
      '4': '#E6A23C',
      '5': '#67C23A'
    })[r] || '#909399'
  const detailResultText = (r: string) =>
    ({ '3': '发起', '0': '通过', '1': '驳回', '2': '退回', '4': '撤回', '5': '自动通过' })[r] ||
    r ||
    '未知'

  function isLastActive(idx: number, nodeCode: string) {
    if (!detailActiveNodes.value.includes(nodeCode)) return false
    for (let i = detailRecords.value.length - 1; i >= 0; i--) {
      const r = detailRecords.value[i]
      if (r.nodeCode === nodeCode && r.result !== '2') return i === idx
    }
    return false
  }

  async function openDetail(row: any) {
    detailVisible.value = true
    detailLoading.value = true
    detailActiveTab.value = 'form'
    detailInstance.value = null
    detailFormData.value = {}
    detailConfig.value = null
    detailRecords.value = []
    detailBpmnXml.value = ''
    detailActiveNodes.value = []
    detailCompletedNodes.value = []
    detailRejectedNodes.value = []
    detailWithdrawnNodes.value = []

    try {
      const res: any = await fetchInstanceDetail(row.instanceId)
      const payload = res.data || res
      const inst = payload.instance || payload
      const fd = payload.formData
      detailInstance.value = inst
      detailRecords.value = payload.approvalRecords || []
      detailSealRecords.value = payload.sealRecords || []
      detailActiveNodes.value = payload.activeNodeIds || inst.activeNodeIds || []

      if (fd?.formData) {
        try {
          detailFormData.value =
            typeof fd.formData === 'string' ? JSON.parse(fd.formData) : fd.formData
        } catch {
          detailFormData.value = {}
        }
      }
      if (inst.formTemplateId) {
        try {
          const tRes: any = await fetchTemplateDetail(inst.formTemplateId)
          const tpl = tRes.data || tRes
          if (tpl.formConfig)
            detailConfig.value =
              typeof tpl.formConfig === 'string' ? JSON.parse(tpl.formConfig) : tpl.formConfig
        } catch {
          /* ignore */
        }
      }

      detailCompletedNodes.value = detailRecords.value
        .filter((r: any) => r.result !== '1' && r.result !== '2')
        .map((r: any) => r.nodeCode)
        .filter((code: string) => code && !detailActiveNodes.value.includes(code))
      if (inst.status === '1') detailCompletedNodes.value.push('end')
      detailRejectedNodes.value = detailRecords.value
        .filter((r: any) => r.result === '1')
        .map((r: any) => r.nodeCode)
      detailWithdrawnNodes.value = []
      if (inst.status === '3') {
        const wd = detailRecords.value.find((r: any) => r.result === '4')
        if (wd && wd.nodeCode && wd.nodeCode !== 'withdraw')
          detailWithdrawnNodes.value = [wd.nodeCode]
      }

      if (inst.definitionId) {
        try {
          const defRes: any = await fetchProcessDefinitionDetail(inst.definitionId)
          const defDetail = defRes.data || defRes
          detailBpmnXml.value = defDetail.bpmnXml || ''
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    } finally {
      detailLoading.value = false
    }
  }

  function handleDetailClose() {
    detailInstance.value = null
    detailConfig.value = null
    detailFormData.value = {}
    detailRecords.value = []
  }
</script>

<style lang="scss" scoped>
  .detail-dialog {
    .detail-header {
      background: var(--el-fill-color-light);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 4px;
      .detail-header-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        line-height: 2;
        .detail-value {
          font-size: 15px;
          font-weight: 600;
        }
      }
      .detail-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        white-space: nowrap;
      }
      .detail-value {
        font-size: 13px;
        color: var(--el-text-color-primary);
        white-space: nowrap;
      }
    }
    .detail-tabs {
      :deep(.el-tabs__header) {
        margin-bottom: 16px;
      }
    }
    .detail-form {
      min-height: 200px;
      max-width: 600px;
      margin: 0 auto;
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
  }
</style>
