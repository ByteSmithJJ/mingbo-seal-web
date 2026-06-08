<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="showDialog('add')" v-ripple>新增位置</ElButton>
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
      :title="dialogType === 'add' ? '新增位置配置' : '编辑位置配置'"
      width="650px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <ElFormItem label="印章" prop="sealId">
          <ElSelect
            v-model="form.sealId"
            placeholder="请选择印章"
            class="w-full"
            filterable
            @change="onSealChange"
          >
            <ElOption
              v-for="s in sealOptions"
              :key="s.sealId"
              :label="s.sealName"
              :value="s.sealId!"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="表单模板" prop="formTemplateId">
          <ElSelect
            v-model="form.formTemplateId"
            placeholder="请选择表单模板"
            class="w-full"
            filterable
          >
            <ElOption
              v-for="t in templateOptions"
              :key="t.templateId"
              :label="`${t.templateName} (v${t.version})`"
              :value="t.templateId!"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="审批节点" v-show="nodeOptions.length > 0">
          <ElSelect
            v-model="form.nodeCode"
            placeholder="选择盖章节点（空=所有节点）"
            class="w-full"
            clearable
          >
            <ElOption
              v-for="n in nodeOptions"
              :key="n.activityId"
              :label="n.nodeName"
              :value="n.activityId"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="位置名称" prop="positionName">
          <ElInput v-model="form.positionName" placeholder="如：落款处、金额旁" maxlength="64" />
        </ElFormItem>
        <ElRow :gutter="16">
          <ElCol :span="12">
            <ElFormItem label="X坐标(px)" prop="posX">
              <ElInputNumber v-model="form.posX" :min="0" :precision="1" class="w-full" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="Y坐标(px)" prop="posY">
              <ElInputNumber v-model="form.posY" :min="0" :precision="1" class="w-full" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="16">
          <ElCol :span="12">
            <ElFormItem label="印章宽度(px)">
              <ElInputNumber v-model="form.sealWidth" :min="20" :max="500" class="w-full" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="印章高度(px)">
              <ElInputNumber v-model="form.sealHeight" :min="20" :max="500" class="w-full" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="16">
          <ElCol :span="12">
            <ElFormItem label="页码">
              <ElInputNumber v-model="form.pageNo" :min="1" class="w-full" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="排序号">
              <ElInputNumber v-model="form.sort" :min="0" class="w-full" />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>

      <!-- 表单回显 + 印章位置预览 -->
      <div v-if="formPreviewConfig || selectedSealImage" class="seal-preview">
        <div class="preview-header">
          <Icon icon="ri:focus-3-line" width="16" />
          <span>{{ form.positionName ? `盖章位置 — ${form.positionName}` : '盖章位置预览' }}</span>
          <span class="preview-coords" v-if="form.posX || form.posY">
            ({{ form.posX }}, {{ form.posY }}) {{ form.sealWidth }}×{{ form.sealHeight }}px
          </span>
        </div>
        <div class="preview-stage">
          <div class="preview-paper">
            <FormRender
              v-if="formPreviewConfig"
              :form-config="formPreviewConfig"
              :seals="previewSeal"
              mode="view"
            />
            <div v-else class="preview-placeholder">
              <Icon icon="ri:file-text-line" width="40" />
              <span>请选择表单模板</span>
            </div>
          </div>
        </div>
      </div>

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
    fetchPositionList,
    createPosition,
    updatePosition,
    deletePosition,
    fetchSealList,
    type SealPosition,
    type SealInfo
  } from '@/api/seal'
  import { fetchTemplateList, fetchTemplateDetail } from '@/api/form'
  import { fetchBpmnNodesByTemplate } from '@/api/process'
  import FormRender from '@/components/business/FormRender.vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'

  defineOptions({ name: 'SealPosition' })

  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const submitting = ref(false)
  const formRef = ref<FormInstance>()
  const currentRow = ref<SealPosition | null>(null)
  const sealOptions = ref<SealInfo[]>([])
  const templateOptions = ref<any[]>([])
  const selectedSealImage = ref('')
  const formPreviewConfig = ref<Record<string, any> | null>(null)
  const nodeOptions = ref<{ activityId: string; nodeName: string }[]>([])

  const previewSeal = computed(() => {
    if (!selectedSealImage.value) return []
    return [
      {
        sealImage: selectedSealImage.value,
        sealName: form.positionName || '印章预览',
        posX: form.posX || 0,
        posY: form.posY || 0,
        sealWidth: form.sealWidth || 120,
        sealHeight: form.sealHeight || 120
      }
    ]
  })

  const form = reactive<any>({
    sealId: undefined,
    formTemplateId: undefined,
    positionName: '',
    posX: 0,
    posY: 0,
    sealWidth: 120,
    sealHeight: 120,
    pageNo: 1,
    sort: 0,
    nodeCode: '',
    remark: ''
  })

  const rules = reactive<FormRules>({
    sealId: [{ required: true, message: '请选择印章', trigger: 'change' }],
    formTemplateId: [{ required: true, message: '请选择表单模板', trigger: 'change' }],
    positionName: [{ required: true, message: '请输入位置名称', trigger: 'blur' }],
    posX: [{ required: true, message: '请输入X坐标', trigger: 'blur' }],
    posY: [{ required: true, message: '请输入Y坐标', trigger: 'blur' }]
  })

  watch(
    () => form.formTemplateId,
    async (id) => {
      formPreviewConfig.value = null
      nodeOptions.value = []
      if (!id) return
      try {
        const [tplRes, nodeRes] = await Promise.all([
          fetchTemplateDetail(id),
          fetchBpmnNodesByTemplate(id)
        ])
        const tpl = tplRes.data || tplRes
        if (tpl.formConfig) {
          formPreviewConfig.value =
            typeof tpl.formConfig === 'string' ? JSON.parse(tpl.formConfig) : tpl.formConfig
        }
        nodeOptions.value = nodeRes.data || nodeRes || []
        await nextTick()
      } catch {
        /* ignore */
      }
    }
  )

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
      apiFn: fetchPositionList,
      apiParams: { pageNum: 1, pageSize: 10 },
      paginationKey: { current: 'pageNum', size: 'pageSize' },
      columnsFactory: () => [
        { prop: 'positionId', label: 'ID', width: 80 },
        { prop: 'sealName', label: '印章名称', minWidth: 120 },
        { prop: 'templateName', label: '表单模板', minWidth: 120 },
        { prop: 'positionName', label: '位置名称', minWidth: 120 },
        {
          prop: 'position',
          label: '坐标/尺寸',
          minWidth: 180,
          formatter: (row: any) =>
            h(
              'span',
              { class: 'text-xs text-gray-500' },
              `(${row.posX}, ${row.posY}) ${row.sealWidth}×${row.sealHeight}px`
            )
        },
        { prop: 'pageNo', label: '页码', width: 70 },
        { prop: 'createTime', label: '创建时间', width: 170 },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
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

  function onSealChange(val: number) {
    const seal = sealOptions.value.find((s) => s.sealId === val)
    selectedSealImage.value = seal?.sealImage || ''
  }

  async function loadSealOptions() {
    try {
      const res = await fetchSealList({ status: '0', pageSize: 100 })
      sealOptions.value = (res.rows || []) as SealInfo[]
    } catch {
      /* ignore */
    }
  }

  function showDialog(type: 'add' | 'edit', row?: any) {
    dialogType.value = type
    if (type === 'edit' && row) {
      currentRow.value = row
      Object.assign(form, {
        sealId: row.sealId,
        formTemplateId: row.formTemplateId,
        positionName: row.positionName || '',
        posX: row.posX || 0,
        posY: row.posY || 0,
        sealWidth: row.sealWidth || 120,
        sealHeight: row.sealHeight || 120,
        pageNo: row.pageNo || 1,
        sort: row.sort || 0,
        nodeCode: row.nodeCode || '',
        remark: row.remark || ''
      })
      onSealChange(row.sealId)
    } else {
      currentRow.value = null
      Object.assign(form, {
        sealId: undefined,
        formTemplateId: undefined,
        positionName: '',
        posX: 0,
        posY: 0,
        sealWidth: 120,
        sealHeight: 120,
        pageNo: 1,
        sort: 0,
        nodeCode: '',
        remark: ''
      })
      selectedSealImage.value = ''
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
      if (currentRow.value?.positionId) {
        await updatePosition({ ...form, positionId: currentRow.value.positionId } as SealPosition)
      } else {
        await createPosition({ ...form } as SealPosition)
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
      await ElMessageBox.confirm(`确定要删除位置配置"${row.positionName}"吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deletePosition(String(row.positionId))
      ElMessage.success('删除成功')
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  async function loadTemplateOptions() {
    try {
      const res = await fetchTemplateList({ pageNum: 1, pageSize: 200 })
      const payload: any = res || {}
      templateOptions.value = payload.rows || []
    } catch {
      /* ignore */
    }
  }

  onMounted(() => {
    loadSealOptions()
    loadTemplateOptions()
    getData()
  })
</script>

<style lang="scss" scoped>
  .seal-preview {
    margin-top: 20px;

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--el-fill-color-light);
      border: 1px solid var(--el-border-color-lighter);
      border-bottom: none;
      border-radius: 10px 10px 0 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);

      .preview-coords {
        margin-left: auto;
        font-size: 12px;
        font-weight: 400;
        color: var(--el-text-color-secondary);
        font-family: 'Courier New', monospace;
      }
    }

    .preview-stage {
      position: relative;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 0 0 10px 10px;
      overflow: hidden;
      background: #f8f9fb;
      min-height: 300px;
    }

    .preview-paper {
      width: 600px;
      max-width: 100%;
      margin: 24px auto;
      background: #fff;
      border-radius: 6px;
      box-shadow:
        0 1px 3px rgb(0 0 0 / 0.06),
        0 4px 16px rgb(0 0 0 / 0.08);
      min-height: 200px;
      box-sizing: border-box;
    }

    .preview-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 180px;
      color: var(--el-text-color-disabled);
      font-size: 14px;
    }
  }
</style>
