<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="showDialog('add')" v-ripple>新增授权</ElButton>
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

    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增授权' : '编辑授权'"
      width="600px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <ElFormItem label="印章" prop="sealId">
          <ElSelect v-model="form.sealId" placeholder="请选择印章" class="w-full" filterable>
            <ElOption v-for="s in sealOptions" :key="s.sealId" :label="s.sealName" :value="s.sealId!" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="授权对象类型" prop="targetType">
          <ElSelect v-model="form.targetType" placeholder="请选择对象类型" class="w-full" @change="onTargetTypeChange">
            <ElOption label="部门" value="dept" />
            <ElOption label="角色" value="role" />
            <ElOption label="岗位" value="post" />
            <ElOption label="用户" value="user" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="授权对象" prop="targetId">
          <ElSelect v-model="form.targetId" :key="form.targetType" :placeholder="form.targetType ? '请选择' : '请先选择对象类型'" class="w-full" filterable :disabled="!form.targetType">
            <ElOption v-for="item in targetOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="授权类型" prop="authType">
          <ElSelect v-model="form.authType" placeholder="请选择授权类型" class="w-full">
            <ElOption label="管理权" value="manage" />
            <ElOption label="申请权" value="apply" />
            <ElOption label="使用权" value="use" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="授权开始时间">
          <ElDatePicker v-model="form.beginTime" type="datetime" placeholder="选择开始时间" class="w-full" value-format="YYYY-MM-DD HH:mm:ss" />
        </ElFormItem>
        <ElFormItem label="授权结束时间">
          <ElDatePicker v-model="form.endTime" type="datetime" placeholder="留空表示永久" class="w-full" value-format="YYYY-MM-DD HH:mm:ss" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="form.status">
            <ElRadio value="0">启用</ElRadio>
            <ElRadio value="1">停用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" type="textarea" placeholder="请输入备注" maxlength="500" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import {
  fetchAuthorizationList,
  createAuthorization,
  updateAuthorization,
  deleteAuthorization,
  fetchSealList,
  type SealAuthorization,
  type SealInfo
} from '@/api/seal'
import { fetchDeptList } from '@/api/system/dept'
import { fetchRoleList } from '@/api/system/role'
import { fetchPostList } from '@/api/system/post'
import { fetchGetUserList } from '@/api/system/user'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'SealAuthorization' })

const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const currentRow = ref<SealAuthorization | null>(null)
const sealOptions = ref<SealInfo[]>([])
const targetOptions = ref<{ label: string; value: number }[]>([])

const targetTypeMap: Record<string, string> = { dept: '部门', role: '角色', post: '岗位', user: '用户' }
const authTypeMap: Record<string, string> = { manage: '管理权', apply: '申请权', use: '使用权' }

const form = reactive<any>({
  sealId: undefined,
  targetType: '',
  targetId: undefined,
  authType: '',
  beginTime: '',
  endTime: '',
  status: '0',
  remark: ''
})

const rules = reactive<FormRules>({
  sealId: [{ required: true, message: '请选择印章', trigger: 'change' }],
  targetType: [{ required: true, message: '请选择对象类型', trigger: 'change' }],
  targetId: [{ required: true, message: '请选择授权对象', trigger: 'change' }],
  authType: [{ required: true, message: '请选择授权类型', trigger: 'change' }]
})

const {
  columns,
  columnChecks,
  data,
  loading,
  pagination,
  getData,
  handleSizeChange,
  handleCurrentChange,
  refreshData
} = useTable({
  core: {
    apiFn: fetchAuthorizationList,
    apiParams: { pageNum: 1, pageSize: 10 },
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { prop: 'authId', label: 'ID', width: 80 },
      { prop: 'sealName', label: '印章名称', minWidth: 140 },
      {
        prop: 'targetType',
        label: '对象类型',
        width: 100,
        formatter: (row: any) => h(ElTag, { size: 'small' }, () => targetTypeMap[row.targetType] || row.targetType)
      },
      { prop: 'targetId', label: '对象ID', width: 100 },
      {
        prop: 'authType',
        label: '授权类型',
        width: 100,
        formatter: (row: any) => {
          const colors: Record<string, string> = { manage: 'danger', apply: 'warning', use: 'success' }
          return h(ElTag, { size: 'small', type: colors[row.authType] || 'info' }, () => authTypeMap[row.authType] || row.authType)
        }
      },
      {
        prop: 'status',
        label: '状态',
        width: 80,
        formatter: (row: any) =>
          h(ElTag, { size: 'small', type: row.status === '0' ? 'success' : 'danger' }, () => row.status === '0' ? '启用' : '停用')
      },
      { prop: 'createTime', label: '创建时间', width: 170 },
      {
        prop: 'operation',
        label: '操作',
        width: 150,
        fixed: 'right' as const,
        formatter: (row: any) =>
          h('div', { class: 'flex items-center gap-1' }, [
            h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
            h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
          ])
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

async function loadSealOptions() {
  try {
    const res = await fetchSealList({ status: '0', pageSize: 100 })
    sealOptions.value = (res.rows || []) as SealInfo[]
  } catch { /* ignore */ }
}

async function onTargetTypeChange() {
  form.targetId = undefined
  targetOptions.value = []
  if (!form.targetType) return
  await loadTargetOptions()
}

async function loadTargetOptions() {
  try {
    const params = { pageNum: 1, pageSize: 200 }
    let res: any
    switch (form.targetType) {
      case 'dept': {
        res = await fetchDeptList({ status: '0' })
        targetOptions.value = (res as any).data?.map((d: any) => ({ label: d.deptName, value: d.deptId })) || []
        break
      }
      case 'role': {
        res = await fetchRoleList({ ...params, status: '0' })
        targetOptions.value = ((res as any).rows || []).map((r: any) => ({ label: r.roleName, value: r.roleId }))
        break
      }
      case 'post': {
        res = await fetchPostList({ ...params, status: '0' })
        targetOptions.value = ((res as any).rows || []).map((p: any) => ({ label: p.postName, value: p.postId }))
        break
      }
      case 'user': {
        res = await fetchGetUserList({ ...params, status: '0' })
        targetOptions.value = ((res as any).rows || []).map((u: any) => ({ label: `${u.nickName} (${u.userName})`, value: u.userId }))
        break
      }
    }
  } catch { /* ignore */ }
}

async function showDialog(type: 'add' | 'edit', row?: any) {
  dialogType.value = type
  if (type === 'edit' && row) {
    currentRow.value = row
    // 先设 targetType 再加载选项（不设 targetId，避免被 onTargetTypeChange 清空）
    form.targetType = row.targetType || ''
    await loadTargetOptions()
    // 选项就绪后再赋值 targetId，确保下拉框能匹配
    Object.assign(form, {
      sealId: row.sealId,
      targetType: row.targetType || '',
      targetId: row.targetId,
      authType: row.authType || '',
      beginTime: row.beginTime || '',
      endTime: row.endTime || '',
      status: row.status || '0',
      remark: row.remark || ''
    })
    dialogVisible.value = true
    nextTick(() => formRef.value?.clearValidate())
  } else {
    currentRow.value = null
    Object.assign(form, { sealId: undefined, targetType: '', targetId: undefined, authType: '', beginTime: '', endTime: '', status: '0', remark: '' })
    targetOptions.value = []
    dialogVisible.value = true
    nextTick(() => formRef.value?.clearValidate())
  }
}

function handleDialogClose() {
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }

  submitting.value = true
  try {
    if (currentRow.value?.authId) {
      await updateAuthorization({ ...form, authId: currentRow.value.authId } as SealAuthorization)
    } else {
      await createAuthorization({ ...form } as SealAuthorization)
    }
    ElMessage.success(dialogType.value === 'add' ? '新增成功' : '修改成功')
    dialogVisible.value = false
    refreshData()
  } catch {
    // handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该授权记录吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteAuthorization(String(row.authId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

onMounted(() => {
  loadSealOptions()
  getData()
})
</script>
