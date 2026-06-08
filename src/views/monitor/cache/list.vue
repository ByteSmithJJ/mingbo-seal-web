<template>
  <div class="page-content">
    <ElRow :gutter="10">
      <!-- 缓存列表 -->
      <ElCol :span="8" class="max-lg:!w-full max-lg:mb-2.5">
        <ElCard shadow="never" class="cache-card">
          <template #header>
            <div class="flex-cb">
              <span class="text-base font-medium"><i class="ri:list-check mr-1"></i>缓存列表</span>
              <ElButton :icon="'ri:refresh-line'" text size="small" @click="refreshCacheNames" />
            </div>
          </template>
          <ElTable
            v-loading="loading"
            :data="cacheNames"
            :height="tableHeight"
            highlight-current-row
            stripe
            size="small"
            @row-click="handleSelectName"
          >
            <ElTableColumn type="index" label="序号" width="50" />
            <ElTableColumn label="缓存名称" prop="cacheName" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.cacheName.replace(':', '') }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="备注" prop="remark" show-overflow-tooltip />
            <ElTableColumn label="操作" width="50" align="center">
              <template #default="{ row }">
                <ElButton
                  type="danger"
                  :icon="'ri:delete-bin-line'"
                  text
                  size="small"
                  @click.stop="handleClearCacheName(row)"
                />
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>

      <!-- 键名列表 -->
      <ElCol :span="8" class="max-lg:!w-full max-lg:mb-2.5">
        <ElCard shadow="never" class="cache-card">
          <template #header>
            <div class="flex-cb">
              <span class="text-base font-medium"><i class="ri:key-2-line mr-1"></i>键名列表</span>
              <ElButton :icon="'ri:refresh-line'" text size="small" @click="refreshCacheKeys" />
            </div>
          </template>
          <ElTable
            v-loading="subLoading"
            :data="cacheKeys"
            :height="tableHeight"
            highlight-current-row
            stripe
            size="small"
            @row-click="handleSelectKey"
          >
            <ElTableColumn type="index" label="序号" width="50" />
            <ElTableColumn label="缓存键名" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.replace(currentCacheName, '') }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="50" align="center">
              <template #default="{ row }">
                <ElButton
                  type="danger"
                  :icon="'ri:delete-bin-line'"
                  text
                  size="small"
                  @click.stop="handleClearCacheKey(row)"
                />
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>

      <!-- 缓存内容 -->
      <ElCol :span="8" class="max-lg:!w-full">
        <ElCard shadow="never" class="cache-card">
          <template #header>
            <div class="flex-cb">
              <span class="text-base font-medium"><i class="ri:file-text-line mr-1"></i>缓存内容</span>
              <ElButton type="warning" size="small" @click="handleClearCacheAll">清理全部</ElButton>
            </div>
          </template>
          <ElForm :model="cacheForm" label-width="80px" size="small">
            <ElFormItem label="缓存名称:">
              <ElInput v-model="cacheForm.cacheName" readonly />
            </ElFormItem>
            <ElFormItem label="缓存键名:">
              <ElInput v-model="cacheForm.cacheKey" readonly />
            </ElFormItem>
            <ElFormItem label="缓存内容:">
              <ElInput v-model="cacheForm.cacheValue" type="textarea" :rows="8" readonly />
            </ElFormItem>
          </ElForm>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
import {
  fetchCacheNames,
  fetchCacheKeys,
  fetchCacheValue,
  delCacheName,
  delCacheKey,
  delCacheAll
} from '@/api/monitor'
import { ElMessage, ElMessageBox } from 'element-plus'

defineOptions({ name: 'CacheList' })

const loading = ref(false)
const subLoading = ref(false)
const currentCacheName = ref('')
const cacheNames = ref<Api.Monitor.CacheNameItem[]>([])
const cacheKeys = ref<string[]>([])
const cacheForm = reactive<Api.Monitor.CacheValueData>({
  cacheName: '',
  cacheKey: '',
  cacheValue: ''
})
const tableHeight = computed(() => window.innerHeight - 240)

function loadCacheNames() {
  loading.value = true
  fetchCacheNames()
    .then((res) => { cacheNames.value = res })
    .finally(() => { loading.value = false })
}

function refreshCacheNames() {
  loadCacheNames()
  ElMessage.success('刷新缓存列表成功')
}

function handleSelectName(row: Api.Monitor.CacheNameItem) {
  currentCacheName.value = row.cacheName
  subLoading.value = true
  fetchCacheKeys(row.cacheName)
    .then((res) => { cacheKeys.value = res })
    .finally(() => { subLoading.value = false })
}

function refreshCacheKeys() {
  if (!currentCacheName.value) return
  subLoading.value = true
  fetchCacheKeys(currentCacheName.value)
    .then((res) => { cacheKeys.value = res })
    .finally(() => { subLoading.value = false })
  ElMessage.success('刷新键名列表成功')
}

function handleClearCacheName(row: Api.Monitor.CacheNameItem) {
  ElMessageBox.confirm(`确定要清理缓存名称"${row.cacheName}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    delCacheName(row.cacheName).then(() => {
      ElMessage.success(`清理缓存名称[${row.cacheName}]成功`)
      if (currentCacheName.value === row.cacheName) {
        currentCacheName.value = ''
        cacheKeys.value = []
      }
      loadCacheNames()
    })
  }).catch(() => {})
}

function handleSelectKey(cacheKey: string) {
  fetchCacheValue(currentCacheName.value, cacheKey).then((res) => {
    cacheForm.cacheName = res.cacheName
    cacheForm.cacheKey = res.cacheKey
    cacheForm.cacheValue = res.cacheValue
  })
}

function handleClearCacheKey(cacheKey: string) {
  ElMessageBox.confirm(`确定要清理缓存键名"${cacheKey}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    delCacheKey(cacheKey).then(() => {
      ElMessage.success(`清理缓存键名[${cacheKey}]成功`)
      refreshCacheKeys()
    })
  }).catch(() => {})
}

function handleClearCacheAll() {
  ElMessageBox.confirm('确定要清理全部缓存吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    delCacheAll().then(() => {
      ElMessage.success('清理全部缓存成功')
      currentCacheName.value = ''
      cacheKeys.value = []
      cacheForm.cacheName = ''
      cacheForm.cacheKey = ''
      cacheForm.cacheValue = ''
      loadCacheNames()
    })
  }).catch(() => {})
}

onMounted(() => {
  loadCacheNames()
})
</script>

<style scoped>
.cache-card {
  height: calc(100vh - 125px);
}
.cache-card :deep(.el-card__body) {
  padding: 0;
}
</style>
