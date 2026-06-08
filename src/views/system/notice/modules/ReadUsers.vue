<!-- 公告已读用户弹窗 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="`「${noticeTitle}」已读用户`"
    width="760px"
    top="6vh"
    align-center
    @close="handleClose"
  >
    <ElForm :model="queryParams" size="small" :inline="true" style="margin-bottom: 4px;">
      <ElFormItem prop="searchValue">
        <ElInput
          v-model="queryParams.searchValue"
          placeholder="登录名称 / 用户名称"
          clearable
          style="width: 220px"
          @keyup.enter="handleQuery"
          @clear="handleQuery"
        />
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" size="small" @click="handleQuery">搜索</ElButton>
        <ElButton size="small" @click="resetQuery">重置</ElButton>
      </ElFormItem>
      <ElFormItem style="float: right; margin-right: 0;">
        <span class="read-stat">共 <strong>{{ total }}</strong> 人已读</span>
      </ElFormItem>
    </ElForm>

    <el-table v-loading="loading" :data="userList" size="small" stripe height="340px">
      <el-table-column type="index" label="序号" width="55" align="center" />
      <el-table-column label="登录名称" prop="userName" align="center" show-overflow-tooltip />
      <el-table-column label="用户名称" prop="nickName" align="center" show-overflow-tooltip />
      <el-table-column label="所属部门" prop="deptName" align="center" show-overflow-tooltip />
      <el-table-column label="手机号码" prop="phonenumber" align="center" width="120" />
      <el-table-column label="阅读时间" prop="readTime" align="center" width="160" />
    </el-table>

    <el-pagination
      v-show="total > 0"
      v-model:current-page="queryParams.pageNum"
      v-model:page-size="queryParams.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="padding: 6px 0;"
      @pagination="getList"
    />
  </ElDialog>
</template>

<script setup lang="ts">
import { fetchNoticeReadUsers } from '@/api/system/notice'

type ReadUserItem = Api.SystemManage.NoticeReadUserItem

const visible = ref(false)
const loading = ref(false)
const noticeId = ref<number>()
const noticeTitle = ref('')
const total = ref(0)
const userList = ref<ReadUserItem[]>([])
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  noticeId: undefined as number | undefined,
  searchValue: ''
})

defineExpose({ open })

function open(row: { noticeId: number; noticeTitle: string }) {
  noticeId.value = row.noticeId
  noticeTitle.value = row.noticeTitle
  queryParams.noticeId = row.noticeId
  queryParams.searchValue = ''
  queryParams.pageNum = 1
  visible.value = true
  getList()
}

function getList() {
  if (!queryParams.noticeId) return
  loading.value = true
  fetchNoticeReadUsers({ ...queryParams } as any).then((res: any) => {
    userList.value = res.rows || []
    total.value = res.total || 0
  }).finally(() => {
    loading.value = false
  })
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  queryParams.searchValue = ''
  handleQuery()
}

function handleClose() {
  visible.value = false
  userList.value = []
  total.value = 0
  queryParams.searchValue = ''
}
</script>

<style scoped>
.read-stat {
  font-size: 13px;
  color: #606266;
  line-height: 28px;
}
.read-stat strong {
  color: #409eff;
  font-size: 15px;
  margin: 0 2px;
}
</style>
