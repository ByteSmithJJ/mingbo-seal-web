<!-- 字典数据管理弹窗 -->
<template>
  <ElDialog
    v-model="visible"
    :title="`字典数据管理 - ${currentType?.dictName || ''}`"
    width="800px"
    align-center
    top="5vh"
    @close="handleClose"
  >
    <div style="margin-bottom: 12px;">
      <ElSpace>
        <ElButton type="primary" size="small" @click="showDataDialog('add')">新增</ElButton>
      </ElSpace>
    </div>

    <el-table v-loading="dataLoading" :data="dataList" size="small" stripe max-height="400px">
      <el-table-column label="字典标签" prop="dictLabel" align="center" show-overflow-tooltip />
      <el-table-column label="字典键值" prop="dictValue" align="center" />
      <el-table-column label="字典排序" prop="dictSort" align="center" width="100" />
      <el-table-column label="状态" align="center" width="80">
        <template #default="{ row }">
          <ElTag :type="row.status === '0' ? 'success' : 'danger'" size="small">
            {{ row.status === '0' ? '正常' : '停用' }}
          </ElTag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="150">
        <template #default="{ row }">
          <ElButton link size="small" type="primary" @click="showDataDialog('edit', row)">修改</ElButton>
          <ElButton link size="small" type="danger" @click="handleDeleteData(row)">删除</ElButton>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="dataTotal > 10"
      v-model:current-page="dataQuery.pageNum"
      v-model:page-size="dataQuery.pageSize"
      :total="dataTotal"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      small
      @pagination="loadDataList"
    />

    <!-- 字典数据新增/编辑弹窗 -->
    <ElDialog
      v-model="dataDialogVisible"
      :title="dataDialogType === 'add' ? '新增字典数据' : '修改字典数据'"
      width="500px"
      align-center
      append-to-body
      @close="handleDataDialogClose"
    >
      <ElForm ref="dataFormRef" :model="dataForm" :rules="dataRules" label-width="100px">
        <ElFormItem label="字典类型">
          <ElInput :model-value="currentType?.dictType" disabled />
        </ElFormItem>
        <ElFormItem label="字典标签" prop="dictLabel">
          <ElInput v-model="dataForm.dictLabel" placeholder="请输入字典标签" />
        </ElFormItem>
        <ElFormItem label="字典键值" prop="dictValue">
          <ElInput v-model="dataForm.dictValue" placeholder="请输入字典键值" />
        </ElFormItem>
        <ElFormItem label="字典排序" prop="dictSort">
          <ElInputNumber v-model="dataForm.dictSort" :min="0" controls-position="right" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="样式类名">
          <ElSelect v-model="dataForm.listClass" placeholder="请选择" clearable>
            <ElOption label="默认" value="default" />
            <ElOption label="主要" value="primary" />
            <ElOption label="成功" value="success" />
            <ElOption label="信息" value="info" />
            <ElOption label="警告" value="warning" />
            <ElOption label="危险" value="danger" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="是否默认">
          <ElRadioGroup v-model="dataForm.isDefault">
            <ElRadio value="Y">是</ElRadio>
            <ElRadio value="N">否</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="dataForm.status">
            <ElRadio value="0">正常</ElRadio>
            <ElRadio value="1">停用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="dataForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dataDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="dataSubmitting" @click="handleDataSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </ElDialog>
</template>

<script setup lang="ts">
import {
  fetchDictDataList,
  fetchAddDictData,
  fetchUpdateDictData,
  fetchDeleteDictData
} from '@/api/system/dict'
import { ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'DictDataDialog' })

type DictDataItem = Api.SystemManage.DictDataItem
type DictTypeItem = Api.SystemManage.DictTypeItem

const emit = defineEmits<{ (e: 'success'): void }>()

const visible = ref(false)
const dataLoading = ref(false)
const dataList = ref<DictDataItem[]>([])
const dataTotal = ref(0)

const currentType = ref<DictTypeItem | null>(null)

const dataQuery = reactive({ pageNum: 1, pageSize: 10, dictType: '' })

// 字典数据表单
const dataDialogVisible = ref(false)
const dataDialogType = ref<'add' | 'edit'>('add')
const dataSubmitting = ref(false)
const dataFormRef = ref<FormInstance>()

const dataForm = reactive<Api.SystemManage.DictDataFormData>({
  dictSort: 0,
  dictLabel: '',
  dictValue: '',
  dictType: '',
  cssClass: '',
  listClass: 'default',
  isDefault: 'N',
  status: '0',
  remark: ''
})

const dataRules = reactive<FormRules>({
  dictLabel: [{ required: true, message: '字典标签不能为空', trigger: 'blur' }],
  dictValue: [{ required: true, message: '字典键值不能为空', trigger: 'blur' }],
  dictSort: [{ required: true, message: '字典排序不能为空', trigger: 'blur' }]
})

defineExpose({ open })

function open(row: DictTypeItem) {
  currentType.value = row
  dataQuery.dictType = row.dictType
  dataQuery.pageNum = 1
  visible.value = true
  loadDataList()
}

function loadDataList() {
  dataLoading.value = true
  fetchDictDataList(dataQuery).then((res: any) => {
    dataList.value = res.rows || []
    dataTotal.value = res.total || 0
  }).finally(() => {
    dataLoading.value = false
  })
}

function showDataDialog(type: 'add' | 'edit', row?: DictDataItem) {
  dataDialogType.value = type
  if (type === 'edit' && row) {
    Object.assign(dataForm, {
      dictCode: row.dictCode,
      dictSort: row.dictSort,
      dictLabel: row.dictLabel || '',
      dictValue: row.dictValue || '',
      dictType: row.dictType || currentType.value?.dictType || '',
      cssClass: row.cssClass || '',
      listClass: row.listClass || 'default',
      isDefault: row.isDefault || 'N',
      status: row.status || '0',
      remark: row.remark || ''
    })
  } else {
    Object.assign(dataForm, {
      dictCode: undefined,
      dictSort: 0,
      dictLabel: '',
      dictValue: '',
      dictType: currentType.value?.dictType || '',
      cssClass: '',
      listClass: 'default',
      isDefault: 'N',
      status: '0',
      remark: ''
    })
  }
  dataDialogVisible.value = true
  nextTick(() => dataFormRef.value?.clearValidate())
}

function handleDataDialogClose() {
  dataDialogVisible.value = false
  dataFormRef.value?.resetFields()
}

async function handleDataSubmit() {
  if (!dataFormRef.value) return
  try {
    await dataFormRef.value.validate()
  } catch { return }

  dataSubmitting.value = true
  try {
    if (dataForm.dictCode != null) {
      await fetchUpdateDictData({ ...dataForm })
    } else {
      await fetchAddDictData({ ...dataForm })
    }
    ElMessage.success(dataDialogType.value === 'add' ? '新增成功' : '修改成功')
    dataDialogVisible.value = false
    loadDataList()
    emit('success')
  } catch {
    // handled by interceptor
  } finally {
    dataSubmitting.value = false
  }
}

async function handleDeleteData(row: DictDataItem) {
  try {
    await ElMessageBox.confirm(`确定要删除字典数据"${row.dictLabel}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteDictData(String(row.dictCode))
    ElMessage.success('删除成功')
    loadDataList()
    emit('success')
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}

function handleClose() {
  visible.value = false
  dataList.value = []
  currentType.value = null
}
</script>
