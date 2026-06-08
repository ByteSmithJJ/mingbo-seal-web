<template>
  <div class="form-designer-page">
    <div class="form-designer-header">
      <div style="display:flex;align-items:center;gap:12px;">
        <ElButton @click="goBack" text>
          <i class="ri:arrow-left-line mr-1" />返回
        </ElButton>
        <span style="font-size:16px;font-weight:500;">{{ templateName || '表单设计器' }}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <ElPopover placement="bottom" :width="340" trigger="click">
          <template #reference>
            <ElButton text type="info">
              <i class="ri:question-line mr-1" />样式帮助
            </ElButton>
          </template>
          <div style="font-size:13px;line-height:1.8;">
            <p style="font-weight:600;margin-bottom:8px;">可用自定义 Class（在组件属性的"自定义Class"中填写）</p>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <th style="text-align:left;padding:4px 8px;">Class 名称</th>
                  <th style="text-align:left;padding:4px 8px;">效果</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:4px 8px;font-family:monospace;color:#409eff;">form-cell-input</td>
                  <td style="padding:4px 8px;">输入框填满单元格，无边框无间距，文字居中</td>
                </tr>
              </tbody>
            </table>
            <p style="margin-top:8px;color:#999;">使用时需同时设置：标签宽度=0px，隐藏标签=开启</p>
          </div>
        </ElPopover>
        <ElButton type="primary" @click="handleSave" :loading="saving">保存并发布</ElButton>
      </div>
    </div>

    <div class="form-designer-body">
      <div v-if="!loading" class="form-designer-wrapper">
        <fc-designer ref="designerRef" :key="designerKey" height="100%" />
      </div>
      <div v-else style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">加载中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchTemplateDetail, updateTemplate, type FormTemplate } from '@/api/form'
import { ElMessage } from 'element-plus'
import { mittBus } from '@/utils/sys'

defineOptions({ name: 'FormDesigner' })

const route = useRoute()
const router = useRouter()

const designerRef = ref()
const templateName = ref('')
const templateId = ref<number | null>(null)
const existingData = ref<FormTemplate | null>(null)
const loading = ref(false)
const saving = ref(false)
const designerKey = ref(0)

onMounted(async () => {
  const id = route.params.id as string
  if (id && id !== 'new') {
    templateId.value = Number(id)
    loading.value = true
    try {
      const res = await fetchTemplateDetail(templateId.value)
      const data = res.data || res
      existingData.value = data
      templateName.value = data.templateName || ''

      // 先关闭 loading，让 fc-designer 组件渲染出来
      loading.value = false
      await nextTick()
      // FCDesigner 内部初始化是异步的，额外等待确保就绪
      await new Promise(r => setTimeout(r, 500))

      if (data.formConfig) {
        try {
          const config = JSON.parse(data.formConfig)
          if (config.rule && config.rule.length > 0) {
            designerRef.value?.setRule(config.rule)
          }
          if (config.option) {
            designerRef.value?.setOption(config.option)
          }
        } catch (e) {
          console.error('表单配置解析失败:', e)
        }
      }
    } catch {
      ElMessage.error('加载模板失败')
      loading.value = false
    }
  } else {
    templateName.value = '新建表单'
    designerKey.value = Date.now()
  }
})

function goBack() {
  router.push('/form/template')
}

async function handleSave() {
  await doSave('1')
}

async function doSave(status: string) {
  if (!designerRef.value) {
    ElMessage.warning('设计器未就绪')
    return
  }

  const rule = JSON.parse(designerRef.value.getJson())
  if (!rule || rule.length === 0) {
    ElMessage.warning('表单内容为空')
    return
  }

  saving.value = true
  try {
    const option = JSON.parse(designerRef.value.getOptionsJson())
    const formConfig = JSON.stringify({ rule, option })

    if (existingData.value?.templateId) {
      await updateTemplate({
        templateId: existingData.value.templateId,
        templateName: templateName.value || existingData.value.templateName,
        templateKey: existingData.value.templateKey,
        formConfig,
        status
      } as FormTemplate)
    } else {
      ElMessage.warning('请先在列表页创建模板后再设计表单')
      return
    }
    ElMessage.success(status === '1' ? '保存并发布成功' : '草稿已保存')
    router.push('/form/template')
    nextTick(() => mittBus.emit('refreshFormTemplate'))
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.form-designer-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: #fff;
  overflow: hidden;
}

.form-designer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 48px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.form-designer-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.form-designer-wrapper {
  height: 100%;
}
</style>
