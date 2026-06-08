<template>
  <ElDialog v-model="visible" title="用户导入" width="500px" align-center @close="handleClose">
    <div class="flex flex-col gap-5">
      <!-- 文件上传区域 -->
      <ElUpload
        ref="uploadRef"
        class="import-upload"
        drag
        :auto-upload="false"
        accept=".xlsx,.xls"
        :limit="1"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
      >
        <div
          class="flex flex-col items-center justify-center gap-3 py-8 px-4"
          :class="selectedFile ? 'border-emerald-400 bg-emerald-50/60' : ''"
        >
          <span
            class="text-4xl"
            :class="
              selectedFile
                ? 'i-ri:file-excel-2-fill text-emerald-500'
                : 'i-ri:upload-cloud-2-line text-gray-300'
            "
          />
          <div v-if="selectedFile" class="text-center">
            <p class="text-sm font-medium text-gray-700">{{ selectedFile.name }}</p>
            <p class="text-xs text-gray-400 mt-1">
              {{ formatFileSize(selectedFile.size) }}
            </p>
          </div>
          <div v-else class="text-center">
            <p class="text-sm text-gray-500"
              >将文件拖到此处，或<span class="text-blue-500">点击选择</span></p
            >
            <p class="text-xs text-gray-400 mt-1">仅支持 .xlsx、.xls 格式</p>
          </div>
        </div>
      </ElUpload>

      <!-- 已选文件操作 -->
      <div
        v-if="selectedFile"
        class="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
      >
        <div class="flex items-center gap-3">
          <span class="i-ri:file-excel-2-line text-2xl text-green-600" />
          <div>
            <p class="text-sm font-medium text-gray-700">{{ selectedFile.name }}</p>
            <p class="text-xs text-gray-400">已选择</p>
          </div>
        </div>
        <ElButton text type="danger" size="small" @click="handleRemoveFile">
          <span class="i-ri:close-line mr-1" />
          移除
        </ElButton>
      </div>

      <!-- 分隔线 -->
      <ElDivider class="!my-0" />

      <!-- 模板下载 -->
      <div
        class="flex items-center gap-4 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3.5 cursor-pointer transition-colors hover:bg-blue-50"
        @click="handleDownloadTemplate"
      >
        <span class="i-ri:file-download-line text-xl text-blue-500 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-blue-700">下载导入模板</p>
          <p class="text-xs text-blue-500/70 mt-0.5">按模板格式填写数据后导入，确保数据格式正确</p>
        </div>
        <span class="i-ri:arrow-right-s-line text-blue-400 flex-shrink-0" />
      </div>

      <!-- 更新策略 -->
      <ElCheckbox v-model="updateSupport" class="!mr-0">
        <span class="text-sm text-gray-600">是否更新已经存在的用户数据</span>
      </ElCheckbox>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <ElButton @click="visible = false">取消</ElButton>
        <ElButton
          type="primary"
          :loading="importing"
          :disabled="!selectedFile"
          @click="handleImport"
        >
          <span v-if="!importing" class="i-ri:upload-2-line mr-1" />
          开始导入
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { fetchImportUser, fetchImportTemplate } from '@/api/system/user'
  import type { UploadFile, UploadInstance } from 'element-plus'

  const visible = defineModel<boolean>({ default: false })

  const emit = defineEmits<{
    success: []
  }>()

  const uploadRef = ref<UploadInstance>()
  const selectedFile = ref<File | null>(null)
  const updateSupport = ref(false)
  const importing = ref(false)

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function handleFileChange(file: UploadFile) {
    selectedFile.value = file.raw || null
  }

  function handleFileRemove() {
    selectedFile.value = null
  }

  function handleRemoveFile() {
    selectedFile.value = null
    uploadRef.value?.clearFiles()
  }

  function handleClose() {
    selectedFile.value = null
    updateSupport.value = false
    uploadRef.value?.clearFiles()
  }

  async function handleDownloadTemplate() {
    try {
      const blob = await fetchImportTemplate()
      const url = window.URL.createObjectURL(blob as unknown as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '用户导入模板.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      ElMessage.success('模板下载成功')
    } catch {
      ElMessage.error('模板下载失败')
    }
  }

  async function handleImport() {
    if (!selectedFile.value) {
      ElMessage.warning('请选择要导入的文件')
      return
    }

    importing.value = true
    try {
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      formData.append('updateSupport', String(updateSupport.value))
      await fetchImportUser(formData)
      ElMessage.success('导入成功')
      visible.value = false
      emit('success')
    } catch {
      // error handled by HTTP interceptor
    } finally {
      importing.value = false
    }
  }
</script>

<style scoped>
  /* 美化拖拽上传区域 */
  :deep(.import-upload .el-upload-dragger) {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    transition: all 0.2s ease;
    padding: 0;
  }
  :deep(.import-upload .el-upload-dragger:hover) {
    border-color: #3b82f6;
    background-color: #f8fafc;
  }
  :deep(.import-upload .el-upload-dragger.is-dragover) {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }
</style>
