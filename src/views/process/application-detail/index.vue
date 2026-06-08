<template>
  <div class="art-full-height flex gap-4">
    <div class="flex-1 overflow-auto">
      <ElCard>
        <template #header>
          <span class="text-lg font-medium">{{ instance?.title }}</span>
          <ElTag :type="statusMap[instance?.status || '']?.type" class="ml-2">
            {{ statusMap[instance?.status || '']?.text }}
          </ElTag>
        </template>

        <div class="mb-3 text-sm text-gray-500">
          <span>业务编号：{{ instance?.businessNo }}</span>
          <span class="ml-4">发起人：{{ instance?.applicant }}</span>
          <span class="ml-4">申请时间：{{ instance?.applyTime }}</span>
        </div>

        <ElDivider />
        <FormRender
          v-if="templateConfig"
          :form-config="templateConfig"
          :form-data="formData"
          mode="view"
          :seals="sealRecords"
        />
      </ElCard>
    </div>

    <div class="w-80 flex-shrink-0 overflow-auto">
      <ElCard header="审批进度">
        <ElTimeline v-if="approvalRecords.length > 0">
          <ElTimelineItem
            v-for="r in approvalRecords"
            :key="r.recordId"
            :color="resultColor(r.result)"
            :timestamp="r.approveTime"
          >
            <p class="font-medium">{{ r.nodeName }}</p>
            <p>{{ r.approver }} - {{ resultText(r.result) }}</p>
            <p v-if="r.comment" class="text-sm text-gray-500">{{ r.comment }}</p>
            <p v-if="r.costDuration" class="text-xs text-gray-400">
              耗时 {{ (r.costDuration / 1000 / 60).toFixed(1) }} 分钟
            </p>
          </ElTimelineItem>
        </ElTimeline>
        <ElEmpty v-else description="暂无审批记录" />
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchInstanceDetail, type ApprovalRecord, type SealRecord } from '@/api/process'
import { fetchTemplateDetail } from '@/api/form'
import FormRender from '@/components/business/FormRender.vue'

defineOptions({ name: 'ApplicationDetail' })

const route = useRoute()
const instanceId = Number(route.params.id)

const instance = ref<any>(null)
const formData = ref<Record<string, any>>({})
const templateConfig = ref<Record<string, any> | null>(null)
const approvalRecords = ref<ApprovalRecord[]>([])
const sealRecords = ref<SealRecord[]>([])

const statusMap: Record<string, { type: string; text: string }> = {
  '0': { type: 'warning', text: '审批中' },
  '1': { type: 'success', text: '已通过' },
  '2': { type: 'danger', text: '已驳回' },
  '3': { type: 'info', text: '已撤回' }
}

function resultColor(result: string) {
  return { '0': '#67C23A', '1': '#F56C6C', '2': '#E6A23C' }[result] || '#909399'
}
function resultText(result: string) {
  return { '0': '通过', '1': '驳回', '2': '退回' }[result] || '未知'
}

onMounted(async () => {
  const res = await fetchInstanceDetail(instanceId)
  if (res.data) {
    instance.value = res.data.instance
    if (res.data.formData?.formData) {
      formData.value = JSON.parse(res.data.formData.formData)
    }
    if (res.data.instance?.formTemplateId) {
      const tRes = await fetchTemplateDetail(res.data.instance.formTemplateId)
      if (tRes.data?.formConfig) {
        templateConfig.value = JSON.parse(tRes.data.formConfig)
      }
    }
    approvalRecords.value = res.data.approvalRecords || []
    sealRecords.value = res.data.sealRecords || []
  }
})
</script>
