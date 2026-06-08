<template>
  <div class="process-designer-page">
    <ProcessDesigner
      v-if="ready"
      :definition-id="definitionId"
      :definition-name="definitionName"
      :definition-key="definitionKey"
      :bpmn-xml="bpmnXml"
      :show-close="true"
      :show-deploy="!!definitionId"
      @save="handleSave"
      @deploy="handleDeploy"
      @close="goBack"
    />
  </div>
</template>

<script setup lang="ts">
import {
  fetchProcessDefinitionDetail,
  updateProcessDefinition,
  createProcessDefinition,
  deployProcessDefinition,
  type ProcessDefinition
} from '@/api/process'
import ProcessDesigner from '@/components/ProcessDesigner/index.vue'
import type { SavePayload } from '@/components/ProcessDesigner/types'
import { ElMessage, ElMessageBox } from 'element-plus'

defineOptions({ name: 'ProcessDesignerPage' })

const route = useRoute()
const router = useRouter()

const ready = ref(false)
const definitionId = ref<number | null>(null)
const definitionName = ref('')
const definitionKey = ref('')
const bpmnXml = ref('')

onMounted(async () => {
  const id = route.params.id as string
  if (id && id !== 'new') {
    definitionId.value = Number(id)
    try {
      const res: any = await fetchProcessDefinitionDetail(definitionId.value)
      const data = res.data || res
      definitionName.value = data.definitionName || ''
      definitionKey.value = data.definitionKey || ''
      bpmnXml.value = data.bpmnXml || ''
    } catch {
      ElMessage.error('加载流程定义失败')
    }
  } else {
    definitionName.value = '新建流程'
    definitionKey.value = ''
    bpmnXml.value = ''
  }
  ready.value = true
})

function goBack() {
  router.push('/process/definition')
}

async function handleSave(payload: SavePayload) {
  try {
    if (payload.saveAsNewVersion) {
      await createProcessDefinition({
        definitionName: definitionName.value,
        definitionKey: definitionKey.value,
        bpmnXml: payload.xml,
        formTemplateId: payload.formTemplateId
      } as ProcessDefinition)
      ElMessage.success('已保存为新版本')
    } else {
      if (definitionId.value) {
        await updateProcessDefinition({
          definitionId: definitionId.value,
          definitionName: definitionName.value,
          definitionKey: definitionKey.value,
          bpmnXml: payload.xml,
          formTemplateId: payload.formTemplateId
        } as ProcessDefinition)
      } else {
        await createProcessDefinition({
          definitionName: definitionName.value,
          definitionKey: definitionKey.value,
          bpmnXml: payload.xml,
          formTemplateId: payload.formTemplateId
        } as ProcessDefinition)
      }
      ElMessage.success('保存成功')
    }
    goBack()
  } catch { /* handled by interceptor */ }
}

async function handleDeploy(id: number | string) {
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
    await deployProcessDefinition(Number(id))
    ElMessage.success('部署成功')
    goBack()
  } catch { /* handled by interceptor */ }
}
</script>

<style scoped>
.process-designer-page {
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
</style>
