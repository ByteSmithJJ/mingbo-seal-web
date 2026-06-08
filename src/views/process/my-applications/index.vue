<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
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

    <!-- 重新发起弹窗 -->
    <ElDialog
      v-model="reapplyVisible"
      title="重新发起"
      width="680px"
      align-center
      destroy-on-close
      @close="handleReapplyClose"
    >
      <div v-if="reapplyDef" class="start-dialog">
        <div class="dialog-summary">
          <div class="summary-icon">
            <Icon icon="ri:file-list-3-line" width="22" color="#fff" />
          </div>
          <div class="summary-body">
            <div class="summary-name">{{ reapplyDef.definitionName }}</div>
            <div class="summary-meta">
              <span>{{ reapplyDef.definitionKey }}</span>
              <ElTag size="small" type="success" effect="plain">v{{ reapplyDef.version }}</ElTag>
            </div>
          </div>
        </div>

        <ElForm label-width="100px" class="dialog-form">
          <ElFormItem label="流程标题" required>
            <ElInput
              v-model="reapplyForm.title"
              placeholder="请输入本次申请的标题"
              maxlength="200"
              show-word-limit
            />
          </ElFormItem>

          <div v-if="reapplyLoading" class="dialog-state">
            <Icon icon="ri:loader-4-line" width="22" class="animate-spin" />
            <span>正在加载表单…</span>
          </div>

          <div v-else-if="!reapplyConfig" class="dialog-state dialog-state--hint">
            <Icon icon="ri:information-line" width="18" />
            <span>该流程未绑定表单模板</span>
          </div>

          <div v-else class="dialog-form-section">
            <div class="form-section-header">
              <Icon icon="ri:edit-2-line" width="16" />
              <span>填写表单</span>
            </div>
            <div class="form-section-body">
              <FormRender
                ref="reapplyFormRenderRef"
                :form-config="reapplyConfig"
                :form-data="reapplyFormData"
                mode="edit"
              />
            </div>
          </div>
        </ElForm>
      </div>

      <template #footer>
        <ElButton @click="reapplyVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="reapplySubmitting" @click="handleReapplySubmit">
          提交申请
        </ElButton>
      </template>
    </ElDialog>

    <!-- 查看详情弹窗 -->
    <ElDialog
      v-model="detailVisible"
      :title="detailInstance?.title || '申请详情'"
      width="900px"
      align-center
      destroy-on-close
      top="5vh"
    >
      <div v-loading="detailLoading" class="detail-dialog">
        <template v-if="!detailLoading && detailInstance">
          <!-- 头部摘要 -->
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

          <!-- 三页签 -->
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
                <span class="legend-item">
                  <span class="legend-dot" style="background: #e1f3d8; border-color: #67c23a" />
                  已通过
                </span>
                <span class="legend-item">
                  <span class="legend-dot" style="background: #d9ecff; border-color: #409eff" />
                  当前节点
                </span>
                <span class="legend-item">
                  <span class="legend-dot" style="background: #fde2e2; border-color: #f56c6c" />
                  已驳回
                </span>
                <span class="legend-item">
                  <span class="legend-dot" style="background: #fdf6ec; border-color: #e6a23c" />
                  已撤回
                </span>
                <span class="legend-item">
                  <span class="legend-dot" style="background: #fff; border-color: #ccc" /> 未到达
                </span>
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
                  :color="isLastActive(idx, r.nodeCode) ? '#409EFF' : resultColor(r.result)"
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
                      <span class="timeline-node">
                        {{ r.nodeName }}
                        <ElTag
                          v-if="isLastActive(idx, r.nodeCode)"
                          type="primary"
                          size="small"
                          effect="dark"
                          class="ml-1"
                        >
                          当前
                        </ElTag>
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
                      >
                        {{ resultText(r.result) }}
                      </ElTag>
                    </div>
                    <div class="timeline-approver">
                      <Icon icon="ri:user-line" width="14" class="timeline-icon" />
                      {{ r.approver }}
                    </div>
                    <div v-if="r.comment" class="timeline-comment">
                      <Icon icon="ri:chat-1-line" width="14" class="timeline-icon" />
                      {{ r.comment }}
                    </div>
                    <div v-if="r.costDuration" class="timeline-duration">
                      耗时 {{ (r.costDuration / 1000 / 60).toFixed(1) }} 分钟
                    </div>
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
    fetchMyApplicationList,
    fetchInstanceDetail,
    fetchProcessDefinitionDetail,
    startProcessInstance,
    withdrawInstance
  } from '@/api/process'
  import type { ProcessDefinition } from '@/api/process'
  import { fetchTemplateDetail } from '@/api/form'
  import { Icon } from '@iconify/vue'
  import FormRender from '@/components/business/FormRender.vue'
  import BpmnViewer from '@/components/business/BpmnViewer.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'

  defineOptions({ name: 'MyApplications' })

  const router = useRouter()

  // ========== 状态映射 ==========
  const statusMap: Record<string, { type: string; text: string }> = {
    '0': { type: 'warning', text: '审批中' },
    '1': { type: 'success', text: '已通过' },
    '2': { type: 'danger', text: '已驳回' },
    '3': { type: 'warning', text: '已撤回' }
  }

  // ========== 表格 ==========
  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchMyApplicationList,
      apiParams: { pageNum: 1, pageSize: 10 },
      paginationKey: { current: 'pageNum', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'businessNo', label: '业务编号', width: 160 },
        { prop: 'title', label: '流程标题', minWidth: 180 },
        { prop: 'definitionName', label: '流程名称', width: 140 },
        { prop: 'currentNodeName', label: '当前节点', width: 140 },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: any) => {
            const s = statusMap[row.status] || { type: 'info', text: row.status || '未知' }
            return h(ElTag, { size: 'small', type: s.type }, () => s.text)
          }
        },
        { prop: 'applyTime', label: '申请时间', width: 170 },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          fixed: 'right' as const,
          formatter: (row: any) => {
            const btns = [
              h(ArtButtonTable, { type: 'view', onClick: () => viewDetail(row.instanceId) })
            ]
            if (row.status === '0') {
              btns.push(
                h(ArtButtonTable, {
                  icon: 'ri:arrow-go-back-line',
                  iconColor: 'var(--el-color-warning)',
                  buttonBgColor: 'var(--el-color-warning-light-9)',
                  tooltip: '撤回',
                  onClick: () => handleWithdraw(row)
                })
              )
            }
            if (row.status === '2' || row.status === '3') {
              btns.push(
                h(ArtButtonTable, {
                  icon: 'ri:restart-line',
                  iconColor: 'var(--el-color-success)',
                  buttonBgColor: 'var(--el-color-success-light-9)',
                  tooltip: '重新发起',
                  onClick: () => handleReapply(row)
                })
              )
            }
            return h('div', { class: 'flex items-center gap-1' }, btns)
          }
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
  const searchForm = ref({ title: '', status: '' })

  const searchItems = [
    { key: 'title', type: 'input', label: '流程标题', placeholder: '请输入流程标题' },
    {
      key: 'status',
      type: 'select',
      label: '状态',
      placeholder: '请选择状态',
      props: {
        clearable: true,
        options: [
          { label: '审批中', value: '0' },
          { label: '已通过', value: '1' },
          { label: '已驳回', value: '2' },
          { label: '已撤回', value: '3' }
        ]
      }
    }
  ]

  function handleSearch(params: Record<string, any>) {
    replaceSearchParams(params)
    getData()
  }

  function handleReset() {
    searchForm.value = { title: '', status: '' }
    resetSearchParams()
  }

  // ========== 查看详情弹窗 ==========
  const detailActiveTab = ref('form')
  const detailVisible = ref(false)
  const detailLoading = ref(false)
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

  // 仅标记节点在记录中最后一次出现的位置为"当前"
  function isLastActive(idx: number, nodeCode: string) {
    if (!detailActiveNodes.value.includes(nodeCode)) return false
    // 排除退回记录（退回记录与当前活跃节点共享nodeCode，但不应标为"当前"）
    for (let i = detailRecords.value.length - 1; i >= 0; i--) {
      const r = detailRecords.value[i]
      if (r.nodeCode === nodeCode && r.result !== '2') return i === idx
    }
    return false
  }

  const resultColor = (r: string) =>
    ({
      '3': '#409EFF',
      '0': '#67C23A',
      '1': '#F56C6C',
      '2': '#E6A23C',
      '4': '#E6A23C',
      '5': '#67C23A'
    })[r] || '#909399'
  const resultText = (r: string) =>
    ({ '3': '发起', '0': '通过', '1': '驳回', '2': '退回', '4': '撤回', '5': '自动通过' })[r] ||
    r ||
    '未知'

  async function viewDetail(id: number) {
    detailVisible.value = true
    detailLoading.value = true
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
      const res: any = await fetchInstanceDetail(id)
      console.log('[查看详情] 接口原始返回:', res)
      const payload = res.data || res
      console.log('[查看详情] 解包后 payload keys:', Object.keys(payload || {}))
      const inst = payload.instance || payload
      console.log('[查看详情] instance:', {
        definitionId: inst.definitionId,
        formTemplateId: inst.formTemplateId,
        status: inst.status
      })
      const fd = payload.formData
      console.log('[查看详情] formData:', fd)
      detailInstance.value = inst
      detailRecords.value = payload.approvalRecords || []
      detailSealRecords.value = payload.sealRecords || []
      detailActiveNodes.value = payload.activeNodeIds || inst.activeNodeIds || []
      // 从审批记录中提取已完成节点（排除当前活跃节点，含开始节点）
      // 已完成：排除活跃节点、驳回(1)和退回(2)节点
      detailCompletedNodes.value = detailRecords.value
        .filter((r: any) => r.result !== '1' && r.result !== '2')
        .map((r: any) => r.nodeCode)
        .filter((code: string) => code && !detailActiveNodes.value.includes(code))
      // 流程已通过：标记结束事件（供 BpmnViewer 按类型查找）
      if (inst.status === '1') {
        detailCompletedNodes.value.push('end')
      }
      // 驳回节点：审批结果 result='1' 的节点
      detailRejectedNodes.value = detailRecords.value
        .filter((r: any) => r.result === '1')
        .map((r: any) => r.nodeCode)
      // 已撤回：实例级状态，取审批记录中 result='4'（撤回）的那条记录的 nodeCode
      detailWithdrawnNodes.value = []
      if (inst.status === '3') {
        const wd = detailRecords.value.find((r: any) => r.result === '4')
        if (wd && wd.nodeCode && wd.nodeCode !== 'withdraw') {
          detailWithdrawnNodes.value = [wd.nodeCode]
        }
      }
      console.log(
        '[查看详情] records:',
        detailRecords.value.length,
        'active:',
        detailActiveNodes.value,
        'completed:',
        detailCompletedNodes.value
      )

      // 解析表单数据
      if (fd?.formData) {
        try {
          detailFormData.value =
            typeof fd.formData === 'string' ? JSON.parse(fd.formData) : fd.formData
          console.log('[查看详情] 表单数据已解析:', detailFormData.value)
        } catch (e) {
          console.error('[查看详情] 表单数据解析失败', e)
          detailFormData.value = {}
        }
      } else {
        console.log('[查看详情] 无 fd.formData, fd:', fd)
      }

      // 加载表单模板
      if (inst.formTemplateId) {
        console.log('[查看详情] 正在加载表单模板:', inst.formTemplateId)
        const tRes: any = await fetchTemplateDetail(inst.formTemplateId)
        const tpl = tRes.data || tRes
        console.log('[查看详情] 模板数据:', { hasFormConfig: !!tpl.formConfig, tpl })
        if (tpl.formConfig) {
          detailConfig.value =
            typeof tpl.formConfig === 'string' ? JSON.parse(tpl.formConfig) : tpl.formConfig
          console.log('[查看详情] 表单模板已加载')
        } else {
          console.warn('[查看详情] 模板 formConfig 为空')
        }
      } else {
        console.log('[查看详情] 流程未绑定表单模板 (formTemplateId 为空)')
      }

      // 加载 BPMN XML
      if (inst.definitionId) {
        console.log('[查看详情] 正在加载 BPMN, definitionId:', inst.definitionId)
        const defRes: any = await fetchProcessDefinitionDetail(inst.definitionId)
        const defDetail = defRes.data || defRes
        detailBpmnXml.value = defDetail.bpmnXml || ''
        console.log('[查看详情] BPMN XML 长度:', detailBpmnXml.value.length)
      }
      console.log(
        '[查看详情] 加载完成 — instance:',
        !!detailInstance.value,
        'config:',
        !!detailConfig.value,
        'records:',
        detailRecords.value.length,
        'bpmn:',
        !!detailBpmnXml.value
      )
    } catch (e) {
      console.error('[查看详情] 加载失败', e)
      ElMessage.error('加载详情失败')
      detailVisible.value = false
    } finally {
      detailLoading.value = false
    }
  }

  // ========== 操作 ==========
  async function handleWithdraw(row: any) {
    try {
      await ElMessageBox.confirm('确认撤回该申请？', '提示', { type: 'warning' })
    } catch {
      return
    }
    try {
      await withdrawInstance(row.instanceId)
      ElMessage.success('已撤回')
      refreshData()
    } catch {
      ElMessage.error('撤回失败')
    }
  }

  // ========== 重新发起 ==========
  const reapplyVisible = ref(false)
  const reapplyLoading = ref(false)
  const reapplySubmitting = ref(false)
  const reapplyDef = ref<ProcessDefinition | null>(null)
  const reapplyConfig = ref<Record<string, any> | null>(null)
  const reapplyFormData = ref<Record<string, any>>({})
  const reapplyForm = reactive({ title: '' })
  const reapplyFormRenderRef = ref<InstanceType<typeof FormRender>>()
  let reapplyDefinitionId: number | null = null

  async function handleReapply(row: any) {
    reapplyLoading.value = true
    reapplyVisible.value = true
    reapplyConfig.value = null
    reapplyFormData.value = {}
    reapplyForm.title = row.title || ''

    try {
      const res: any = await fetchInstanceDetail(row.instanceId)
      // HTTP 层解包后 res 即 InstanceDetail: { instance, formData }
      const detail = res.data || res
      const inst = detail.instance || detail
      const fd = detail.formData

      reapplyDefinitionId = inst.definitionId
      // 获取流程定义（拿版本号）
      let version = null
      if (inst.definitionId) {
        try {
          const defRes: any = await fetchProcessDefinitionDetail(inst.definitionId)
          const defDetail = defRes.data || defRes
          version = defDetail.version
        } catch {
          /* ignore */
        }
      }
      reapplyDef.value = {
        definitionId: inst.definitionId,
        definitionName: inst.definitionName,
        definitionKey: inst.definitionKey || '',
        version
      }

      if (inst.formTemplateId) {
        const tplRes: any = await fetchTemplateDetail(inst.formTemplateId)
        const tpl = tplRes.data || tplRes
        if (tpl.formConfig) {
          reapplyConfig.value =
            typeof tpl.formConfig === 'string' ? JSON.parse(tpl.formConfig) : tpl.formConfig
        }
      }

      // 回显历史表单数据
      if (fd?.formData) {
        try {
          reapplyFormData.value =
            typeof fd.formData === 'string' ? JSON.parse(fd.formData) : fd.formData
        } catch {
          reapplyFormData.value = {}
        }
      }
    } catch (e) {
      console.error('[重新发起] 加载失败', e)
      ElMessage.error('加载失败')
      reapplyVisible.value = false
    } finally {
      reapplyLoading.value = false
    }
  }

  function handleReapplyClose() {
    reapplyDef.value = null
    reapplyConfig.value = null
    reapplyFormData.value = {}
    reapplyDefinitionId = null
  }

  async function handleReapplySubmit() {
    if (!reapplyForm.title.trim()) {
      ElMessage.warning('请输入流程标题')
      return
    }
    if (!reapplyDefinitionId) return

    reapplySubmitting.value = true
    try {
      const fd = reapplyFormRenderRef.value?.getFormData?.() || {}
      await startProcessInstance({
        definitionId: reapplyDefinitionId,
        title: reapplyForm.title,
        formData: JSON.stringify(fd)
      })
      ElMessage.success('已重新发起')
      reapplyVisible.value = false
      refreshData()
    } catch (e) {
      console.error('[重新发起] 提交失败', e)
      ElMessage.error('提交失败')
    } finally {
      reapplySubmitting.value = false
    }
  }
</script>

<style lang="scss" scoped>
  // 复用发起弹窗样式
  .start-dialog {
    .dialog-summary {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      margin-bottom: 20px;
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
        line-height: 1.4;
        margin-bottom: 4px;
      }

      .summary-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .dialog-form {
      .el-form-item:last-of-type {
        margin-bottom: 0;
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

      &--hint {
        padding: 14px 16px;
        justify-content: flex-start;
        background: var(--el-color-info-light-9);
        border-radius: 8px;
        color: var(--el-color-info-dark-2);
        font-size: 13px;
      }
    }

    .dialog-form-section {
      margin-top: 20px;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 10px;
      overflow: hidden;

      .form-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
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
  }

  // ==================== 查看详情弹窗 ====================
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

        &:first-child {
          .detail-value {
            font-size: 15px;
            font-weight: 600;
          }
        }
      }

      .detail-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        white-space: nowrap;

        & + .detail-label {
          margin-left: 0;
        }
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
        border-color: inherit;
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
        transition: all 0.2s;

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
