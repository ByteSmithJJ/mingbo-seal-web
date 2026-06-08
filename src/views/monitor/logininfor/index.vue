<!-- 登录日志页面 -->
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
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import { fetchLogininforList, fetchDeleteLogininfor, fetchCleanLogininfor, fetchUnlockLoginUser } from '@/api/monitor'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElMessageBox, ElMessage } from 'element-plus'

defineOptions({ name: 'Logininfor' })

type LogininforItem = Api.Monitor.LogininforItem

const selectedRows = ref<LogininforItem[]>([])

const searchForm = ref<Api.Monitor.LogininforSearchParams & { daterange?: string[] }>({
  userName: undefined,
  status: undefined,
  ipaddr: undefined,
  daterange: undefined
})

const formItems = computed(() => [
  { label: '用户名称', key: 'userName', type: 'input', props: { placeholder: '请输入用户名称', clearable: true } },
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
  { label: '登录IP', key: 'ipaddr', type: 'input', props: { placeholder: '请输入登录IP', clearable: true } },
  {
    label: '登录时间',
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
    apiFn: fetchLogininforList,
    apiParams: { pageNum: 1, pageSize: 10 },
    excludeParams: ['daterange'],
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'selection', width: 50 },
      { prop: 'infoId', label: '日志编号', width: 90 },
      { prop: 'userName', label: '用户名称', width: 100 },
      {
        prop: 'status',
        label: '状态',
        width: 80,
        formatter: (row: LogininforItem) =>
          h(ElTag, { type: row.status == '0' ? 'success' : 'danger', size: 'small' }, () => row.status == '0' ? '成功' : '失败')
      },
      { prop: 'ipaddr', label: '登录IP', width: 140 },
      { prop: 'loginLocation', label: '登录地点', minWidth: 130, showOverflowTooltip: true },
      { prop: 'browser', label: '浏览器', minWidth: 120, showOverflowTooltip: true },
      { prop: 'os', label: '操作系统', minWidth: 120, showOverflowTooltip: true },
      { prop: 'msg', label: '提示信息', minWidth: 150, showOverflowTooltip: true },
      { prop: 'loginTime', label: '登录时间', width: 170 },
      {
        prop: 'operation',
        label: '操作',
        width: 180,
        fixed: 'right' as const,
        formatter: (row: LogininforItem) =>
          h('div', { class: 'flex items-center gap-1' }, [
            h(ArtButtonTable, { type: 'view', title: '解锁', icon: 'ri:lock-unlock-line', onClick: () => handleUnlock(row) }),
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

async function handleUnlock(row: LogininforItem) {
  try {
    await ElMessageBox.confirm(`确定要解锁用户"${row.userName}"吗？`, '解锁确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchUnlockLoginUser(row.userName)
    ElMessage.success('解锁成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleDelete(row: LogininforItem) {
  try {
    await ElMessageBox.confirm(`确定要删除日志编号为"${row.infoId}"的登录日志吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteLogininfor(String(row.infoId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) return
  const ids = selectedRows.value.map((r) => r.infoId).join(',')
  try {
    await ElMessageBox.confirm(`确定要删除选中的${selectedRows.value.length}条登录日志吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteLogininfor(ids)
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleClean() {
  try {
    await ElMessageBox.confirm('确定要清空所有登录日志吗？此操作不可恢复！', '清空确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchCleanLogininfor()
    ElMessage.success('清空成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

function handleSelectionChange(selection: LogininforItem[]) {
  selectedRows.value = selection
}
</script>
