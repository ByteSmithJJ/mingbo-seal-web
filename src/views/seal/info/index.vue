<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElButton type="primary" @click="showDialog('add')" v-ripple>新增印章</ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增印章' : '编辑印章'"
      width="600px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="印章名称" prop="sealName">
          <ElInput v-model="form.sealName" placeholder="请输入印章名称" maxlength="64" />
        </ElFormItem>
        <ElFormItem label="印章编号" prop="sealCode">
          <ElInput v-model="form.sealCode" placeholder="请输入印章编号" maxlength="64" />
        </ElFormItem>
        <ElFormItem label="印章类型" prop="sealType">
          <ElSelect v-model="form.sealType" placeholder="请选择印章类型" class="w-full">
            <ElOption label="公章" value="公章" />
            <ElOption label="合同章" value="合同章" />
            <ElOption label="财务章" value="财务章" />
            <ElOption label="法人章" value="法人章" />
            <ElOption label="部门章" value="部门章" />
            <ElOption label="项目章" value="项目章" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="印章图片">
          <ElUpload
            class="seal-uploader"
            :show-file-list="false"
            :before-upload="handleBeforeUpload"
            :http-request="handleImageUpload"
            accept="image/*"
          >
            <div class="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[var(--main-color)] transition-colors">
              <img v-if="form.sealImage" :src="form.sealImage" class="w-full h-full object-contain" />
              <div v-else class="flex flex-col items-center text-gray-400">
                <i class="ri:upload-cloud-2-line text-2xl" />
                <span class="text-xs mt-1">上传印章</span>
              </div>
            </div>
          </ElUpload>
          <p v-if="form.sealImage" class="mt-2">
            <ElButton link size="small" type="danger" @click="form.sealImage = ''">移除图片</ElButton>
          </p>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="form.status">
            <ElRadio value="0">启用</ElRadio>
            <ElRadio value="1">停用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" type="textarea" placeholder="请输入备注" maxlength="500" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { useTable } from '@/hooks/core/useTable'
import { fetchSealList, createSeal, updateSeal, deleteSeal, type SealInfo } from '@/api/seal'
import request from '@/utils/http'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'SealInfo' })

const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const currentRow = ref<SealInfo | null>(null)

const form = reactive({
  sealName: '',
  sealCode: '',
  sealType: '',
  sealImage: '',
  status: '0',
  remark: ''
})

const rules = reactive<FormRules>({
  sealName: [{ required: true, message: '请输入印章名称', trigger: 'blur' }],
  sealCode: [{ required: true, message: '请输入印章编号', trigger: 'blur' }],
  sealType: [{ required: true, message: '请选择印章类型', trigger: 'change' }]
})

const {
  columns,
  columnChecks,
  data,
  loading,
  pagination,
  getData,
  handleSizeChange,
  handleCurrentChange,
  refreshData
} = useTable({
  core: {
    apiFn: fetchSealList,
    apiParams: { pageNum: 1, pageSize: 10 },
    paginationKey: { current: 'pageNum', size: 'pageSize' },
    columnsFactory: () => [
      { prop: 'sealId', label: 'ID', width: 70 },
      { prop: 'sealName', label: '印章名称', minWidth: 150, showOverflowTooltip: true },
      { prop: 'sealCode', label: '印章编号', minWidth: 140, showOverflowTooltip: true },
      { prop: 'sealType', label: '印章类型', width: 90 },
      {
        prop: 'sealImage',
        label: '印章图片',
        width: 90,
        align: 'center',
        formatter: (row: any) =>
          row.sealImage
            ? h('img', { src: row.sealImage, style: 'width:32px;height:32px;object-fit:contain;cursor:pointer', onClick: () => window.open(row.sealImage) })
            : h('span', { class: 'text-gray-400' }, '暂无')
      },
      {
        prop: 'status',
        label: '状态',
        width: 80,
        align: 'center',
        formatter: (row: any) =>
          h(ElTag, { size: 'small', type: row.status === '0' ? 'success' : 'danger' }, () => row.status === '0' ? '启用' : '停用')
      },
      { prop: 'createTime', label: '创建时间', width: 170 },
      {
        prop: 'operation',
        label: '操作',
        width: 150,
        fixed: 'right' as const,
        formatter: (row: any) =>
          h('div', { class: 'flex items-center gap-1' }, [
            h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
            h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
          ])
      }
    ]
  },
  transform: {
    responseAdapter: (response: any) => ({
      records: response.rows || [],
      total: response.total || 0
    })
  }
})

function handleBeforeUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('仅支持图片格式')
    return false
  }
  if (file.size / 1024 / 1024 > 2) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

async function handleImageUpload(options: { file: File }) {
  const fd = new FormData()
  fd.append('file', options.file)
  try {
    const data = await request.post<any>({
      url: '/api/common/upload',
      data: fd,
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    form.sealImage = data.url || ''
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
}

function showDialog(type: 'add' | 'edit', row?: SealInfo) {
  dialogType.value = type
  if (type === 'edit' && row) {
    currentRow.value = row
    Object.assign(form, {
      sealName: row.sealName || '',
      sealCode: row.sealCode || '',
      sealType: row.sealType || '',
      sealImage: row.sealImage || '',
      status: row.status || '0',
      remark: row.remark || ''
    })
  } else {
    currentRow.value = null
    Object.assign(form, { sealName: '', sealCode: '', sealType: '', sealImage: '', status: '0', remark: '' })
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function handleDialogClose() {
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!formRef.value) return
  try { await formRef.value.validate() } catch { return }

  submitting.value = true
  try {
    if (currentRow.value?.sealId) {
      await updateSeal({ ...form, sealId: currentRow.value.sealId } as SealInfo)
    } else {
      await createSeal(form as SealInfo)
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

async function handleDelete(row: SealInfo) {
  try {
    await ElMessageBox.confirm(`确定要删除印章"${row.sealName}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteSeal(String(row.sealId))
    ElMessage.success('删除成功')
    refreshData()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

onMounted(() => {
  getData()
})
</script>
