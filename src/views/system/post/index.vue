<!-- 岗位管理页面 -->
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
            <ElButton type="primary" @click="showDialog('add')" v-ripple>
              新增
            </ElButton>
            <ElButton
              :disabled="selectedRows.length === 0"
              @click="handleBatchDelete"
              v-ripple
            >
              批量删除
            </ElButton>
            <ElButton @click="handleExport" v-ripple>导出</ElButton>
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

    <!-- 新增/编辑弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加岗位' : '修改岗位'"
      width="500px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="岗位名称" prop="postName">
          <ElInput v-model="form.postName" placeholder="请输入岗位名称" />
        </ElFormItem>
        <ElFormItem label="岗位编码" prop="postCode">
          <ElInput v-model="form.postCode" placeholder="请输入编码名称" />
        </ElFormItem>
        <ElFormItem label="岗位顺序" prop="postSort">
          <ElInputNumber v-model="form.postSort" :min="0" controls-position="right" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="岗位状态">
          <ElRadioGroup v-model="form.status">
            <ElRadio value="0">正常</ElRadio>
            <ElRadio value="1">停用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" type="textarea" :rows="2" placeholder="请输入内容" />
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
import { fetchPostList, fetchPost, fetchAddPost, fetchUpdatePost, fetchDeletePost, fetchPostExport } from '@/api/system/post'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'Post' })

type PostItem = Api.SystemManage.PostItem

const selectedRows = ref<PostItem[]>([])
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const searchForm = ref<Api.SystemManage.PostSearchParams>({
  postCode: '',
  postName: '',
  status: ''
})

const form = reactive<Api.SystemManage.PostFormData>({
  postCode: '',
  postName: '',
  postSort: 0,
  status: '0',
  remark: ''
})

const rules = reactive<FormRules>({
  postName: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
  postCode: [{ required: true, message: '岗位编码不能为空', trigger: 'blur' }],
  postSort: [{ required: true, message: '岗位顺序不能为空', trigger: 'blur' }]
})

const statusOptions = [{ label: '正常', value: '0' }, { label: '停用', value: '1' }]

const formItems = computed(() => [
  { label: '岗位编码', key: 'postCode', type: 'input', props: { placeholder: '请输入岗位编码', clearable: true } },
  { label: '岗位名称', key: 'postName', type: 'input', props: { placeholder: '请输入岗位名称', clearable: true } },
  {
    label: '状态',
    key: 'status',
    type: 'select',
    props: { placeholder: '岗位状态', options: statusOptions, clearable: true }
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
    apiFn: fetchPostList,
    apiParams: { pageNum: 1, pageSize: 10 },
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'selection', width: 50 },
      { prop: 'postId', label: '岗位编号', width: 100 },
      { prop: 'postCode', label: '岗位编码', minWidth: 120 },
      { prop: 'postName', label: '岗位名称', minWidth: 120 },
      { prop: 'postSort', label: '岗位排序', width: 100 },
      {
        prop: 'status',
        label: '状态',
        width: 80,
        formatter: (row: PostItem) =>
          h(ElTag, { type: row.status === '0' ? 'success' : 'danger', size: 'small' }, () => row.status === '0' ? '正常' : '停用')
      },
      { prop: 'createTime', label: '创建时间', width: 170 },
      {
        prop: 'operation',
        label: '操作',
        width: 150,
        fixed: 'right' as const,
        formatter: (row: PostItem) =>
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
      total: response.total || 0,
      current: undefined as any,
      size: undefined as any
    })
  }
})

function handleSearch() {
  replaceSearchParams(searchForm.value)
  getData()
}

function handleReset() {
  searchForm.value = { postCode: '', postName: '', status: '' }
  resetSearchParams()
}

function showDialog(type: 'add' | 'edit', row?: PostItem) {
  dialogType.value = type
  if (type === 'edit' && row) {
    fetchPost(row.postId).then((res: any) => {
      const d = res.data || res
      Object.assign(form, {
        postId: d.postId,
        postCode: d.postCode || '',
        postName: d.postName || '',
        postSort: d.postSort || 0,
        status: d.status || '0',
        remark: d.remark || ''
      })
    })
  } else {
    Object.assign(form, { postId: undefined, postCode: '', postName: '', postSort: 0, status: '0', remark: '' })
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function handleDialogClose() {
  dialogVisible.value = false
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch { return }

  submitting.value = true
  try {
    if (form.postId != null) {
      await fetchUpdatePost({ ...form })
    } else {
      await fetchAddPost({ ...form })
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

async function handleDelete(row: PostItem) {
  try {
    await ElMessageBox.confirm(`确定要删除岗位"${row.postName}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeletePost(String(row.postId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的岗位')
    return
  }
  const ids = selectedRows.value.map((r) => r.postId).join(',')
  try {
    await ElMessageBox.confirm(`确定要删除选中的${selectedRows.value.length}个岗位吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeletePost(ids)
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

function handleExport() {
  fetchPostExport(searchForm.value).then((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '岗位管理.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  }).catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleSelectionChange(selection: PostItem[]) {
  selectedRows.value = selection
}
</script>
