<!-- 字典管理页面 -->
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
            <ElButton type="primary" @click="showDialog('add')" v-ripple>新增</ElButton>
            <ElButton
              :disabled="selectedRows.length === 0"
              @click="handleBatchDelete"
              v-ripple
            >
              批量删除
            </ElButton>
            <ElButton @click="handleExport" v-ripple>导出</ElButton>
            <ElButton type="danger" plain @click="handleRefreshCache" v-ripple>
              刷新缓存
            </ElButton>
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

    <!-- 新增/编辑字典类型弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加字典类型' : '修改字典类型'"
      width="500px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="字典名称" prop="dictName">
          <ElInput v-model="form.dictName" placeholder="请输入字典名称" />
        </ElFormItem>
        <ElFormItem label="字典类型" prop="dictType">
          <ElInput v-model="form.dictType" placeholder="请输入字典类型" :disabled="dialogType === 'edit'" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="form.status">
            <ElRadio value="0">正常</ElRadio>
            <ElRadio value="1">停用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 字典数据抽屉 -->
    <DictDetailDrawer ref="detailDrawerRef" />

    <!-- 字典数据管理弹窗 -->
    <DictDataDialog ref="dataDialogRef" @success="refreshData" />
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import {
  fetchDictTypeList,
  fetchDictType,
  fetchAddDictType,
  fetchUpdateDictType,
  fetchDeleteDictType,
  fetchRefreshDictCache,
  fetchDictTypeExport
} from '@/api/system/dict'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import DictDetailDrawer from './modules/dict-detail-drawer.vue'
import DictDataDialog from './modules/dict-data-dialog.vue'

defineOptions({ name: 'Dict' })

type DictTypeItem = Api.SystemManage.DictTypeItem

const selectedRows = ref<DictTypeItem[]>([])
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const detailDrawerRef = ref()
const dataDialogRef = ref()

const searchForm = ref<Api.SystemManage.DictTypeSearchParams>({
  dictName: '',
  dictType: '',
  status: ''
})

const form = reactive<Api.SystemManage.DictTypeFormData>({
  dictName: '',
  dictType: '',
  status: '0',
  remark: ''
})

const rules = reactive<FormRules>({
  dictName: [{ required: true, message: '字典名称不能为空', trigger: 'blur' }],
  dictType: [{ required: true, message: '字典类型不能为空', trigger: 'blur' }]
})

const statusOptions = [{ label: '正常', value: '0' }, { label: '停用', value: '1' }]

const formItems = computed(() => [
  { label: '字典名称', key: 'dictName', type: 'input', props: { placeholder: '请输入字典名称', clearable: true } },
  { label: '字典类型', key: 'dictType', type: 'input', props: { placeholder: '请输入字典类型', clearable: true } },
  { label: '状态', key: 'status', type: 'select', props: { placeholder: '字典状态', options: statusOptions, clearable: true } },
  {
    label: '创建时间',
    key: 'daterange',
    type: 'datetime',
    props: {
      type: 'daterange',
      rangeSeparator: '至',
      startPlaceholder: '开始日期',
      endPlaceholder: '结束日期',
      valueFormat: 'YYYY-MM-DD'
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
    apiFn: fetchDictTypeList,
    apiParams: { pageNum: 1, pageSize: 10 },
    excludeParams: ['daterange'],
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'selection', width: 50 },
      { prop: 'dictId', label: '字典编号', width: 100 },
      { prop: 'dictName', label: '字典名称', minWidth: 120, showOverflowTooltip: true },
      {
        prop: 'dictType',
        label: '字典类型',
        minWidth: 150,
        formatter: (row: DictTypeItem) =>
          h('span', { class: 'link-type cursor-pointer', onClick: () => handleViewDetail(row) }, row.dictType)
      },
      {
        prop: 'status',
        label: '状态',
        width: 80,
        formatter: (row: DictTypeItem) =>
          h(ElTag, { type: row.status === '0' ? 'success' : 'danger', size: 'small' }, () => row.status === '0' ? '正常' : '停用')
      },
      { prop: 'remark', label: '备注', minWidth: 120, showOverflowTooltip: true },
      { prop: 'createTime', label: '创建时间', width: 170 },
      {
        prop: 'operation',
        label: '操作',
        width: 200,
        fixed: 'right' as const,
        formatter: (row: DictTypeItem) =>
          h('div', { class: 'flex items-center gap-1' }, [
            h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
            h(ArtButtonTable, { type: 'view', title: '字典数据', icon: 'ri:list-check-2', onClick: () => handleDataList(row) }),
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

function handleSearch(params: typeof searchForm.value) {
  const { daterange, ...rest } = params as any
  const [beginTime, endTime] = Array.isArray(daterange) ? daterange : [null, null]
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

function showDialog(type: 'add' | 'edit', row?: DictTypeItem) {
  dialogType.value = type
  if (type === 'edit' && row) {
    fetchDictType(row.dictId).then((res: any) => {
      const d = res.data || res
      Object.assign(form, {
        dictId: d.dictId,
        dictName: d.dictName || '',
        dictType: d.dictType || '',
        status: d.status || '0',
        remark: d.remark || ''
      })
    })
  } else {
    Object.assign(form, { dictId: undefined, dictName: '', dictType: '', status: '0', remark: '' })
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
    if (form.dictId != null) {
      await fetchUpdateDictType({ ...form })
    } else {
      await fetchAddDictType({ ...form })
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

async function handleDelete(row: DictTypeItem) {
  try {
    await ElMessageBox.confirm(`确定要删除字典"${row.dictName}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteDictType(String(row.dictId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的字典')
    return
  }
  const ids = selectedRows.value.map((r) => r.dictId).join(',')
  try {
    await ElMessageBox.confirm(`确定要删除选中的${selectedRows.value.length}个字典吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteDictType(ids)
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

function handleViewDetail(row: DictTypeItem) {
  detailDrawerRef.value?.open(row)
}

function handleDataList(row: DictTypeItem) {
  dataDialogRef.value?.open(row)
}

async function handleRefreshCache() {
  try {
    await fetchRefreshDictCache()
    ElMessage.success('刷新缓存成功')
  } catch { /* handled by interceptor */ }
}

function handleExport() {
  fetchDictTypeExport(searchForm.value).then((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '字典管理.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  }).catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleSelectionChange(selection: DictTypeItem[]) {
  selectedRows.value = selection
}
</script>

<style scoped>
.link-type {
  color: var(--main-color);
}
.link-type:hover {
  text-decoration: underline;
}
</style>
