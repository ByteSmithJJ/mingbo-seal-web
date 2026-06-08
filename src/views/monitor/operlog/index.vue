<!-- 操作日志页面 -->
<template>
  <div class="art-full-height">
    <ArtSearchBar
      ref="searchBarRef"
      v-model="searchForm"
      :items="formItems"
      :rules="{}"
      @reset="handleReset"
      @search="handleSearch"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              :disabled="selectedRows.length === 0"
              @click="handleBatchDelete"
              v-ripple
            >
              批量删除
            </ElButton>
            <ElButton type="danger" plain @click="handleClean" v-ripple>清空</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 详情弹窗 -->
    <ElDialog
      v-model="detailVisible"
      title="操作日志详情"
      width="800px"
      align-center
    >
      <ElDescriptions v-if="detailRow" :column="2" border>
        <ElDescriptionsItem label="操作ID">{{ detailRow.operId }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作模块">{{ detailRow.title }}</ElDescriptionsItem>
        <ElDescriptionsItem label="业务类型">
          <ElTag size="small">{{ businessTypeMap[detailRow.businessType] || detailRow.businessType }}</ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="请求方式">{{ detailRow.requestMethod }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作人员">{{ detailRow.operName }}</ElDescriptionsItem>
        <ElDescriptionsItem label="部门名称">{{ detailRow.deptName }}</ElDescriptionsItem>
        <ElDescriptionsItem label="请求URL" :span="2">{{ detailRow.operUrl }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作IP">{{ detailRow.operIp }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作地点">{{ detailRow.operLocation }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作时间">{{ detailRow.operTime }}</ElDescriptionsItem>
        <ElDescriptionsItem label="耗时">{{ detailRow.costTime }}ms</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="detailRow.status === 0 ? 'success' : 'danger'" size="small">
            {{ detailRow.status === 0 ? '成功' : '失败' }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="操作方法" :span="2">{{ detailRow.method }}</ElDescriptionsItem>
        <ElDescriptionsItem label="请求参数" :span="2">
          <div style="max-height: 200px; overflow: auto; white-space: pre-wrap; font-size: 12px; background: #f5f7fa; padding: 8px; border-radius: 4px;">{{ detailRow.operParam || '-' }}</div>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="返回结果" :span="2">
          <div style="max-height: 200px; overflow: auto; white-space: pre-wrap; font-size: 12px; background: #f5f7fa; padding: 8px; border-radius: 4px;">{{ detailRow.jsonResult || '-' }}</div>
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="detailRow.errorMsg" label="错误信息" :span="2">
          <span style="color: #f56c6c;">{{ detailRow.errorMsg }}</span>
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import { fetchOperLogList, fetchDeleteOperLog, fetchCleanOperLog } from '@/api/monitor'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElMessageBox, ElMessage } from 'element-plus'

defineOptions({ name: 'Operlog' })

type OperLogItem = Api.Monitor.OperLogItem

const selectedRows = ref<OperLogItem[]>([])
const detailVisible = ref(false)
const detailRow = ref<OperLogItem | null>(null)

const businessTypeMap: Record<number, string> = {
  1: '新增',
  2: '修改',
  3: '删除',
  4: '授权',
  5: '导出',
  6: '导入',
  7: '强退',
  8: '生成代码',
  9: '清空'
}

const searchForm = ref<Api.Monitor.OperLogSearchParams & { daterange?: string[] }>({
  title: undefined,
  businessType: undefined,
  status: undefined,
  operName: undefined,
  daterange: undefined
})

const businessTypeOptions = Object.entries(businessTypeMap).map(([value, label]) => ({ label, value: Number(value) }))

const formItems = computed(() => [
  { label: '操作模块', key: 'title', type: 'input', props: { placeholder: '请输入操作模块', clearable: true } },
  {
    label: '业务类型',
    key: 'businessType',
    type: 'select',
    props: { placeholder: '业务类型', options: businessTypeOptions, clearable: true }
  },
  {
    label: '状态',
    key: 'status',
    type: 'select',
    props: {
      placeholder: '状态',
      options: [
        { label: '成功', value: 0 },
        { label: '失败', value: 1 }
      ],
      clearable: true
    }
  },
  { label: '操作人员', key: 'operName', type: 'input', props: { placeholder: '请输入操作人员', clearable: true } },
  {
    label: '操作时间',
    key: 'daterange',
    type: 'datetime',
    props: {
      type: 'datetimerange',
      rangeSeparator: '至',
      startPlaceholder: '开始时间',
      endPlaceholder: '结束时间',
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
      defaultTime: [new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]
    }
  }
])

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
    apiFn: fetchOperLogList,
    apiParams: { pageNum: 1, pageSize: 10 },
    excludeParams: ['daterange'],
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'selection', width: 50 },
      { prop: 'operId', label: '日志编号', width: 90 },
      { prop: 'title', label: '操作模块', minWidth: 120, showOverflowTooltip: true },
      {
        prop: 'businessType',
        label: '业务类型',
        width: 100,
        formatter: (row: OperLogItem) =>
          h(ElTag, { size: 'small' }, () => businessTypeMap[row.businessType] || row.businessType)
      },
      { prop: 'requestMethod', label: '请求方式', width: 80 },
      {
        prop: 'status',
        label: '状态',
        width: 80,
        formatter: (row: OperLogItem) =>
          h(ElTag, { type: row.status === 0 ? 'success' : 'danger', size: 'small' }, () => row.status === 0 ? '成功' : '失败')
      },
      { prop: 'operName', label: '操作人员', width: 100 },
      { prop: 'deptName', label: '部门', width: 100, showOverflowTooltip: true },
      { prop: 'operIp', label: '操作IP', width: 140 },
      { prop: 'operLocation', label: '操作地点', minWidth: 120, showOverflowTooltip: true },
      { prop: 'operTime', label: '操作时间', width: 170 },
      { prop: 'costTime', label: '耗时(ms)', width: 90 },
      {
        prop: 'operation',
        label: '操作',
        width: 160,
        fixed: 'right' as const,
        formatter: (row: OperLogItem) =>
          h('div', { class: 'flex items-center gap-1' }, [
            h(ArtButtonTable, { type: 'view', title: '详情', icon: 'ri:file-info-line', onClick: () => handleViewDetail(row) }),
            h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
          ])
      }
    ]
  },
  transform: {
    responseAdapter: (response: any) => ({
      records: response.rows || [],
      total: response.total || 0,
      current: undefined as any,
      size: undefined as any
    })
  }
})

function handleSearch(searchParams: Record<string, any>) {
  const { daterange, ...rest } = searchParams
  const [beginTime, endTime] = Array.isArray(daterange) ? daterange : [undefined, undefined]
  const newParams: any = { ...rest }
  if (beginTime && endTime) {
    newParams.params = { beginTime, endTime }
  }
  replaceSearchParams(newParams)
  getData()
}

function handleReset() {
  resetSearchParams()
}

function handleViewDetail(row: OperLogItem) {
  detailRow.value = row
  detailVisible.value = true
}

async function handleDelete(row: OperLogItem) {
  try {
    await ElMessageBox.confirm(`确定要删除日志编号为"${row.operId}"的操作日志吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteOperLog(String(row.operId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) return
  const ids = selectedRows.value.map((r) => r.operId).join(',')
  try {
    await ElMessageBox.confirm(`确定要删除选中的${selectedRows.value.length}条操作日志吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteOperLog(ids)
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleClean() {
  try {
    await ElMessageBox.confirm('确定要清空所有操作日志吗？此操作不可恢复！', '清空确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchCleanOperLog()
    ElMessage.success('清空成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

function handleSelectionChange(selection: OperLogItem[]) {
  selectedRows.value = selection
}
</script>
