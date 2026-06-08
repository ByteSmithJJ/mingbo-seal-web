<!-- 角色管理页面 -->
<template>
  <div class="art-full-height">
    <RoleSearch
      v-show="showSearchBar"
      v-model="searchForm"
      @search="handleSearch"
      @reset="resetSearchParams"
    ></RoleSearch>

    <ElCard class="art-table-card" :style="{ 'margin-top': showSearchBar ? '12px' : '0' }">
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="refreshData"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton @click="showDialog('add')" v-ripple>新增角色</ElButton>
            <ElButton @click="handleExport" v-ripple>导出</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
      </ArtTable>
    </ElCard>

    <!-- 角色编辑弹窗 -->
    <RoleEditDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :role-data="currentRoleData"
      @success="refreshData"
    />

    <!-- 数据权限弹窗 -->
    <RoleDataScopeDialog
      :key="dataScopeKey"
      v-model="dataScopeDialog"
      :role-data="currentRoleData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import { fetchRoleList, fetchDeleteRole, fetchExportRole } from '@/api/system/role'
  import RoleSearch from './modules/role-search.vue'
  import RoleEditDialog from './modules/role-edit-dialog.vue'
  import RoleDataScopeDialog from './modules/role-data-scope-dialog.vue'
  import { ElTag, ElMessageBox, ElButton, ElTooltip } from 'element-plus'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'

  defineOptions({ name: 'Role' })

  type RoleListItem = Api.SystemManage.RoleListItem
  type RoleSearchFormParams = Api.SystemManage.RoleSearchParams & {
    daterange?: string[]
  }

  // 搜索表单
  const searchForm = ref<RoleSearchFormParams>({
    roleName: '',
    roleKey: '',
    status: '',
    daterange: undefined
  })

  const showSearchBar = ref(true)

  const dialogVisible = ref(false)
  const dataScopeDialog = ref(false)
  const dataScopeKey = ref(0)
  const currentRoleData = ref<RoleListItem | undefined>(undefined)

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
    // 核心配置
    core: {
      apiFn: fetchRoleList,
      apiParams: {
        current: 1,
        size: 20
      },
      // 排除 apiParams 中的属性
      excludeParams: ['daterange'],
      columnsFactory: () => [
        {
          prop: 'roleId',
          label: '角色编号',
          width: 100
        },
        {
          prop: 'roleName',
          label: '角色名称',
          minWidth: 120
        },
        {
          prop: 'roleKey',
          label: '权限字符',
          minWidth: 120
        },
        {
          prop: 'roleSort',
          label: '显示顺序',
          width: 100
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (row: RoleListItem) => {
            const statusConfig =
              row.status === '0'
                ? { type: 'success', text: '正常' }
                : { type: 'danger', text: '停用' }
            return h(
              ElTag,
              { type: statusConfig.type as 'success' | 'danger', size: 'small' },
              () => statusConfig.text
            )
          }
        },
        {
          prop: 'createTime',
          label: '创建时间',
          width: 180,
          sortable: true,
          formatter: (row: RoleListItem) => {
            if (!row.createTime) return ''
            const d = new Date(row.createTime)
            const pad = (n: number) => String(n).padStart(2, '0')
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
          }
        },
        {
          prop: 'operation',
          label: '操作',
          width: 140,
          fixed: 'right' as const,
          formatter: (row: RoleListItem) => {
            const buttons = [
              h(ElTooltip, { content: '数据权限', placement: 'top' }, () =>
                h(
                  ElButton,
                  {
                    size: 'small',
                    circle: true,
                    text: true,
                    onClick: () => showDataScopeDialog(row)
                  },
                  () => h(ArtSvgIcon, { icon: 'ri:shield-check-line' })
                )
              ),
              h(ElTooltip, { content: '编辑', placement: 'top' }, () =>
                h(
                  ElButton,
                  {
                    size: 'small',
                    circle: true,
                    text: true,
                    onClick: () => showDialog('edit', row)
                  },
                  () => h(ArtSvgIcon, { icon: 'ri:edit-2-line' })
                )
              )
            ]
            if (row.roleId !== 1) {
              buttons.push(
                h(ElTooltip, { content: '删除', placement: 'top' }, () =>
                  h(
                    ElButton,
                    {
                      size: 'small',
                      circle: true,
                      text: true,
                      onClick: () => deleteRole(row)
                    },
                    () => h(ArtSvgIcon, { icon: 'ri:delete-bin-4-line' })
                  )
                )
              )
            }
            return h('div', { class: 'flex gap-0.5' }, buttons)
          }
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

  const dialogType = ref<'add' | 'edit'>('add')

  const showDialog = (type: 'add' | 'edit', row?: RoleListItem) => {
    dialogVisible.value = true
    dialogType.value = type
    currentRoleData.value = row
  }

  /**
   * 搜索处理
   * @param params 搜索参数
   */
  const handleSearch = (params: RoleSearchFormParams) => {
    const { daterange, ...filtersParams } = params
    const [start, end] = Array.isArray(daterange) ? daterange : [null, null]

    const searchParams: any = { ...filtersParams }
    if (start && end) {
      searchParams.params = {
        beginTime: start + ' 00:00:00',
        endTime: end + ' 23:59:59'
      }
    }

    replaceSearchParams(searchParams)
    getData()
  }

  const showDataScopeDialog = (row?: RoleListItem) => {
    dataScopeKey.value++
    currentRoleData.value = row
    dataScopeDialog.value = true
  }

  const handleExport = async () => {
    try {
      const res = await fetchExportRole(searchForm.value)
      if (res instanceof Blob) {
        const url = window.URL.createObjectURL(res)
        const a = document.createElement('a')
        a.href = url
        a.download = '角色数据.xlsx'
        a.click()
        window.URL.revokeObjectURL(url)
        ElMessage.success('导出成功')
      }
    } catch {
      // error handled by HTTP interceptor
    }
  }

  const deleteRole = (row: RoleListItem) => {
    ElMessageBox.confirm(`确定删除角色"${row.roleName}"吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => fetchDeleteRole(String(row.roleId)))
      .then(() => {
        ElMessage.success('删除成功')
        refreshData()
      })
      .catch((err) => {
        if (err !== 'cancel') {
          ElMessage.info('已取消删除')
        }
      })
  }
</script>
