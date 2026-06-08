<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 加载中 -->
    <div v-if="loading" class="flex justify-center items-center" style="min-height: 300px">
      <Icon icon="ri:loader-4-line" width="40" class="animate-spin" />
    </div>

    <!-- 空状态 -->
    <ElEmpty
      v-else-if="filteredList.length === 0"
      description="暂无可发起的流程，请先在流程定义中部署流程"
    />

    <!-- 卡片网格 -->
    <ElRow v-else :gutter="20" class="process-gallery" justify="start">
      <ElCol
        v-for="(item, idx) in filteredList"
        :key="item.definitionId"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="6"
      >
        <ElCard class="process-card" shadow="hover" :body-style="{ padding: '0' }">
          <div class="card-body" @click="openStartDialog(item)">
            <!-- 顶部色带/图标区 -->
            <div
              class="card-banner"
              :style="{ background: bannerColors[idx % bannerColors.length] }"
            >
              <Icon :icon="flowIcons[idx % flowIcons.length]" width="40" color="#fff" />
            </div>
            <!-- 信息区 -->
            <div class="card-info">
              <div class="card-title" :title="item.definitionName">
                {{ item.definitionName }}
              </div>
              <ElTag size="small" type="success" effect="light">v{{ item.version }}</ElTag>
              <p class="card-desc">
                {{ item.remark || '暂无描述' }}
              </p>
            </div>
            <!-- 按钮区 -->
            <div class="card-footer">
              <ElButton type="primary" class="w-full" @click.stop="openStartDialog(item)">
                <Icon icon="ri:play-circle-line" class="mr-1" />
                发起流程
              </ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- 发起流程弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="selectedDef ? `发起流程 — ${selectedDef.definitionName}` : '发起流程'"
      width="680px"
      align-center
      destroy-on-close
      @close="handleDialogClose"
    >
      <div v-if="selectedDef" class="start-dialog">
        <!-- 流程摘要卡片 -->
        <div class="dialog-summary">
          <div class="summary-icon">
            <Icon icon="ri:file-list-3-line" width="22" />
          </div>
          <div class="summary-body">
            <div class="summary-name">{{ selectedDef.definitionName }}</div>
            <div class="summary-meta">
              <span>{{ selectedDef.definitionKey }}</span>
              <ElTag size="small" type="success" effect="plain">v{{ selectedDef.version }}</ElTag>
            </div>
          </div>
        </div>

        <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px" class="dialog-form">
          <!-- 标题输入 -->
          <ElFormItem label="流程标题" prop="title">
            <ElInput
              v-model="form.title"
              placeholder="请输入本次申请的标题，便于后续查找"
              maxlength="200"
              show-word-limit
            />
          </ElFormItem>

          <!-- 表单加载中 -->
          <div v-if="templateLoading" class="dialog-state">
            <Icon icon="ri:loader-4-line" width="22" class="animate-spin" />
            <span>正在加载表单模板…</span>
          </div>

          <!-- 无表单 -->
          <div v-else-if="!templateConfig" class="dialog-state dialog-state--hint">
            <Icon icon="ri:information-line" width="18" />
            <span>该流程未绑定表单模板，可直接提交</span>
          </div>

          <!-- 表单区域 -->
          <div v-else class="dialog-form-section">
            <div class="form-section-header">
              <Icon icon="ri:edit-2-line" width="16" />
              <span>填写表单</span>
            </div>
            <div class="form-section-body">
              <FormRender ref="formRenderRef" :form-config="templateConfig" mode="edit" />
            </div>
          </div>
        </ElForm>
      </div>

      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">
          <Icon icon="ri:send-plane-line" class="mr-1" />
          提交申请
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import {
    fetchProcessDefinitionList,
    fetchProcessDefinitionDetail,
    startProcessInstance
  } from '@/api/process'
  import type { ProcessDefinition } from '@/api/process'
  import { Icon } from '@iconify/vue'
  import { fetchTemplateDetail } from '@/api/form'
  import type { FormInstance, FormRules } from 'element-plus'
  import FormRender from '@/components/business/FormRender.vue'

  defineOptions({ name: 'ProcessStart' })

  const router = useRouter()

  // ========== 流程卡片数据 ==========
  const loading = ref(true)
  const deployedDefinitions = ref<ProcessDefinition[]>([])

  // 卡片顶部色带（柔和渐变）
  const bannerColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)'
  ]

  // 流程图标轮换
  const flowIcons = [
    'ri:file-list-3-line',
    'ri:task-line',
    'ri:survey-line',
    'ri:clipboard-line',
    'ri:article-line',
    'ri:file-text-line',
    'ri:draft-line',
    'ri:edit-box-line'
  ]

  onMounted(async () => {
    try {
      const res: any = await fetchProcessDefinitionList({ status: '1' })
      const data = res.data || res
      deployedDefinitions.value = (data as any).rows || data || []
    } catch {
      ElMessage.error('加载流程列表失败')
    } finally {
      loading.value = false
    }
  })

  // ========== 搜索过滤 ==========
  const searchForm = ref({ definitionName: '' })

  const searchItems = [
    { key: 'definitionName', type: 'input', label: '流程名称', placeholder: '请输入流程名称' }
  ]

  const filteredList = computed(() => {
    const keyword = (searchForm.value.definitionName || '').toLowerCase().trim()
    if (!keyword) return deployedDefinitions.value
    return deployedDefinitions.value.filter(
      (d) =>
        (d.definitionName || '').toLowerCase().includes(keyword) ||
        (d.remark || '').toLowerCase().includes(keyword) ||
        (d.definitionKey || '').toLowerCase().includes(keyword)
    )
  })

  function handleSearch(params: Record<string, any>) {
    searchForm.value.definitionName = (params.definitionName || '').toLowerCase().trim()
  }

  function handleReset() {
    searchForm.value = { definitionName: '' }
  }

  // ========== 发起弹窗 ==========
  const dialogVisible = ref(false)
  const selectedDef = ref<ProcessDefinition | null>(null)
  const templateConfig = ref<Record<string, any> | null>(null)
  const templateLoading = ref(false)
  const submitting = ref(false)
  const formRef = ref<FormInstance>()
  const formRenderRef = ref<InstanceType<typeof FormRender>>()

  const form = reactive({
    title: ''
  })

  const rules: FormRules = {
    title: [{ required: true, message: '请输入流程标题', trigger: 'blur' }]
  }

  async function openStartDialog(item: ProcessDefinition) {
    selectedDef.value = item
    form.title = ''
    templateConfig.value = null
    dialogVisible.value = true

    if (item.definitionId) {
      templateLoading.value = true
      try {
        const defRes: any = await fetchProcessDefinitionDetail(item.definitionId)
        const detail = defRes.data || defRes
        console.log('[发起流程] 流程定义详情 — formTemplateId:', detail.formTemplateId, detail)
        if (detail.formTemplateId) {
          const templateRes: any = await fetchTemplateDetail(detail.formTemplateId)
          const tpl = templateRes.data || templateRes
          console.log('[发起流程] 表单模板 — hasFormConfig:', !!tpl.formConfig, tpl)
          if (tpl.formConfig) {
            templateConfig.value =
              typeof tpl.formConfig === 'string' ? JSON.parse(tpl.formConfig) : tpl.formConfig
            console.log('[发起流程] 表单已渲染', templateConfig.value)
          } else {
            console.warn('[发起流程] formConfig 为空')
          }
        } else {
          console.log('[发起流程] 未绑定表单模板')
        }
      } catch (e) {
        console.error('[发起流程] 加载表单模板失败', e)
      } finally {
        templateLoading.value = false
      }
    }
  }

  function handleDialogClose() {
    formRef.value?.resetFields()
    selectedDef.value = null
    templateConfig.value = null
  }

  async function handleSubmit() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (!valid || !selectedDef.value) return
      submitting.value = true
      try {
        // 收集表单数据（如果有绑定模板）
        const fd = formRenderRef.value?.getFormData?.() || {}
        await startProcessInstance({
          definitionId: selectedDef.value.definitionId!,
          title: form.title,
          formData: JSON.stringify(fd)
        })
        ElMessage.success('提交成功')
        dialogVisible.value = false
        router.push('/process/my-applications')
      } catch {
        ElMessage.error('提交失败')
      } finally {
        submitting.value = false
      }
    })
  }
</script>

<style lang="scss" scoped>
  .process-gallery {
    padding: 4px 0;
  }

  .process-card {
    margin-bottom: 20px;
    border-radius: 12px;
    overflow: hidden;
    transition:
      transform 0.25s,
      box-shadow 0.25s;
    cursor: pointer;

    &:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 40px rgb(0 0 0 / 0.12);
    }

    .card-body {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .card-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 90px;
    }

    .card-info {
      flex: 1;
      padding: 16px 16px 4px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;

      .card-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }

      .card-desc {
        margin: 0;
        font-size: 13px;
        color: var(--el-text-color-secondary);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 39px;
      }
    }

    .card-footer {
      padding: 12px 16px 16px;
    }
  }

  // ==================== 发起弹窗 ====================
  .start-dialog {
    .dialog-summary {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      margin-bottom: 20px;
      background: var(--el-color-primary-light-9);
      border-radius: 10px;
      border: 1px solid var(--el-color-primary-light-7);

      .summary-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: var(--el-color-primary);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .summary-body {
        flex: 1;
        min-width: 0;
      }

      .summary-name {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        line-height: 1.4;
        margin-bottom: 4px;
      }

      .summary-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .dialog-form {
      .el-form-item:last-of-type {
        margin-bottom: 0;
      }
    }

    .dialog-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 28px 0;
      color: var(--el-text-color-secondary);
      font-size: 14px;

      &--hint {
        padding: 14px 16px;
        justify-content: flex-start;
        background: var(--el-color-info-light-9);
        border-radius: 8px;
        color: var(--el-color-info-dark-2);
        font-size: 13px;
      }
    }

    .dialog-form-section {
      margin-top: 20px;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 10px;
      overflow: hidden;

      .form-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: var(--el-fill-color-light);
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        border-bottom: 1px solid var(--el-border-color-lighter);
      }

      .form-section-body {
        padding: 16px;
      }
    }
  }
</style>
