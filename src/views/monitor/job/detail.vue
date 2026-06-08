<!-- 定时任务 / 调度日志 详情弹窗 -->
<template>
  <ElDialog
    v-model="dialogVisible"
    :title="type === 'job' ? '任务详情' : '调度日志详情'"
    width="700px"
    align-center
  >
    <div v-if="row">
      <!-- 任务详情 -->
      <template v-if="type === 'job'">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="任务编号">{{ row.jobId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="任务名称">{{ row.jobName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="任务分组">
            <ElTag size="small">{{ jobGroupMap[row.jobGroup] || row.jobGroup }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="执行状态">
            <ElTag :type="row.status === '0' ? 'success' : 'danger'" size="small">
              {{ row.status === '0' ? '正常' : '暂停' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="cron 表达式">{{ row.cronExpression }}</ElDescriptionsItem>
          <ElDescriptionsItem label="下次执行时间">{{
            row.nextValidTime || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="执行策略">
            {{ misfirePolicyMap[row.misfirePolicy] || row.misfirePolicy }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="并发执行">
            {{ row.concurrent === '0' ? '允许' : '禁止' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="创建人">{{ row.createBy }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{ row.createTime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="更新人">{{ row.updateBy }}</ElDescriptionsItem>
          <ElDescriptionsItem label="更新时间">{{ row.updateTime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="备注" :span="2">{{ row.remark || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="调用方法" :span="2">
            <pre
              style="
                max-height: 150px;
                overflow: auto;
                font-size: 12px;
                background: #f5f7fa;
                padding: 8px;
                border-radius: 4px;
              "
              >{{ row.invokeTarget }}</pre
            >
          </ElDescriptionsItem>
        </ElDescriptions>
      </template>

      <!-- 日志详情 -->
      <template v-if="type === 'log'">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="日志编号">{{ row.jobLogId }}</ElDescriptionsItem>
          <ElDescriptionsItem label="执行状态">
            <ElTag :type="row.status === '0' ? 'success' : 'danger'" size="small">
              {{ row.status === '0' ? '成功' : '失败' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="开始时间">{{ row.startTime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="结束时间">{{ row.endTime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="记录时间">{{ row.createTime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="执行耗时">{{ costTime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="任务名称">{{ row.jobName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="任务分组">
            <ElTag size="small">{{ jobGroupMap[row.jobGroup] || row.jobGroup }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="日志信息" :span="2">{{
            row.jobMessage || '-'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="调用方法" :span="2">
            <pre
              style="
                max-height: 150px;
                overflow: auto;
                font-size: 12px;
                background: #f5f7fa;
                padding: 8px;
                border-radius: 4px;
              "
              >{{ row.invokeTarget }}</pre
            >
          </ElDescriptionsItem>
          <ElDescriptionsItem
            v-if="row.status === '1' && row.exceptionInfo"
            label="异常信息"
            :span="2"
          >
            <pre
              style="
                max-height: 200px;
                overflow: auto;
                font-size: 12px;
                background: #fff0f0;
                padding: 8px;
                border-radius: 4px;
                color: #f56c6c;
              "
              >{{ row.exceptionInfo }}</pre
            >
          </ElDescriptionsItem>
        </ElDescriptions>
      </template>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElTag } from 'element-plus'

  defineOptions({ name: 'JobDetail' })

  const props = defineProps<{
    visible: boolean
    row: Record<string, any> | null
    type: 'job' | 'log'
  }>()

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void
  }>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })

  const jobGroupMap: Record<string, string> = {
    DEFAULT: '默认',
    SYSTEM: '系统'
  }

  const misfirePolicyMap: Record<string, string> = {
    '1': '立即执行',
    '2': '执行一次',
    '3': '放弃执行'
  }

  const costTime = computed(() => {
    if (!props.row) return '-'
    const { startTime, endTime } = props.row
    if (startTime && endTime) {
      const diff = new Date(endTime).getTime() - new Date(startTime).getTime()
      if (diff >= 0) return `${diff} ms`
    }
    return '-'
  })
</script>
