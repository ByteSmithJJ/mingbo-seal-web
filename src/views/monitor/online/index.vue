<!-- 在线用户页面 -->
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
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData" />

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
  import { fetchOnlineList, fetchForceLogout } from '@/api/monitor'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { ElMessageBox, ElMessage } from 'element-plus'

  defineOptions({ name: 'Online' })

  type OnlineItem = Api.Monitor.OnlineItem

  const selectedRows = ref<OnlineItem[]>([])

  const searchForm = ref<Api.Monitor.OnlineSearchParams>({
    ipaddr: undefined,
    userName: undefined
  })

  const formItems = computed(() => [
    {
      label: '登录地址',
      key: 'ipaddr',
      type: 'input',
      props: { placeholder: '请输入登录地址', clearable: true }
    },
    {
      label: '用户名称',
      key: 'userName',
      type: 'input',
      props: { placeholder: '请输入用户名称', clearable: true }
    }
  ])

  function formatLoginTime(timestamp: number): string {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const i = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${i}:${s}`
  }

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
      apiFn: fetchOnlineList,
      apiParams: { pageNum: 1, pageSize: 10 },
      paginationKey: { current: 'pageNum', size: 'pageSize' },
      columnsFactory: () => [
        { type: 'selection', width: 50 },
        { prop: 'tokenId', label: '会话编号', minWidth: 200, showOverflowTooltip: true },
        { prop: 'userName', label: '用户名称', width: 100, showOverflowTooltip: true },
        { prop: 'deptName', label: '部门名称', width: 120, showOverflowTooltip: true },
        { prop: 'ipaddr', label: '主机', width: 140 },
        { prop: 'loginLocation', label: '登录地点', minWidth: 120, showOverflowTooltip: true },
        { prop: 'browser', label: '浏览器', minWidth: 100, showOverflowTooltip: true },
        { prop: 'os', label: '操作系统', minWidth: 120, showOverflowTooltip: true },
        {
          prop: 'loginTime',
          label: '登录时间',
          width: 170,
          formatter: (row: OnlineItem) => formatLoginTime(row.loginTime)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 100,
          fixed: 'right' as const,
          formatter: (row: OnlineItem) =>
            h('div', { class: 'flex items-center gap-1' }, [
              h(ArtButtonTable, {
                type: 'delete',
                title: '强退',
                icon: 'ri:logout-box-line',
                onClick: () => handleForceLogout(row)
              })
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

  function handleSearch(params: Record<string, any>) {
    replaceSearchParams(params)
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }

  async function handleForceLogout(row: OnlineItem) {
    try {
      await ElMessageBox.confirm(`确定要强退名称为"${row.userName}"的用户吗？`, '强退确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await fetchForceLogout(row.tokenId)
      ElMessage.success('强退成功')
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  function handleSelectionChange(selection: OnlineItem[]) {
    selectedRows.value = selection
  }
</script>
