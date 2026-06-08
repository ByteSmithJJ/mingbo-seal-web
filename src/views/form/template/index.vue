<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="showDialog('add')" v-ripple>新增模板</ElButton>
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
      :title="dialogType === 'add' ? '新增模板' : '编辑模板'"
      width="550px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="模板名称" prop="templateName">
          <ElInput v-model="form.templateName" placeholder="请输入模板名称" maxlength="100" />
        </ElFormItem>
        <ElFormItem label="模板标识" prop="templateKey">
          <ElInput v-model="form.templateKey" placeholder="唯一标识，如 leave_form" maxlength="64" :disabled="dialogType === 'edit'" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="form.status">
            <ElRadio value="0">草稿</ElRadio>
            <ElRadio value="1">已发布</ElRadio>
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
import { fetchTemplateList, createTemplate, updateTemplate, deleteTemplate, type FormTemplate } from '@/api/form'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { mittBus } from '@/utils/sys'

defineOptions({ name: 'FormTemplate' })

const router = useRouter()
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const currentRow = ref<FormTemplate | null>(null)

const form = reactive({
  templateName: '',
  templateKey: '',
  status: '0',
  remark: ''
})

const rules = reactive<FormRules>({
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  templateKey: [{ required: true, message: '请输入模板标识', trigger: 'blur' }]
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
    apiFn: fetchTemplateList,
    apiParams: { pageNum: 1, pageSize: 10 },
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { prop: 'templateId', label: 'ID', width: 80 },
      { prop: 'templateName', label: '模板名称', minWidth: 150 },
      { prop: 'templateKey', label: '模板标识', minWidth: 140 },
      { prop: 'version', label: '版本', width: 70 },
      {
        prop: 'status',
        label: '状态',
        width: 90,
        formatter: (row: any) => {
          const map: Record<string, { type: string; text: string }> = {
            '0': { type: 'info', text: '草稿' },
            '1': { type: 'success', text: '已发布' },
            '2': { type: 'danger', text: '已停用' }
          }
          const s = map[row.status] || { type: 'info', text: row.status }
          return h(ElTag, { size: 'small', type: s.type }, () => s.text)
        }
      },
      { prop: 'updateTime', label: '更新时间', width: 170 },
      {
        prop: 'operation',
        label: '操作',
        width: 220,
        fixed: 'right' as const,
        formatter: (row: any) =>
          h('div', { class: 'flex items-center gap-1' }, [
            h(ArtButtonTable, { type: 'design', onClick: () => router.push(`/form/designer/${row.templateId}`) }),
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

function showDialog(type: 'add' | 'edit', row?: any) {
  dialogType.value = type
  if (type === 'edit' && row) {
    currentRow.value = row
    Object.assign(form, {
      templateName: row.templateName || '',
      templateKey: row.templateKey || '',
      status: row.status || '0',
      remark: row.remark || ''
    })
  } else {
    currentRow.value = null
    Object.assign(form, { templateName: '', templateKey: '', status: '0', remark: '' })
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function handleDialogClose() {
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }

  submitting.value = true
  try {
    if (currentRow.value?.templateId) {
      await updateTemplate({ ...form, templateId: currentRow.value.templateId } as FormTemplate)
    } else {
      await createTemplate(form as FormTemplate)
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
    await ElMessageBox.confirm(`确定要删除模板"${row.templateName}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteTemplate(String(row.templateId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

onMounted(() => {
  getData()
  mittBus.on('refreshFormTemplate', refreshData)
})

onBeforeUnmount(() => {
  mittBus.off('refreshFormTemplate', refreshData)
})
</script>
