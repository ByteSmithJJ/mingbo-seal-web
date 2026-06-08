<!-- 参数配置页面 -->
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

    <!-- 新增/编辑弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加参数' : '修改参数'"
      width="500px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="参数名称" prop="configName">
          <ElInput v-model="form.configName" placeholder="请输入参数名称" />
        </ElFormItem>
        <ElFormItem label="参数键名" prop="configKey">
          <ElInput v-model="form.configKey" placeholder="请输入参数键名" />
        </ElFormItem>
        <ElFormItem label="参数键值" prop="configValue">
          <ElInput v-model="form.configValue" type="textarea" :rows="3" placeholder="请输入参数键值" />
        </ElFormItem>
        <ElFormItem label="系统内置" prop="configType">
          <ElRadioGroup v-model="form.configType">
            <ElRadio value="Y">是</ElRadio>
            <ElRadio value="N">否</ElRadio>
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
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import {
  fetchConfigList,
  fetchConfig,
  fetchAddConfig,
  fetchUpdateConfig,
  fetchDeleteConfig,
  fetchRefreshConfigCache,
  fetchConfigExport
} from '@/api/system/config'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'Config' })

type ConfigItem = Api.SystemManage.ConfigItem

const selectedRows = ref<ConfigItem[]>([])
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const currentConfig = ref<ConfigItem | null>(null)

const searchForm = ref<Api.SystemManage.ConfigSearchParams>({
  configName: '',
  configKey: '',
  configType: ''
})

const form = reactive<Api.SystemManage.ConfigFormData>({
  configName: '',
  configKey: '',
  configValue: '',
  configType: 'N',
  remark: ''
})

const rules = reactive<FormRules>({
  configName: [{ required: true, message: '参数名称不能为空', trigger: 'blur' }],
  configKey: [{ required: true, message: '参数键名不能为空', trigger: 'blur' }],
  configValue: [{ required: true, message: '参数键值不能为空', trigger: 'blur' }]
})

const formItems = computed(() => [
  { label: '参数名称', key: 'configName', type: 'input', props: { placeholder: '请输入参数名称', clearable: true } },
  { label: '参数键名', key: 'configKey', type: 'input', props: { placeholder: '请输入参数键名', clearable: true } },
  {
    label: '系统内置',
    key: 'configType',
    type: 'select',
    props: {
      placeholder: '系统内置',
      options: [{ label: '是', value: 'Y' }, { label: '否', value: 'N' }],
      clearable: true
    }
  },
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
    apiFn: fetchConfigList,
    apiParams: { pageNum: 1, pageSize: 10 },
    excludeParams: ['daterange'],
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'selection', width: 50 },
      { prop: 'configId', label: '参数主键', width: 100 },
      { prop: 'configName', label: '参数名称', minWidth: 120, showOverflowTooltip: true },
      { prop: 'configKey', label: '参数键名', minWidth: 150, showOverflowTooltip: true },
      { prop: 'configValue', label: '参数键值', minWidth: 150, showOverflowTooltip: true },
      {
        prop: 'configType',
        label: '系统内置',
        width: 100,
        formatter: (row: ConfigItem) => h(ElTag, { size: 'small', type: row.configType === 'Y' ? 'warning' : 'info' }, () => row.configType === 'Y' ? '是' : '否')
      },
      { prop: 'remark', label: '备注', minWidth: 120, showOverflowTooltip: true },
      { prop: 'createTime', label: '创建时间', width: 170 },
      {
        prop: 'operation',
        label: '操作',
        width: 150,
        fixed: 'right' as const,
        formatter: (row: ConfigItem) =>
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

function showDialog(type: 'add' | 'edit', row?: ConfigItem) {
  dialogType.value = type
  if (type === 'edit' && row) {
    currentConfig.value = row
    fetchConfig(row.configId).then((res: any) => {
      const d = res.data || res
      Object.assign(form, {
        configId: d.configId,
        configName: d.configName || '',
        configKey: d.configKey || '',
        configValue: d.configValue || '',
        configType: d.configType || 'Y',
        remark: d.remark || ''
      })
    })
  } else {
    currentConfig.value = null
    Object.assign(form, { configId: undefined, configName: '', configKey: '', configValue: '', configType: 'Y', remark: '' })
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
    if (form.configId != null) {
      await fetchUpdateConfig({ ...form })
    } else {
      await fetchAddConfig({ ...form })
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

async function handleDelete(row: ConfigItem) {
  try {
    await ElMessageBox.confirm(`确定要删除参数配置"${row.configName}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteConfig(String(row.configId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的参数')
    return
  }
  const ids = selectedRows.value.map((r) => r.configId).join(',')
  try {
    await ElMessageBox.confirm(`确定要删除选中的${selectedRows.value.length}条参数配置吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteConfig(ids)
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleRefreshCache() {
  try {
    await fetchRefreshConfigCache()
    ElMessage.success('刷新缓存成功')
  } catch { /* handled by interceptor */ }
}

function handleExport() {
  const { daterange, ...rest } = searchForm.value as any
  const [beginTime, endTime] = Array.isArray(daterange) ? daterange : [null, null]
  const exportParams: any = { ...rest }
  if (beginTime && endTime) {
    exportParams.params = { beginTime, endTime }
  }
  fetchConfigExport(exportParams as any).then((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '参数配置.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  }).catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleSelectionChange(selection: ConfigItem[]) {
  selectedRows.value = selection
}
</script>
