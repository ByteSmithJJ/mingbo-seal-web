<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <ElRow :gutter="16" class="stats-row">
      <ElCol v-for="card in statCards" :key="card.key" :xs="12" :sm="6" :lg="6">
        <div class="stat-card" :style="{ '--card-color': card.color }">
          <div class="stat-icon">
            <Icon :icon="card.icon" width="26" />
          </div>
          <div class="stat-body">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
          <div class="stat-bg">
            <Icon :icon="card.icon" width="60" />
          </div>
        </div>
      </ElCol>
    </ElRow>

    <!-- 快捷操作 + 图表 -->
    <ElRow :gutter="16" class="content-row">
      <ElCol :xs="24" :lg="8">
        <ElCard class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <Icon icon="ri:flashlight-line" width="18" />
              <span>快捷操作</span>
            </div>
          </template>
          <div class="action-grid">
            <div
              v-for="action in quickActions"
              :key="action.label"
              class="action-item"
              @click="router.push(action.path)"
            >
              <div class="action-icon" :style="{ background: action.bg, color: action.color }">
                <Icon :icon="action.icon" width="22" />
              </div>
              <span>{{ action.label }}</span>
            </div>
          </div>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="8">
        <ElCard class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <Icon icon="ri:bar-chart-line" width="18" />
              <span>流程统计</span>
            </div>
          </template>
          <div ref="pieChartRef" class="chart-box" />
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="8">
        <ElCard class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <Icon icon="ri:list-check-2" width="18" />
              <span>待办任务</span>
              <ElButton
                link
                type="primary"
                size="small"
                class="header-link"
                @click="router.push('/process/pending')"
              >
                查看全部 <Icon icon="ri:arrow-right-line" />
              </ElButton>
            </div>
          </template>
          <div v-if="pendingLoading" class="loading-box">
            <Icon icon="ri:loader-4-line" width="24" class="animate-spin" />
          </div>
          <ElEmpty
            v-else-if="pendingTasks.length === 0"
            description="暂无待办任务"
            :image-size="60"
          />
          <div v-else class="task-list">
            <div
              v-for="t in pendingTasks"
              :key="t.taskId"
              class="task-item"
              @click="router.push('/process/pending')"
            >
              <div class="task-left">
                <span class="task-title">{{ t.title }}</span>
                <span class="task-meta">{{ t.applicant }} · {{ t.taskName }}</span>
              </div>
              <ElTag size="small" type="warning" effect="plain">待审批</ElTag>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- 底部：最近申请 + 趋势图 -->
    <ElRow :gutter="16" class="content-row">
      <ElCol :xs="24" :lg="12">
        <ElCard class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <Icon icon="ri:draft-line" width="18" />
              <span>最近申请</span>
              <ElButton
                link
                type="primary"
                size="small"
                class="header-link"
                @click="router.push('/process/my-applications')"
              >
                查看全部 <Icon icon="ri:arrow-right-line" />
              </ElButton>
            </div>
          </template>
          <div v-if="appsLoading" class="loading-box">
            <Icon icon="ri:loader-4-line" width="24" class="animate-spin" />
          </div>
          <ElEmpty
            v-else-if="recentApps.length === 0"
            description="暂无申请记录"
            :image-size="60"
          />
          <div v-else class="task-list">
            <div
              v-for="a in recentApps"
              :key="a.instanceId"
              class="task-item"
              @click="router.push('/process/my-applications')"
            >
              <div class="task-left">
                <span class="task-title">{{ a.title }}</span>
                <span class="task-meta">{{ a.definitionName }} · {{ a.applyTime }}</span>
              </div>
              <ElTag size="small" :type="appStatusType(a.status)" effect="plain">{{
                appStatusText(a.status)
              }}</ElTag>
            </div>
          </div>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="12">
        <ElCard class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <Icon icon="ri:line-chart-line" width="18" />
              <span>申请趋势（近7天）</span>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-box trend-chart" />
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- 第三排：已审批 + 审批效率 -->
    <ElRow :gutter="16" class="content-row">
      <ElCol :xs="24" :lg="12">
        <ElCard class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <Icon icon="ri:checkbox-circle-line" width="18" />
              <span>已审批</span>
              <ElButton
                link
                type="primary"
                size="small"
                class="header-link"
                @click="router.push('/process/approved')"
              >
                查看全部 <Icon icon="ri:arrow-right-line" />
              </ElButton>
            </div>
          </template>
          <div v-if="approvedLoading" class="loading-box">
            <Icon icon="ri:loader-4-line" width="24" class="animate-spin" />
          </div>
          <ElEmpty
            v-else-if="approvedTasks.length === 0"
            description="暂无已审批记录"
            :image-size="60"
          />
          <div v-else class="task-list">
            <div
              v-for="a in approvedTasks"
              :key="a.taskId || a.instanceId"
              class="task-item"
              @click="router.push('/process/approved')"
            >
              <div class="task-left">
                <span class="task-title">{{ a.title }}</span>
                <span class="task-meta">{{ a.applicant }} · {{ a.taskName || a.approveTime }}</span>
              </div>
              <ElTag size="small" :type="approvedResultType(a.result)" effect="plain">{{
                approvedResultText(a.result)
              }}</ElTag>
            </div>
          </div>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="12">
        <ElCard class="section-card" shadow="never">
          <template #header>
            <div class="section-header">
              <Icon icon="ri:pie-chart-2-line" width="18" />
              <span>审批效率</span>
            </div>
          </template>
          <div ref="gaugeChartRef" class="chart-box" />
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue'
  import {
    fetchPendingTaskList,
    fetchMyApplicationList,
    fetchApprovedTaskList,
    fetchInstanceTrend
  } from '@/api/process'
  import { echarts } from '@/plugins/echarts'

  defineOptions({ name: 'Console' })

  const router = useRouter()

  // ========== 快捷操作 ==========
  const quickActions = [
    {
      label: '发起申请',
      icon: 'ri:file-add-line',
      path: '/process/start',
      bg: 'var(--el-color-primary-light-9)',
      color: 'var(--el-color-primary)'
    },
    {
      label: '待审批',
      icon: 'ri:task-line',
      path: '/process/pending',
      bg: '#fdf6ec',
      color: '#e6a23c'
    },
    {
      label: '我的申请',
      icon: 'ri:draft-line',
      path: '/process/my-applications',
      bg: '#e1f3d8',
      color: '#67c23a'
    },
    {
      label: '已审批',
      icon: 'ri:checkbox-circle-line',
      path: '/process/approved',
      bg: '#d1fae5',
      color: '#10b981'
    },
    {
      label: '流程定义',
      icon: 'ri:flow-chart',
      path: '/process/definition',
      bg: '#e8d9f5',
      color: '#a855f7'
    },
    {
      label: '印章管理',
      icon: 'ri:seedling-line',
      path: '/seal/info',
      bg: '#fde2e2',
      color: '#f56c6c'
    }
  ]

  // ========== 统计卡片 ==========
  const statCards = ref([
    { key: 'pending', icon: 'ri:task-line', label: '待办任务', value: 0, color: '#e6a23c' },
    {
      key: 'approved',
      icon: 'ri:checkbox-circle-line',
      label: '已办任务',
      value: 0,
      color: '#67c23a'
    },
    { key: 'myApps', icon: 'ri:draft-line', label: '我的申请', value: 0, color: '#409eff' },
    { key: 'processing', icon: 'ri:loader-4-line', label: '审批中', value: 0, color: '#a855f7' }
  ])

  const appStatusText = (s: string) =>
    ({ '0': '审批中', '1': '已通过', '2': '已驳回', '3': '已撤回' })[s] || s
  const appStatusType = (s: string) =>
    ({ '0': 'warning', '1': 'success', '2': 'danger', '3': 'info' })[s] || 'info'

  onMounted(async () => {
    try {
      const [pRes, aRes, mRes, procRes] = await Promise.all([
        fetchPendingTaskList({ pageNum: 1, pageSize: 1 }),
        fetchApprovedTaskList({ pageNum: 1, pageSize: 1 }),
        fetchMyApplicationList({ pageNum: 1, pageSize: 1 }),
        fetchMyApplicationList({ pageNum: 1, pageSize: 1, status: '0' })
      ])
      statCards.value[0].value = (pRes as any)?.total ?? 0
      statCards.value[1].value = (aRes as any)?.total ?? 0
      statCards.value[2].value = (mRes as any)?.total ?? 0
      statCards.value[3].value = (procRes as any)?.total ?? 0
    } catch {
      /* ignore */
    }

    loadPendingTasks()
    loadRecentApps()
    loadApprovedTasks()
    nextTick(() => {
      initPieChart()
      initGaugeChart()
    })
    loadTrendData()
  })

  // ========== 待办列表 ==========
  const pendingTasks = ref<any[]>([])
  const pendingLoading = ref(true)
  async function loadPendingTasks() {
    try {
      const res: any = await fetchPendingTaskList({ pageNum: 1, pageSize: 5 })
      pendingTasks.value = res?.rows || []
    } catch {
      /* ignore */
    } finally {
      pendingLoading.value = false
    }
  }

  // ========== 最近申请 ==========
  const recentApps = ref<any[]>([])
  const appsLoading = ref(true)
  async function loadRecentApps() {
    try {
      const res: any = await fetchMyApplicationList({ pageNum: 1, pageSize: 5 })
      recentApps.value = res?.rows || []
    } catch {
      /* ignore */
    } finally {
      appsLoading.value = false
    }
  }

  // ========== 饼图：流程状态分布 ==========
  const pieChartRef = ref<HTMLElement>()
  function initPieChart() {
    if (!pieChartRef.value) return
    const chart = echarts.init(pieChartRef.value)
    chart.setOption({
      tooltip: {
        trigger: 'item'
      },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [
        {
          type: 'pie',
          radius: ['40%', '60%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
          data: [
            { value: statCards.value[0].value, name: '待办', itemStyle: { color: '#e6a23c' } },
            { value: statCards.value[1].value, name: '已办', itemStyle: { color: '#67c23a' } },
            { value: statCards.value[3].value, name: '审批中', itemStyle: { color: '#a855f7' } },
            {
              value: Math.max(0, statCards.value[2].value - statCards.value[3].value),
              name: '已完成',
              itemStyle: { color: '#409eff' }
            }
          ]
        }
      ]
    })
    onBeforeUnmount(() => chart.dispose())
  }

  // ========== 趋势图（近7天真实数据） ==========
  const trendData = ref<{ day: string; count: number }[]>([])
  async function loadTrendData() {
    try {
      const res: any = await fetchInstanceTrend()
      trendData.value = res || []
    } catch {
      /* ignore */
    } finally {
      await nextTick()
      initTrendChart()
    }
  }
  const trendChartRef = ref<HTMLElement>()
  function initTrendChart() {
    if (!trendChartRef.value) return
    const chart = echarts.init(trendChartRef.value)
    const days: string[] = []
    const dayKeys: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(`${d.getMonth() + 1}/${d.getDate()}`)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      dayKeys.push(`${y}-${m}-${day}`)
    }
    // 构建 day → count 映射，无数据的日期补 0
    const countMap: Record<string, number> = {}
    for (const dk of dayKeys) countMap[dk] = 0
    for (const item of trendData.value) {
      if (item.day && item.day in countMap) {
        countMap[item.day] = item.count
      }
    }
    const data = dayKeys.map((dk) => countMap[dk])
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 8, top: 8, bottom: 24 },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: { fontSize: 10 },
        axisTick: { show: false }
      },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
      series: [
        {
          type: 'bar',
          barWidth: 16,
          itemStyle: { borderRadius: [4, 4, 0, 0], color: '#409eff' },
          data
        }
      ]
    })
    onBeforeUnmount(() => chart.dispose())
  }

  // ========== 已审批列表 ==========
  const approvedTasks = ref<any[]>([])
  const approvedLoading = ref(true)
  async function loadApprovedTasks() {
    try {
      const res: any = await fetchApprovedTaskList({ pageNum: 1, pageSize: 5 })
      approvedTasks.value = res?.rows || []
    } catch {
      /* ignore */
    } finally {
      approvedLoading.value = false
    }
  }
  const approvedResultText = (r: string) =>
    ({ '0': '通过', '1': '驳回', '2': '退回', '3': '发起', '4': '撤回' })[r] || r
  const approvedResultType = (r: string) =>
    ({ '0': 'success', '1': 'danger', '2': 'warning', '3': 'info', '4': 'warning' })[r] || 'info'

  // ========== 仪表图 ==========
  const gaugeChartRef = ref<HTMLElement>()
  function initGaugeChart() {
    if (!gaugeChartRef.value) return
    const chart = echarts.init(gaugeChartRef.value)
    const total = statCards.value[2].value
    const pending = statCards.value[0].value
    const rate = total > 0 ? Math.round(((total - pending) / total) * 100) : 100
    chart.setOption({
      series: [
        {
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          center: ['50%', '55%'],
          radius: '90%',
          min: 0,
          max: 100,
          axisLine: {
            lineStyle: {
              width: 16,
              color: [
                [0.3, '#f56c6c'],
                [0.7, '#e6a23c'],
                [1, '#67c23a']
              ]
            }
          },
          pointer: { length: '60%', width: 6, itemStyle: { color: 'auto' } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 'bold',
            offsetCenter: [0, '60%']
          },
          title: { offsetCenter: [0, '85%'], fontSize: 12 },
          data: [{ value: rate, name: '处理率 %' }]
        }
      ]
    })
    onBeforeUnmount(() => chart.dispose())
  }
</script>

<style lang="scss" scoped>
  .dashboard {
    // ========== 统计卡片 ==========
    .stats-row {
      margin-bottom: 16px;
    }

    .stat-card {
      position: relative;
      padding: 24px;
      border-radius: 14px;
      background: var(--el-bg-color);
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.04);
      border: 1px solid var(--el-border-color-lighter);
      display: flex;
      align-items: center;
      gap: 18px;
      overflow: hidden;
      cursor: default;
      transition: all 0.25s;
      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgb(0 0 0 / 0.08);
        border-color: var(--card-color);
      }
      .stat-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--card-color);
        color: #fff;
        flex-shrink: 0;
      }
      .stat-body {
        flex: 1;
        min-width: 0;
      }
      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--el-text-color-primary);
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      .stat-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        margin-top: 4px;
      }
      .stat-bg {
        position: absolute;
        right: -16px;
        bottom: -16px;
        opacity: 0.06;
        color: var(--card-color);
        pointer-events: none;
      }
    }

    // ========== 内容区 ==========
    .content-row {
      margin-bottom: 16px;
    }

    .section-card {
      border-radius: 14px;
      border: 1px solid var(--el-border-color-lighter);
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.04);
      height: 100%;
      display: flex;
      flex-direction: column;
      :deep(.el-card__header) {
        padding: 18px 24px 14px;
        border-bottom: 1px solid var(--el-border-color-lighter);
      }
      :deep(.el-card__body) {
        padding: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      .header-link {
        margin-left: auto;
        font-weight: 400;
        :deep(.el-icon) {
          margin-left: 2px;
        }
      }
    }

    // ========== 快捷操作 ==========
    .action-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      background: var(--el-border-color-lighter);
      flex: 1;
    }
    .action-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 24px 12px;
      background: var(--el-bg-color);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
      color: var(--el-text-color-regular);
      &:hover {
        background: var(--el-fill-color-light);
      }
      .action-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    // ========== 图表 ==========
    .chart-box {
      flex: 1;
      min-height: 260px;
    }

    .trend-chart {
      padding: 27px 0 0 13px;
      box-sizing: border-box;
    }

    // ========== 列表 ==========
    .loading-box {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--el-text-color-secondary);
    }
    .task-list {
      flex: 1;
    }
    .task-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid var(--el-border-color-lighter);
      &:last-child {
        border-bottom: none;
      }
      &:hover {
        background: var(--el-fill-color-lighter);
      }
      .task-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .task-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .task-meta {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }
  }
</style>
