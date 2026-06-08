<!-- 用户管理页面 -->
<template>
  <div class="user-page flex gap-4 h-full">
    <!-- 左侧：部门树 -->
    <div class="flex-shrink-0 w-60 h-full">
      <ElCard class="h-full flex flex-col">
        <template #header>
          <span class="text-sm font-medium">部门列表</span>
          <ElInput
            v-model="deptSearchText"
            class="mt-2"
            size="small"
            placeholder="请输入部门名称"
            clearable
            @input="handleDeptSearch"
          />
        </template>
        <ElScrollbar class="flex-1">
          <ElTree
            ref="treeRef"
            :data="deptTreeData"
            :props="treeProps"
            node-key="id"
            default-expand-all
            highlight-current
            :filter-node-method="filterDeptNode"
            @node-click="handleDeptNodeClick"
          />
        </ElScrollbar>
      </ElCard>
    </div>

    <!-- 右侧：搜索栏 + 用户表格 -->
    <div class="flex flex-col flex-grow min-w-0">
      <UserSearch
        v-model="searchForm"
        :hide-dept="true"
        @search="handleSearch"
        @reset="resetSearchParams"
      />

      <ElCard class="art-table-card">
        <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
          <template #left>
            <ElSpace wrap>
              <ElButton type="primary" @click="showDialog('add')" v-ripple> 新增用户 </ElButton>
              <ElButton :disabled="selectedRows.length === 0" @click="handleBatchDelete" v-ripple>
                批量删除
              </ElButton>
              <ElButton @click="handleExport" v-ripple> 导出 </ElButton>
              <ElButton @click="importDialogVisible = true" v-ripple> 导入 </ElButton>
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

    <!-- 新增/编辑弹窗 -->
    <UserDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :user-data="currentUserData"
      @success="refreshCreate"
    />

    <!-- 角色分配弹窗 -->
    <ElDialog
      v-model="roleDialogVisible"
      title="分配角色"
      width="450px"
      align-center
      @close="handleRoleDialogClose"
    >
      <ElForm label-width="0">
        <ElFormItem>
          <ElCheckboxGroup v-model="selectedRoleIds">
            <ElCheckbox
              v-for="role in allRoleList"
              :key="role.roleId"
              :label="role.roleId"
              :value="role.roleId"
            >
              {{ role.roleName }}
            </ElCheckbox>
          </ElCheckboxGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="roleDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="roleAssigning" @click="handleAssignRole">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 导入弹窗 -->
    <UserImportDialog v-model="importDialogVisible" @success="refreshData" />
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchGetUserList,
    fetchGetUserInfo,
    fetchDeleteUser,
    fetchResetPassword,
    fetchChangeUserStatus,
    fetchGetUserAuthRole,
    fetchAssignUserRole,
    fetchExportUser,
    fetchDeptTree
  } from '@/api/system/user'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import type { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import type { ElTree } from 'element-plus'
  import UserSearch from './modules/user-search.vue'
  import UserDialog from './modules/user-dialog.vue'
  import UserImportDialog from './modules/user-import-dialog.vue'
  import { ElTag, ElMessageBox, ElImage } from 'element-plus'

  defineOptions({ name: 'User' })

  type UserListItem = Api.SystemManage.UserListItem

  // ==================== 部门树 ====================
  const treeRef = ref<InstanceType<typeof ElTree>>()
  const treeProps = { children: 'children', label: 'label' }
  const deptTreeData = ref<Api.SystemManage.DeptTreeNode[]>([])
  const deptSearchText = ref('')
  const selectedDeptId = ref<number | undefined>(undefined)

  const filterDeptNode: (...args: any[]) => boolean = (value: string, data: any) => {
    if (!value) return true
    return (data.label as string)?.includes(value)
  }

  function handleDeptSearch() {
    treeRef.value?.filter(deptSearchText.value)
  }

  function handleDeptNodeClick(node: Api.SystemManage.DeptTreeNode) {
    // 点击已选中的节点 → 取消选中 → 显示全部用户
    if (selectedDeptId.value === node.id) {
      selectedDeptId.value = undefined
      treeRef.value?.setCurrentKey('')
      searchForm.value.deptId = undefined
    } else {
      selectedDeptId.value = node.id
      searchForm.value.deptId = node.id
    }
    // 同步表单参数到 useTable 的 searchParams，并重新请求
    const { daterange, ...rest } = searchForm.value
    const [beginTime, endTime] = Array.isArray(daterange) ? daterange : [null, null]
    const newParams: any = { ...rest }
    if (beginTime && endTime) {
      newParams.params = { beginTime, endTime }
    }
    replaceSearchParams(newParams as any)
    getData()
  }

  onMounted(async () => {
    try {
      deptTreeData.value = await fetchDeptTree()
    } catch {
      // 部门树加载失败，页面仍可正常使用
    }
  })

  // ==================== 弹窗 ====================
  const dialogType = ref<'add' | 'edit'>('add')
  const dialogVisible = ref(false)
  const importDialogVisible = ref(false)
  const currentUserData = ref<UserListItem | undefined>(undefined)

  // 选中行
  const selectedRows = ref<UserListItem[]>([])

  // 角色分配
  const roleDialogVisible = ref(false)
  const roleAssigning = ref(false)
  const assignUserId = ref(0)
  const selectedRoleIds = ref<number[]>([])
  const allRoleList = ref<Api.SystemManage.RoleSimple[]>([])

  // 搜索表单
  const searchForm = ref<Api.SystemManage.UserSearchParams & { daterange?: string[] }>({
    userName: undefined,
    phonenumber: undefined,
    status: undefined,
    deptId: undefined,
    daterange: undefined
  })

  // 状态配置
  const STATUS_CONFIG = {
    '0': { type: 'success' as const, text: '正常' },
    '1': { type: 'danger' as const, text: '停用' }
  } as const

  function getStatusConfig(status: string) {
    return (
      STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || { type: 'info' as const, text: '未知' }
    )
  }

  const SEX_MAP: Record<string, string> = { '0': '男', '1': '女', '2': '未知' }

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
    refreshData,
    refreshCreate
  } = useTable({
    core: {
      apiFn: fetchGetUserList,
      apiParams: {
        pageNum: 1,
        pageSize: 10
      },
      excludeParams: ['daterange'],
      paginationKey: {
        current: 'pageNum',
        size: 'pageSize'
      },
      columnsFactory: () => [
        { type: 'selection', width: 50 },
        { prop: 'userId', label: '用户编号', width: 90 },
        {
          prop: 'userName',
          label: '用户名称',
          minWidth: 120,
          formatter: (row: UserListItem) =>
            h('div', { class: 'flex items-center gap-2' }, [
              h(
                ElImage,
                {
                  class: 'size-8 rounded-full',
                  src: row.avatar || '',
                  previewTeleported: true
                },
                {
                  fallback: () =>
                    h(
                      'div',
                      {
                        class:
                          'size-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500'
                      },
                      row.nickName?.charAt(0) || 'U'
                    )
                }
              ),
              h('span', row.userName)
            ])
        },
        { prop: 'nickName', label: '用户昵称', minWidth: 100 },
        {
          prop: 'dept',
          label: '部门',
          minWidth: 120,
          formatter: (row: UserListItem) => row.dept?.deptName || '-'
        },
        { prop: 'phonenumber', label: '手机号码', width: 130 },
        {
          prop: 'sex',
          label: '性别',
          width: 70,
          formatter: (row: UserListItem) => SEX_MAP[row.sex] || '-'
        },
        {
          prop: 'status',
          label: '状态',
          width: 80,
          formatter: (row: UserListItem) => {
            const config = getStatusConfig(row.status)
            return h(ElTag, { type: config.type, size: 'small' }, () => config.text)
          }
        },
        {
          prop: 'createTime',
          label: '创建时间',
          width: 170,
          sortable: true
        },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          fixed: 'right',
          formatter: (row: UserListItem) =>
            h('div', { class: 'flex items-center gap-1' }, [
              h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
              h(ArtButtonMore, {
                list: [
                  { key: 'resetPwd', label: '重置密码', icon: 'ri:lock-password-line' },
                  { key: 'assignRole', label: '分配角色', icon: 'ri:user-3-line' },
                  {
                    key: 'toggleStatus',
                    label: row.status === '0' ? '停用' : '启用',
                    icon: row.status === '0' ? 'ri:forbid-2-line' : 'ri:checkbox-circle-line'
                  },
                  {
                    key: 'delete',
                    label: '删除',
                    icon: 'ri:delete-bin-4-line',
                    color: '#f56c6c'
                  }
                ],
                onClick: (item: ButtonMoreItem) => handleMoreAction(item, row)
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

  // ==================== 搜索 ====================
  function handleSearch(params: typeof searchForm.value) {
    const { daterange, ...rest } = params
    const [beginTime, endTime] = Array.isArray(daterange) ? daterange : [null, null]
    const newParams: any = { ...rest }
    if (beginTime && endTime) {
      newParams.params = { beginTime, endTime }
    }
    replaceSearchParams(newParams as any)
    getData()
  }

  // ==================== 弹窗 ====================
  async function showDialog(type: 'add' | 'edit', row?: UserListItem) {
    dialogType.value = type
    if (type === 'edit' && row?.userId) {
      try {
        currentUserData.value = await fetchGetUserInfo(row.userId)
      } catch {
        currentUserData.value = row
      }
    } else {
      currentUserData.value = row
    }
    nextTick(() => {
      dialogVisible.value = true
    })
  }

  // ==================== 更多操作 ====================
  async function handleMoreAction(item: ButtonMoreItem, row: UserListItem) {
    switch (item.key) {
      case 'resetPwd':
        await handleResetPassword(row)
        break
      case 'assignRole':
        await openRoleDialog(row)
        break
      case 'toggleStatus':
        await handleToggleStatus(row)
        break
      case 'delete':
        await handleDelete(row)
        break
    }
  }

  // 删除
  async function handleDelete(row: UserListItem) {
    try {
      await ElMessageBox.confirm(`确定要删除用户"${row.userName}"吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await fetchDeleteUser(String(row.userId))
      ElMessage.success('删除成功')
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') {
        return
      }
      ElMessage.error(err?.message || '删除失败')
    }
  }

  // 批量删除
  async function handleBatchDelete() {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请选择要删除的用户')
      return
    }
    const ids = selectedRows.value.map((r) => r.userId).join(',')
    const names = selectedRows.value.map((r) => r.userName).join('、')
    try {
      await ElMessageBox.confirm(
        `确定要删除以下用户吗？<br/><strong>${names}</strong>`,
        '批量删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: true
        }
      )
      await fetchDeleteUser(ids)
      ElMessage.success('删除成功')
      refreshData()
    } catch (err) {
      if (err !== 'cancel') {
        // error handled by HTTP interceptor
      }
    }
  }

  // 重置密码
  async function handleResetPassword(row: UserListItem) {
    try {
      const { value: password } = await ElMessageBox.prompt(
        `请输入用户"${row.userName}"的新密码`,
        '重置密码',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputType: 'password',
          inputValidator: (val) => (!val || val.length < 5 ? '密码长度不能少于5位' : true)
        }
      )
      await fetchResetPassword({ userId: row.userId, password })
      ElMessage.success('密码重置成功')
    } catch (err) {
      if (err !== 'cancel') {
        // error handled by HTTP interceptor
      }
    }
  }

  // 切换状态
  async function handleToggleStatus(row: UserListItem) {
    const newStatus = row.status === '0' ? '1' : '0'
    const actionText = newStatus === '1' ? '停用' : '启用'
    try {
      await ElMessageBox.confirm(
        `确定要${actionText}用户"${row.userName}"吗？`,
        `${actionText}确认`,
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
      await fetchChangeUserStatus({ userId: row.userId, status: newStatus })
      ElMessage.success(`${actionText}成功`)
      refreshData()
    } catch (err) {
      if (err !== 'cancel') {
        // error handled by HTTP interceptor
      }
    }
  }

  // 分配角色
  async function openRoleDialog(row: UserListItem) {
    assignUserId.value = row.userId
    try {
      const data = await fetchGetUserAuthRole(row.userId)
      allRoleList.value = data.roles || []
      selectedRoleIds.value = data.user?.roles?.map((r) => r.roleId) || []
      roleDialogVisible.value = true
    } catch {
      ElMessage.error('获取角色信息失败')
    }
  }

  function handleRoleDialogClose() {
    roleDialogVisible.value = false
    selectedRoleIds.value = []
    allRoleList.value = []
  }

  async function handleAssignRole() {
    roleAssigning.value = true
    try {
      await fetchAssignUserRole({
        userId: assignUserId.value,
        roleIds: selectedRoleIds.value
      })
      ElMessage.success('角色分配成功')
      roleDialogVisible.value = false
      refreshData()
    } catch {
      // error handled by HTTP interceptor
    } finally {
      roleAssigning.value = false
    }
  }

  // 导出
  async function handleExport() {
    try {
      const res = await fetchExportUser(searchForm.value)
      if (res instanceof Blob) {
        const url = window.URL.createObjectURL(res)
        const a = document.createElement('a')
        a.href = url
        a.download = '用户数据.xlsx'
        a.click()
        window.URL.revokeObjectURL(url)
        ElMessage.success('导出成功')
      }
    } catch {
      // error handled by HTTP interceptor
    }
  }

  // 行选择
  function handleSelectionChange(selection: UserListItem[]) {
    selectedRows.value = selection
  }
</script>
