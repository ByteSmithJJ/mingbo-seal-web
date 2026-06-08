<template>
  <div class="page-content" v-loading="loading">
    <ElRow :gutter="10">
      <!-- CPU 信息 -->
      <ElCol :span="12" class="mb-2.5 max-lg:!w-full">
        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center gap-1.5">
              <span class="text-base font-medium"><i class="ri:cpu-line mr-1"></i>CPU</span>
            </div>
          </template>
          <ElTable :data="cpuData" :show-header="true" stripe size="small">
            <ElTableColumn prop="label" label="属性" width="120" />
            <ElTableColumn prop="value" label="值" />
          </ElTable>
        </ElCard>
      </ElCol>

      <!-- 内存信息 -->
      <ElCol :span="12" class="mb-2.5 max-lg:!w-full">
        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center gap-1.5">
              <span class="text-base font-medium"><i class="ri:hard-drive-2-line mr-1"></i>内存</span>
            </div>
          </template>
          <ElTable :data="memData" :show-header="true" stripe size="small">
            <ElTableColumn prop="label" label="属性" width="120" />
            <ElTableColumn prop="mem" label="内存">
              <template #default="{ row }">
                <span :class="{ 'text-red-500': row.danger && row.memDanger }">{{ row.mem }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="jvm" label="JVM">
              <template #default="{ row }">
                <span :class="{ 'text-red-500': row.danger && row.jvmDanger }">{{ row.jvm }}</span>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>

      <!-- 服务器信息 -->
      <ElCol :span="24" class="mb-2.5">
        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center gap-1.5">
              <span class="text-base font-medium"><i class="ri:computer-line mr-1"></i>服务器信息</span>
            </div>
          </template>
          <ElTable :data="sysData" :show-header="false" stripe size="small">
            <ElTableColumn prop="label" width="120" />
            <ElTableColumn prop="value" />
            <ElTableColumn prop="label2" width="120" />
            <ElTableColumn prop="value2" />
          </ElTable>
        </ElCard>
      </ElCol>

      <!-- JVM 信息 -->
      <ElCol :span="24" class="mb-2.5">
        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center gap-1.5">
              <span class="text-base font-medium"><i class="ri:cup-line mr-1"></i>Java虚拟机信息</span>
            </div>
          </template>
          <ElTable :data="jvmData" :show-header="false" stripe size="small">
            <ElTableColumn prop="label" width="120" />
            <ElTableColumn prop="value" />
            <ElTableColumn prop="label2" width="120" />
            <ElTableColumn prop="value2" />
          </ElTable>
        </ElCard>
      </ElCol>

      <!-- 磁盘状态 -->
      <ElCol :span="24" class="mb-2.5">
        <ElCard shadow="never">
          <template #header>
            <div class="flex items-center gap-1.5">
              <span class="text-base font-medium"><i class="ri:hard-drive-3-line mr-1"></i>磁盘状态</span>
            </div>
          </template>
          <ElTable :data="server?.sysFiles ?? []" stripe size="small" v-if="server?.sysFiles?.length">
            <ElTableColumn prop="dirName" label="盘符路径" min-width="120" show-overflow-tooltip />
            <ElTableColumn prop="sysTypeName" label="文件系统" min-width="100" />
            <ElTableColumn prop="typeName" label="盘符类型" min-width="100" />
            <ElTableColumn prop="total" label="总大小" min-width="100" />
            <ElTableColumn prop="free" label="可用大小" min-width="100" />
            <ElTableColumn prop="used" label="已用大小" min-width="100" />
            <ElTableColumn prop="usage" label="已用百分比" min-width="120">
              <template #default="{ row }">
                <span :class="{ 'text-red-500': row.usage > 80 }">{{ row.usage }}%</span>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
import { fetchServer } from '@/api/monitor'

defineOptions({ name: 'SafeguardServer' })

type ServerData = Api.Monitor.ServerData

const server = ref<ServerData>({})
const loading = ref(false)

const cpuData = computed(() => {
  const cpu = server.value.cpu
  if (!cpu) return []
  return [
    { label: '核心数', value: cpu.cpuNum },
    { label: '用户使用率', value: `${cpu.used}%` },
    { label: '系统使用率', value: `${cpu.sys}%` },
    { label: '当前空闲率', value: `${cpu.free}%` }
  ]
})

const memData = computed(() => {
  const mem = server.value.mem
  const jvm = server.value.jvm
  if (!mem || !jvm) return []
  return [
    {
      label: '总内存',
      mem: `${mem.total}G`,
      jvm: `${jvm.total}M`,
      danger: false
    },
    {
      label: '已用内存',
      mem: `${mem.used}G`,
      jvm: `${jvm.used}M`,
      danger: false
    },
    {
      label: '剩余内存',
      mem: `${mem.free}G`,
      jvm: `${jvm.free}M`,
      danger: false
    },
    {
      label: '使用率',
      mem: `${mem.usage}%`,
      jvm: `${jvm.usage}%`,
      danger: true,
      memDanger: mem.usage > 80,
      jvmDanger: jvm.usage > 80
    }
  ]
})

const sysData = computed(() => {
  const sys = server.value.sys
  if (!sys) return []
  return [
    { label: '服务器名称', value: sys.computerName, label2: '操作系统', value2: sys.osName },
    { label: '服务器IP', value: sys.computerIp, label2: '系统架构', value2: sys.osArch }
  ]
})

const jvmData = computed(() => {
  const jvm = server.value.jvm
  const sys = server.value.sys
  if (!jvm) return []
  return [
    { label: 'Java名称', value: jvm.name, label2: 'Java版本', value2: jvm.version },
    { label: '启动时间', value: jvm.startTime, label2: '运行时长', value2: jvm.runTime },
    { label: '安装路径', value: jvm.home, label2: null, value2: null, span: true },
    { label: '项目路径', value: sys?.userDir ?? '-', label2: null, value2: null, span: true },
    { label: '运行参数', value: jvm.inputArgs, label2: null, value2: null, span: true }
  ]
})

async function getData() {
  loading.value = true
  try {
    const res = await fetchServer()
    server.value = res
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getData()
})
</script>
