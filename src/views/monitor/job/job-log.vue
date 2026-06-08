<!-- 调度日志页面 -->
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
            <ElButton :disabled="selectedRows.length === 0" @click="handleBatchDelete" v-ripple>
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
    <JobDetail v-model:visible="detailVisible" :row="detailRow" type="log" />
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { fetchJobLogList, fetchJobLog, deleteJobLog, cleanJobLog } from '@/api/monitor'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { ElTag, ElMessageBox, ElMessage } from 'element-plus'
  import JobDetail from './detail.vue'

  defineOptions({ name: 'JobLog' })

  type JobLogItem = Api.Monitor.JobLogItem

  const selectedRows = ref<JobLogItem[]>([])
  const detailVisible = ref(false)
  const detailRow = ref<JobLogItem | null>(null)

  const searchForm = ref<Api.Monitor.JobLogSearchParams & { daterange?: string[] }>({
    jobName: undefined,
    jobGroup: undefined,
    status: undefined,
    daterange: undefined
  })

  const jobGroupOptions = [
    { label: '默认', value: 'DEFAULT' },
    { label: '系统', value: 'SYSTEM' }
  ]

  const formItems = computed(() => [
    {
      label: '任务名称',
      key: 'jobName',
      type: 'input',
      props: { placeholder: '请输入任务名称', clearable: true }
    },
    {
      label: '任务分组',
      key: 'jobGroup',
      type: 'select',
      props: { placeholder: '请选择任务分组', options: jobGroupOptions, clearable: true }
    },
    {
      label: '执行状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择执行状态',
        options: [
          { label: '成功', value: '0' },
          { label: '失败', value: '1' }
        ],
        clearable: true
      }
    },
    {
      label: '执行时间',
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
      apiFn: fetchJobLogList,
      apiParams: { pageNum: 1, pageSize: 10 },
      excludeParams: ['daterange'],
      paginationKey: { current: 'pageNum', size: 'pageSize' },
      columnsFactory: () => [
        { type: 'selection', width: 50 },
        { prop: 'jobLogId', label: '日志编号', width: 80 },
        { prop: 'jobName', label: '任务名称', minWidth: 140, showOverflowTooltip: true },
        {
          prop: 'jobGroup',
          label: '任务分组',
          width: 100,
          formatter: (row: JobLogItem) => {
            const map: Record<string, string> = { DEFAULT: '默认', SYSTEM: '系统' }
            return h(ElTag, { size: 'small' }, () => map[row.jobGroup] || row.jobGroup)
          }
        },
        { prop: 'invokeTarget', label: '调用目标', minWidth: 200, showOverflowTooltip: true },
        { prop: 'jobMessage', label: '日志信息', minWidth: 150, showOverflowTooltip: true },
        {
          prop: 'status',
          label: '执行状态',
          width: 90,
          formatter: (row: JobLogItem) =>
            h(ElTag, { type: row.status === '0' ? 'success' : 'danger', size: 'small' }, () =>
              row.status === '0' ? '成功' : '失败'
            )
        },
        { prop: 'createTime', label: '执行时间', width: 170 },
        {
          prop: 'operation',
          label: '操作',
          width: 140,
          fixed: 'right' as const,
          formatter: (row: JobLogItem) =>
            h('div', { class: 'flex items-center gap-1' }, [
              h(ArtButtonTable, {
                type: 'view',
                title: '详情',
                icon: 'ri:file-info-line',
                onClick: () => handleView(row)
              }),
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

  async function handleView(row: JobLogItem) {
    try {
      const res: any = await fetchJobLog(row.jobLogId)
      detailRow.value = res.data || res
      detailVisible.value = true
    } catch {
      // error handled by interceptor
    }
  }

  async function handleDelete(row: JobLogItem) {
    try {
      await ElMessageBox.confirm(
        `确定要删除日志编号为"${row.jobLogId}"的调度日志吗？`,
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      await deleteJobLog(String(row.jobLogId))
      ElMessage.success('删除成功')
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  async function handleBatchDelete() {
    if (selectedRows.value.length === 0) return
    const ids = selectedRows.value.map((r) => r.jobLogId).join(',')
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的${selectedRows.value.length}条调度日志吗？`,
        '批量删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      await deleteJobLog(ids)
      ElMessage.success('删除成功')
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  async function handleClean() {
    try {
      await ElMessageBox.confirm('确定要清空所有调度日志吗？此操作不可恢复！', '清空确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await cleanJobLog()
      ElMessage.success('清空成功')
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  function handleSelectionChange(selection: JobLogItem[]) {
    selectedRows.value = selection
  }
</script>
