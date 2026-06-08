<!-- 字典数据明细抽屉 -->
<template>
  <ElDrawer
    v-model="visible"
    :title="title"
    direction="rtl"
    size="600px"
  >
    <div v-if="loading" style="display: flex; align-items: center; justify-content: center; height: 120px; color: #aaa;">
      <span>加载中...</span>
    </div>
    <div v-else-if="!dataList.length" style="text-align: center; color: #bbb; padding: 60px 0;">
      <span>暂无字典数据</span>
    </div>
    <template v-else>
      <ElRow :gutter="12" style="margin-bottom: 16px;">
        <ElCol :span="disabledCount > 0 ? 8 : 12">
          <div class="stat-card">
            <div class="stat-num">{{ dataList.length }}</div>
            <div class="stat-label">共计条目</div>
          </div>
        </ElCol>
        <ElCol :span="disabledCount > 0 ? 8 : 12">
          <div class="stat-card">
            <div class="stat-num success">{{ normalCount }}</div>
            <div class="stat-label">正常</div>
          </div>
        </ElCol>
        <ElCol v-if="disabledCount > 0" :span="8">
          <div class="stat-card">
            <div class="stat-num danger">{{ disabledCount }}</div>
            <div class="stat-label">停用</div>
          </div>
        </ElCol>
      </ElRow>
      <div v-for="item in dataList" :key="item.dictCode" class="dict-item">
        <div class="dict-cell">
          <div class="dict-cell-key">标签</div>
          <div class="dict-cell-val">
            <ElTag v-if="item.listClass && item.listClass !== 'default'" :type="(item.listClass as any)" size="small">{{ item.dictLabel }}</ElTag>
            <span v-else>{{ item.dictLabel }}</span>
          </div>
        </div>
        <div class="dict-cell">
          <div class="dict-cell-key">键值</div>
          <div class="dict-cell-val">{{ item.dictValue }}</div>
        </div>
        <div class="dict-cell">
          <div class="dict-cell-key">状态</div>
          <div class="dict-cell-val">
            <ElTag :type="item.status === '0' ? 'success' : 'danger'" size="small">
              {{ item.status === '0' ? '正常' : '停用' }}
            </ElTag>
          </div>
        </div>
      </div>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
import { fetchDictDataList } from '@/api/system/dict'

type DictDataItem = Api.SystemManage.DictDataItem

const visible = ref(false)
const loading = ref(false)
const title = ref('')
const dataList = ref<DictDataItem[]>([])

const normalCount = computed(() => dataList.value.filter((r) => r.status === '0').length)
const disabledCount = computed(() => dataList.value.filter((r) => r.status !== '0').length)

defineExpose({ open })

function open(row: { dictName: string; dictType: string }) {
  title.value = `${row.dictName}　${row.dictType}`
  visible.value = true
  loadData(row.dictType)
}

function loadData(dictType: string) {
  loading.value = true
  dataList.value = []
  fetchDictDataList({ dictType, pageNum: 1, pageSize: 100 }).then((res: any) => {
    dataList.value = res.rows || []
  }).finally(() => {
    loading.value = false
  })
}
</script>

<style scoped>
.stat-card {
  background: #f7f9fb;
  border: 1px solid #e8ecf0;
  border-radius: 6px;
  padding: 10px 14px;
  text-align: center;
}
.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #2c3e50;
}
.stat-num.success { color: #27ae60; }
.stat-num.danger { color: #e74c3c; }
.stat-label {
  font-size: 11px;
  color: #95a5a6;
  margin-top: 4px;
}
.dict-item {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border: 1px solid #e8ecf0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}
.dict-cell {
  display: grid;
  grid-template-columns: 70px 1fr;
  border-right: 1px solid #f0f4f8;
}
.dict-cell:last-child {
  border-right: 0;
}
.dict-cell-key {
  padding: 9px 14px;
  font-size: 12px;
  color: #888;
  background: #f7f9fb;
  border-right: 1px solid #f0f4f8;
}
.dict-cell-val {
  padding: 9px 14px;
  font-size: 13px;
  color: #2c3e50;
  display: flex;
  align-items: center;
}
</style>
