<template>
  <div class="page-content" v-loading="loading">
    <ElRow :gutter="10">
      <!-- 基本信息 -->
      <ElCol :span="24" class="mb-2.5">
        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center gap-1.5">
              <span class="text-base font-medium"><i class="ri:information-line mr-1"></i>基本信息</span>
            </div>
          </template>
          <ElTable :data="infoData" :show-header="false" stripe size="small">
            <ElTableColumn prop="label" width="120" />
            <ElTableColumn prop="value" />
            <ElTableColumn prop="label2" width="100" />
            <ElTableColumn prop="value2" />
            <ElTableColumn prop="label3" width="100" />
            <ElTableColumn prop="value3" />
            <ElTableColumn prop="label4" width="110" />
            <ElTableColumn prop="value4" />
          </ElTable>
        </ElCard>
      </ElCol>

      <!-- 命令统计 -->
      <ElCol :span="12" class="mb-2.5 max-lg:!w-full">
        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center gap-1.5">
              <span class="text-base font-medium"><i class="ri:pie-chart-line mr-1"></i>命令统计</span>
            </div>
          </template>
          <div ref="commandChartRef" style="height: 420px"></div>
        </ElCard>
      </ElCol>

      <!-- 内存信息 -->
      <ElCol :span="12" class="mb-2.5 max-lg:!w-full">
        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center gap-1.5">
              <span class="text-base font-medium"><i class="ri:gauge-line mr-1"></i>内存信息</span>
            </div>
          </template>
          <div ref="memoryChartRef" style="height: 420px"></div>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
import { fetchCache } from '@/api/monitor'
import { useChart } from '@/hooks/core/useChart'
import { getCssVar } from '@/utils/ui'

defineOptions({ name: 'MonitorCache' })

const loading = ref(false)
const cache = ref<Api.Monitor.CacheData>({})

const { chartRef: commandChartRef, initChart: drawCommand } = useChart()
const { chartRef: memoryChartRef, initChart: drawMemory } = useChart()

const infoData = computed(() => {
  const info = cache.value.info
  if (!info) return []
  const mode = info.redis_mode === 'standalone' ? '单机' : '集群'
  const aof = info.aof_enabled === '0' ? '否' : '是'
  const netIn = `${info.instantaneous_input_kbps}kps`
  const netOut = `${info.instantaneous_output_kbps}kps`
  return [
    {
      label: 'Redis版本', value: info.redis_version,
      label2: '运行模式', value2: mode,
      label3: '端口', value3: info.tcp_port,
      label4: '客户端数', value4: info.connected_clients
    },
    {
      label: '运行时间(天)', value: info.uptime_in_days,
      label2: '使用内存', value2: info.used_memory_human,
      label3: '使用CPU', value3: parseFloat(info.used_cpu_user_children).toFixed(2),
      label4: '内存配置', value4: info.maxmemory_human
    },
    {
      label: 'AOF是否开启', value: aof,
      label2: 'RDB是否成功', value2: info.rdb_last_bgsave_status,
      label3: 'Key数量', value3: String(cache.value.dbSize ?? '-'),
      label4: '网络入口/出口', value4: `${netIn}/${netOut}`
    }
  ]
})

async function getData() {
  loading.value = true
  try {
    const res = await fetchCache()
    cache.value = res
    await nextTick()
    renderCommandChart()
    renderMemoryChart()
  } finally {
    loading.value = false
  }
}

function parseMemToMB(val: string): number {
  if (!val) return 0
  const num = parseFloat(val)
  const upper = val.toUpperCase()
  if (upper.endsWith('G')) return num * 1024
  if (upper.endsWith('M')) return num
  if (upper.endsWith('K')) return num / 1024
  return num / (1024 * 1024)
}

function renderCommandChart() {
  const stats = cache.value.commandStats
  if (!stats?.length) return

  const primary = getCssVar('--el-color-primary')
  const colors = [
    primary,
    '#36CFC9', '#B37FEB', '#FFD666', '#5CDBD3',
    '#FF9C6E', '#95DE64', '#FF85C0', '#69C0FF',
    '#B7EB8F', '#FFC069', '#D3ADF7', '#87E8DE'
  ]
  const sorted = [...stats].sort((a, b) => b.value - a.value)

  drawCommand({
    color: colors,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      textStyle: { color: '#333', fontSize: 13 },
      formatter: (p: any) =>
        `<div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};"/>
          <b>${p.name}</b>
        </div>
        <div style="margin-top:4px;padding-left:18px;">调用次数：<b>${p.value.toLocaleString()}</b>（占比 ${p.percent}%）</div>`
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 20,
      bottom: 20,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 6,
      textStyle: { fontSize: 11, color: '#666' },
      formatter: (name: string) => {
        const item = sorted.find((s) => s.name === name)
        return item ? `${name}  ${item.value.toLocaleString()}` : name
      }
    },
    series: [{
      name: '命令统计',
      type: 'pie',
      radius: ['45%', '78%'],
      center: ['38%', '50%'],
      roseType: 'area',
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 11, lineHeight: 16 },
      emphasis: { label: { fontSize: 16, fontWeight: 'bold' }, scaleSize: 12 },
      data: sorted,
      animationEasing: 'cubicInOut',
      animationDuration: 1200
    }]
  })
}

function renderMemoryChart() {
  const info = cache.value.info
  if (!info) return

  const used = parseMemToMB(info.used_memory_human)
  const max = parseMemToMB(info.maxmemory_human)
  const gaugeMax = max > 0 ? max : Math.max(Math.ceil(used / 100) * 100, 100)
  const percent = gaugeMax > 0 ? Math.round((used / gaugeMax) * 100) : 0

  const axisLineColor = percent > 80
    ? [[0.8, '#5CDBD3'], [0.9, '#FFD666'], [1, '#FF6B6B']]
    : [[0.5, '#95DE64'], [0.8, '#5CDBD3'], [1, '#FFD666']]

  drawMemory({
    series: [{
      name: '内存消耗',
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      center: ['50%', '58%'],
      radius: '85%',
      min: 0,
      max: gaugeMax,
      splitNumber: 10,
      axisLine: { show: true, lineStyle: { width: 18, color: axisLineColor } },
      progress: {
        show: true, width: 18, roundCap: true,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#95DE64' }, { offset: 0.5, color: '#5CDBD3' }, { offset: 1, color: '#36CFC9' }]
        } }
      },
      pointer: { show: true, length: '70%', width: 6, itemStyle: { color: '#666' } },
      axisTick: { distance: -18, length: 6, lineStyle: { width: 1.5, color: '#999' } },
      splitLine: { distance: -22, length: 12, lineStyle: { width: 2.5, color: '#999' } },
      axisLabel: { distance: 28, color: '#999', fontSize: 11, formatter: (v: number) => v >= 1024 ? `${(v / 1024).toFixed(1)}G` : `${v}M` },
      anchor: { show: true, size: 12, itemStyle: { borderWidth: 2, borderColor: '#ddd' } },
      title: { show: true, offsetCenter: [0, '82%'], fontSize: 14, color: '#666' },
      detail: {
        valueAnimation: true,
        formatter: `{value}M\n\n使用率 ${percent}%`,
        fontSize: 20, fontWeight: 'bold',
        color: percent > 80 ? '#FF6B6B' : '#333',
        offsetCenter: [0, '58%'], lineHeight: 22
      },
      data: [{ value: used, name: '内存消耗' }]
    }] as any
  })
}

onMounted(() => {
  getData()
})
</script>
