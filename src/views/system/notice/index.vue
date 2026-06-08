<!-- 通知公告页面 -->
<template>
  <div class="art-full-height">
    <ArtSearchBar
      ref="searchBarRef"
      v-model="searchForm"
      :items="formItems"
      :rules="{}"
      @reset="handleReset"
      @search="handleSearch"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="showDialog('add')" v-ripple>新增</ElButton>
            <ElButton
              :disabled="selectedRows.length === 0"
              @click="handleBatchDelete"
              v-ripple
            >
              批量删除
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 新增/编辑弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加公告' : '修改公告'"
      width="780px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="公告标题" prop="noticeTitle">
              <ElInput v-model="form.noticeTitle" placeholder="请输入公告标题" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="公告类型" prop="noticeType">
              <ElSelect v-model="form.noticeType" placeholder="请选择公告类型">
                <ElOption label="通知" value="1" />
                <ElOption label="公告" value="2" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol :span="24">
            <ElFormItem label="状态">
              <ElRadioGroup v-model="form.status">
                <ElRadio value="0">正常</ElRadio>
                <ElRadio value="1">关闭</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol :span="24">
            <ElFormItem label="内容" prop="noticeContent">
              <ArtWangEditor
                v-model="form.noticeContent"
                height="350px"
                mode="simple"
                placeholder="请输入公告内容"
              />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 公告详情弹窗 -->
    <ElDialog
      v-model="detailVisible"
      title="公告详情"
      width="700px"
      align-center
    >
      <div v-if="detailRow" style="padding: 0 12px;">
        <h3 style="margin-bottom: 16px; text-align: center;">{{ detailRow.noticeTitle }}</h3>
        <div style="display: flex; justify-content: center; gap: 24px; color: #888; font-size: 13px; margin-bottom: 20px;">
          <span>类型：{{ detailRow.noticeType === '1' ? '通知' : '公告' }}</span>
          <span>创建者：{{ detailRow.createBy }}</span>
          <span>创建时间：{{ detailRow.createTime }}</span>
        </div>
        <div style="line-height: 1.8; padding: 16px; background: #f8f9fb; border-radius: 4px; min-height: 120px;" v-html="detailRow.noticeContent" />
      </div>
    </ElDialog>

    <!-- 已读用户弹窗 -->
    <ReadUsersDialog ref="readUsersRef" />
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import { fetchNoticeList, fetchNotice, fetchAddNotice, fetchUpdateNotice, fetchDeleteNotice } from '@/api/system/notice'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
import type { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
import { ElTag, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import ArtWangEditor from '@/components/core/forms/art-wang-editor/index.vue'
import ReadUsersDialog from './modules/ReadUsers.vue'

defineOptions({ name: 'Notice' })

type NoticeItem = Api.SystemManage.NoticeItem

const selectedRows = ref<NoticeItem[]>([])
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const detailVisible = ref(false)
const detailRow = ref<NoticeItem | null>(null)
const readUsersRef = ref()

const searchForm = ref<Api.SystemManage.NoticeSearchParams>({
  noticeTitle: '',
  noticeType: '',
  createBy: '',
  status: ''
})

const form = reactive<Api.SystemManage.NoticeFormData>({
  noticeTitle: '',
  noticeType: '1',
  noticeContent: '',
  status: '0'
})

const rules = reactive<FormRules>({
  noticeTitle: [{ required: true, message: '公告标题不能为空', trigger: 'blur' }],
  noticeType: [{ required: true, message: '公告类型不能为空', trigger: 'change' }]
})

const noticeTypeOptions = [
  { label: '通知', value: '1' },
  { label: '公告', value: '2' }
]

const formItems = computed(() => [
  { label: '公告标题', key: 'noticeTitle', type: 'input', props: { placeholder: '请输入公告标题', clearable: true } },
  {
    label: '公告类型',
    key: 'noticeType',
    type: 'select',
    props: { placeholder: '公告类型', options: noticeTypeOptions, clearable: true }
  },
  { label: '操作人员', key: 'createBy', type: 'input', props: { placeholder: '请输入操作人员', clearable: true } }
])

const {
  columns,
  columnChecks,
  data,
  loading,
  pagination,
  getData,
  replaceSearchParams,
  resetSearchParams,
  handleSizeChange,
  handleCurrentChange,
  refreshData
} = useTable({
  core: {
    apiFn: fetchNoticeList,
    apiParams: { pageNum: 1, pageSize: 10 },
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { type: 'selection', width: 50 },
      { prop: 'noticeId', label: '序号', width: 80 },
      {
        prop: 'noticeTitle',
        label: '公告标题',
        minWidth: 180,
        showOverflowTooltip: true,
        formatter: (row: NoticeItem) =>
          h('span', { class: 'link-type cursor-pointer', onClick: () => handleViewDetail(row) }, row.noticeTitle)
      },
      {
        prop: 'noticeType',
        label: '公告类型',
        width: 100,
        formatter: (row: NoticeItem) =>
          h(ElTag, { size: 'small', type: row.noticeType === '1' ? 'primary' : 'warning' }, () => row.noticeType === '1' ? '通知' : '公告')
      },
      {
        prop: 'status',
        label: '状态',
        width: 80,
        formatter: (row: NoticeItem) =>
          h(ElTag, { type: row.status === '0' ? 'success' : 'info', size: 'small' }, () => row.status === '0' ? '正常' : '关闭')
      },
      { prop: 'createBy', label: '创建者', width: 100 },
      { prop: 'createTime', label: '创建时间', width: 120 },
      {
        prop: 'operation',
        label: '操作',
        width: 220,
        fixed: 'right' as const,
        formatter: (row: NoticeItem) =>
          h('div', { class: 'flex items-center gap-1' }, [
            h(ArtButtonTable, { type: 'view', title: '阅读用户', icon: 'ri:user-line', onClick: () => handleReadUsers(row) }),
            h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
            h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
          ])
      }
    ]
  },
  transform: {
    responseAdapter: (response: any) => ({
      records: response.rows || [],
      total: response.total || 0,
      current: undefined as any,
      size: undefined as any
    })
  }
})

function handleSearch() {
  replaceSearchParams(searchForm.value)
  getData()
}

function handleReset() {
  searchForm.value = { noticeTitle: '', noticeType: '', createBy: '', status: '' }
  resetSearchParams()
}

function showDialog(type: 'add' | 'edit', row?: NoticeItem) {
  dialogType.value = type
  if (type === 'edit' && row) {
    fetchNotice(row.noticeId).then((res: any) => {
      const d = res.data || res
      Object.assign(form, {
        noticeId: d.noticeId,
        noticeTitle: d.noticeTitle || '',
        noticeType: d.noticeType || '1',
        noticeContent: d.noticeContent || '',
        status: d.status || '0'
      })
    })
  } else {
    Object.assign(form, { noticeId: undefined, noticeTitle: '', noticeType: '1', noticeContent: '', status: '0' })
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function handleDialogClose() {
  dialogVisible.value = false
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch { return }

  submitting.value = true
  try {
    if (form.noticeId != null) {
      await fetchUpdateNotice({ ...form })
    } else {
      await fetchAddNotice({ ...form })
    }
    ElMessage.success(dialogType.value === 'add' ? '新增成功' : '修改成功')
    dialogVisible.value = false
    refreshData()
  } catch {
    // handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: NoticeItem) {
  try {
    await ElMessageBox.confirm(`确定要删除公告"${row.noticeTitle}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteNotice(String(row.noticeId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的公告')
    return
  }
  const ids = selectedRows.value.map((r) => r.noticeId).join(',')
  try {
    await ElMessageBox.confirm(`确定要删除选中的${selectedRows.value.length}条公告吗？`, '批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteNotice(ids)
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

function handleViewDetail(row: NoticeItem) {
  detailRow.value = row
  detailVisible.value = true
}

function handleReadUsers(row: NoticeItem) {
  readUsersRef.value?.open(row)
}

function handleSelectionChange(selection: NoticeItem[]) {
  selectedRows.value = selection
}
</script>

<style scoped>
.link-type {
  color: var(--main-color);
}
.link-type:hover {
  text-decoration: underline;
}
</style>
