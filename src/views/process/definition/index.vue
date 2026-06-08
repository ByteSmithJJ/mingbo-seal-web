<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="showDialog('add')" v-ripple>新增流程</ElButton>
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
      :title="dialogType === 'add' ? '新增流程定义' : '编辑流程定义'"
      width="550px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <ElFormItem label="流程名称" prop="definitionName">
          <ElInput v-model="form.definitionName" placeholder="请输入流程名称" maxlength="100" />
        </ElFormItem>
        <ElFormItem label="流程标识" prop="definitionKey">
          <ElInput v-model="form.definitionKey" placeholder="请输入流程唯一标识" maxlength="64" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status" v-if="dialogType === 'edit'">
          <ElSelect v-model="form.status">
            <ElOption label="草稿" value="0" />
            <ElOption label="已部署" value="1" />
            <ElOption label="已停用" value="2" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="备注" prop="remark">
          <ElInput v-model="form.remark" type="textarea" placeholder="请输入备注" maxlength="500" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 流程设计器全屏弹窗 -->
    <ElDialog
      v-model="designerOpen"
      fullscreen
      :show-close="false"
      :close-on-click-modal="false"
      destroy-on-close
      class="process-designer-dialog"
    >
      <ProcessDesigner
        v-if="designerOpen"
        :definition-id="designerData.definitionId"
        :definition-name="designerData.definitionName"
        :definition-key="designerData.definitionKey"
        :bpmn-xml="designerData.bpmnXml"
        :show-close="true"
        :show-deploy="!!designerData.definitionId"
        @save="handleDesignerSave"
        @deploy="handleDesignerDeploy"
        @close="designerOpen = false"
      />
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchProcessDefinitionList,
    fetchProcessDefinitionDetail,
    createProcessDefinition,
    updateProcessDefinition,
    deleteProcessDefinition,
    deployProcessDefinition,
    type ProcessDefinition
  } from '@/api/process'
  import { useTable } from '@/hooks/core/useTable'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ProcessDesigner from '@/components/ProcessDesigner/index.vue'
  import type { SavePayload } from '@/components/ProcessDesigner/types'
  import { ElTag, ElMessage, ElMessageBox } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { h } from 'vue'

  defineOptions({ name: 'ProcessDefinition' })

  const dialogVisible = ref(false)
  const designerOpen = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const submitting = ref(false)
  const formRef = ref<FormInstance>()
  const currentRow = ref<ProcessDefinition | null>(null)

  // 设计器数据
  const designerData = reactive({
    definitionId: null as number | null,
    definitionName: '',
    definitionKey: '',
    bpmnXml: '',
    formTemplateId: null as number | null
  })

  const searchForm = ref({ definitionName: '', status: '' })

  const searchItems = [
    { key: 'definitionName', type: 'input', label: '流程名称', placeholder: '请输入流程名称' },
    {
      key: 'status',
      type: 'select',
      label: '状态',
      placeholder: '请选择状态',
      props: {
        clearable: true,
        options: [
          { label: '草稿', value: '0' },
          { label: '已部署', value: '1' },
          { label: '已停用', value: '2' }
        ]
      }
    }
  ]

  const form = reactive({
    definitionName: '',
    definitionKey: '',
    status: '0',
    remark: ''
  })

  const rules = reactive<FormRules>({
    definitionName: [{ required: true, message: '请输入流程名称', trigger: 'blur' }],
    definitionKey: [{ required: true, message: '请输入流程标识', trigger: 'blur' }]
  })

  const statusMap: Record<string, { type: string; text: string }> = {
    '0': { type: 'info', text: '草稿' },
    '1': { type: 'success', text: '已部署' },
    '2': { type: 'danger', text: '已停用' }
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
      apiFn: fetchProcessDefinitionList,
      apiParams: { pageNum: 1, pageSize: 10 },
      paginationKey: { current: 'pageNum', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'definitionId', label: 'ID', width: 80 },
        { prop: 'definitionName', label: '流程名称', minWidth: 140 },
        { prop: 'definitionKey', label: '流程标识', minWidth: 120 },
        { prop: 'version', label: '版本', width: 70 },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: any) => {
            const s = statusMap[row.status] || { type: 'info', text: row.status }
            return h(ElTag, { size: 'small', type: s.type }, () => s.text)
          }
        },
        { prop: 'deploymentId', label: '部署ID', minWidth: 60, showOverflowTooltip: true },
        { prop: 'updateTime', label: '更新时间', width: 170 },
        {
          prop: 'operation',
          label: '操作',
          width: 260,
          fixed: 'right' as const,
          formatter: (row: any) => {
            const btns = [
              h(ArtButtonTable, { type: 'design', onClick: () => handleDesign(row) }),
              h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) })
            ]
            if (row.status === '0') {
              btns.push(
                h(ArtButtonTable, {
                  tooltip: '部署',
                  icon: 'ri:upload-cloud-2-line',
                  iconColor: 'var(--el-color-success)',
                  buttonBgColor: 'var(--el-color-success-light-9)',
                  onClick: () => handleDeploy(row)
                })
              )
            }
            btns.push(h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) }))
            return h('div', { class: 'flex items-center gap-1' }, btns)
          }
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

  function handleSearch(params: Record<string, any>) {
    replaceSearchParams(params)
    getData()
  }

  function handleReset() {
    searchForm.value = { definitionName: '', status: '' }
    resetSearchParams()
  }

  function showDialog(type: 'add' | 'edit', row?: ProcessDefinition) {
    dialogType.value = type
    if (type === 'edit' && row) {
      currentRow.value = row
      Object.assign(form, {
        definitionName: row.definitionName || '',
        definitionKey: row.definitionKey || '',
        status: row.status || '0',
        remark: row.remark || ''
      })
    } else {
      currentRow.value = null
      Object.assign(form, { definitionName: '', definitionKey: '', status: '0', remark: '' })
    }
    dialogVisible.value = true
    nextTick(() => formRef.value?.clearValidate())
  }

  function handleDialogClose() {
    formRef.value?.resetFields()
  }

  async function handleSubmit() {
    if (!formRef.value) return
    try {
      await formRef.value.validate()
    } catch {
      return
    }
    submitting.value = true
    try {
      if (currentRow.value?.definitionId) {
        await updateProcessDefinition({
          definitionId: currentRow.value.definitionId,
          ...form
        } as ProcessDefinition)
      } else {
        await createProcessDefinition(form as ProcessDefinition)
      }
      ElMessage.success(dialogType.value === 'add' ? '新增成功' : '修改成功')
      dialogVisible.value = false
      refreshData()
    } catch {
      /* handled by interceptor */
    } finally {
      submitting.value = false
    }
  }

  async function handleDelete(row: ProcessDefinition) {
    try {
      await ElMessageBox.confirm(
        `确定要删除流程"${row.definitionName}"吗？删除后不可恢复。`,
        '删除确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
    } catch {
      return
    }
    try {
      await deleteProcessDefinition(String(row.definitionId))
      ElMessage.success('删除成功')
      refreshData()
    } catch {
      /* handled by interceptor */
    }
  }

  async function handleDeploy(row: ProcessDefinition) {
    try {
      await ElMessageBox.confirm(
        `确定要部署流程"${row.definitionName}"吗？部署后即可被发起审批。`,
        '部署确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
    } catch {
      return
    }
    try {
      await deployProcessDefinition(row.definitionId!)
      ElMessage.success('部署成功')
      refreshData()
    } catch {
      /* handled by interceptor */
    }
  }

  async function handleDesign(row: ProcessDefinition) {
    designerData.definitionId = row.definitionId || null
    designerData.definitionName = row.definitionName || ''
    designerData.definitionKey = row.definitionKey || ''
    designerData.formTemplateId = row.formTemplateId || null
    designerData.bpmnXml = ''

    if (row.definitionId) {
      designerOpen.value = true
      try {
        const res: any = await fetchProcessDefinitionDetail(row.definitionId)
        const data = res.data || res
        designerData.bpmnXml = data.bpmnXml || ''
        designerData.definitionName = data.definitionName || designerData.definitionName
        designerData.definitionKey = data.definitionKey || designerData.definitionKey
        designerData.formTemplateId = data.formTemplateId ?? designerData.formTemplateId
      } catch {
        ElMessage.error('加载流程定义失败')
        designerOpen.value = false
      }
    } else {
      designerOpen.value = true
    }
  }

  async function handleDesignerSave(payload: SavePayload) {
    try {
      if (payload.saveAsNewVersion) {
        await createProcessDefinition({
          definitionName: designerData.definitionName,
          definitionKey: designerData.definitionKey,
          bpmnXml: payload.xml,
          formTemplateId: payload.formTemplateId
        } as ProcessDefinition)
        ElMessage.success('已保存为新版本')
      } else {
        if (designerData.definitionId) {
          await updateProcessDefinition({
            definitionId: designerData.definitionId,
            definitionName: designerData.definitionName,
            definitionKey: designerData.definitionKey,
            bpmnXml: payload.xml,
            formTemplateId: payload.formTemplateId
          } as ProcessDefinition)
        } else {
          await createProcessDefinition({
            definitionName: designerData.definitionName,
            definitionKey: designerData.definitionKey,
            bpmnXml: payload.xml,
            formTemplateId: payload.formTemplateId
          } as ProcessDefinition)
        }
        ElMessage.success('保存成功')
      }
      designerOpen.value = false
      refreshData()
    } catch {
      /* handled by interceptor */
    }
  }

  async function handleDesignerDeploy(definitionId: number | string) {
    try {
      await ElMessageBox.confirm('部署后流程定义将被发布为可用版本，确定要部署吗？', '部署确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }
    try {
      await deployProcessDefinition(Number(definitionId))
      ElMessage.success('部署成功')
      designerOpen.value = false
      refreshData()
    } catch {
      /* handled by interceptor */
    }
  }
</script>
