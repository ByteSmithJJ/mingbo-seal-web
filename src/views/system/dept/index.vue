<!-- 部门管理页面 -->
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
      <ArtTableHeader :showZebra="false" :loading="loading" @refresh="getDeptList">
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="showDialog('add')" v-ripple>新增</ElButton>
            <ElButton type="warning" plain @click="handleSaveSort" v-ripple>保存排序</ElButton>
            <ElButton type="info" plain @click="toggleExpandAll" v-ripple>
              {{ isExpandAll ? '全部折叠' : '全部展开' }}
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        ref="tableRef"
        v-if="refreshTable"
        row-key="deptId"
        :loading="loading"
        :columns="columns"
        :data="deptList"
        :stripe="false"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :default-expand-all="isExpandAll"
      />
    </ElCard>

    <!-- 新增/编辑弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加部门' : '修改部门'"
      width="600px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElRow :gutter="20">
          <ElCol :span="24" v-if="form.parentId !== 0">
            <ElFormItem label="上级部门" prop="parentId">
              <ElTreeSelect
                v-model="form.parentId"
                :data="deptTreeOptions"
                :props="{ label: 'label', value: 'id', children: 'children' }"
                placeholder="选择上级部门"
                check-strictly
                clearable
                style="width: 100%"
              />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="部门名称" prop="deptName">
              <ElInput v-model="form.deptName" placeholder="请输入部门名称" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="显示排序" prop="orderNum">
              <ElInputNumber v-model="form.orderNum" :min="0" controls-position="right" style="width: 100%" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="负责人" prop="leader">
              <ElInput v-model="form.leader" placeholder="请输入负责人" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="联系电话" prop="phone">
              <ElInput v-model="form.phone" placeholder="请输入联系电话" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="邮箱" prop="email">
              <ElInput v-model="form.email" placeholder="请输入邮箱" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="部门状态">
              <ElRadioGroup v-model="form.status">
                <ElRadio value="0">正常</ElRadio>
                <ElRadio value="1">停用</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { fetchDeptList, fetchDept, fetchDeptExcludeChild, fetchAddDept, fetchUpdateDept, fetchUpdateDeptSort, fetchDeleteDept } from '@/api/system/dept'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElInputNumber, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'Dept' })

type DeptItem = Api.SystemManage.DeptItem

const loading = ref(false)
const deptList = ref<DeptItem[]>([])
const deptOptions = ref<DeptItem[]>([])
const deptTreeOptions = ref<{ id: number; label: string; children: any[] }[]>([])
const isExpandAll = ref(true)
const refreshTable = ref(true)
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()

// 排序变更追踪
const originalOrders = ref<Record<number, number>>({})

const searchForm = ref<Api.SystemManage.DeptSearchParams>({
  deptName: '',
  status: ''
})

const form = reactive<Api.SystemManage.DeptFormData>({
  parentId: undefined,
  deptName: '',
  orderNum: 0,
  leader: '',
  phone: '',
  email: '',
  status: '0'
})

const rules = reactive<FormRules>({
  deptName: [{ required: true, message: '部门名称不能为空', trigger: 'blur' }],
  orderNum: [{ required: true, message: '显示排序不能为空', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }]
})

const statusOptions = [{ label: '正常', value: '0' }, { label: '停用', value: '1' }]

const formItems = computed(() => [
  { label: '部门名称', key: 'deptName', type: 'input', props: { placeholder: '请输入部门名称', clearable: true } },
  { label: '状态', key: 'status', type: 'select', props: { placeholder: '部门状态', options: statusOptions, clearable: true } }
])

const columns = computed(() => [
  { prop: 'deptName', label: '部门名称', minWidth: 200 },
  {
    prop: 'orderNum',
    label: '排序',
    width: 180,
    formatter: (row: DeptItem) =>
      h(ElInputNumber, {
        modelValue: row.orderNum,
        'onUpdate:modelValue': (val: number | undefined) => { row.orderNum = (val ?? 0) },
        min: 0,
        size: 'small',
        controlsPosition: 'right',
        style: 'width: 100px'
      })
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    formatter: (row: DeptItem) =>
      h(ElTag, { type: row.status === '0' ? 'success' : 'danger', size: 'small' }, () => row.status === '0' ? '正常' : '停用')
  },
  { prop: 'createTime', label: '创建时间', width: 180 },
  {
    prop: 'operation',
    label: '操作',
    width: 180,
    fixed: 'right' as const,
    formatter: (row: DeptItem) =>
      h('div', { class: 'flex items-center gap-1' }, [
        h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
        h(ArtButtonTable, { type: 'add', title: '新增子部门', onClick: () => showDialog('add', row) }),
        row.parentId !== 0 ? h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) }) : null
      ])
  }
])

onMounted(() => getDeptList())

function buildTree(data: DeptItem[]): DeptItem[] {
  const map = new Map<number, DeptItem>()
  const result: DeptItem[] = []
  data.forEach(item => { map.set(item.deptId, { ...item, children: [] }) })
  data.forEach(item => {
    const node = map.get(item.deptId)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(node)
    } else {
      result.push(node)
    }
  })
  return result
}

function convertToTreeSelect(nodes: DeptItem[]): { id: number; label: string; children: any[] }[] {
  return nodes.map(n => ({
    id: n.deptId,
    label: n.deptName,
    children: n.children ? convertToTreeSelect(n.children) : []
  }))
}

function recordOrders(list: DeptItem[]) {
  list.forEach(item => {
    originalOrders.value[item.deptId] = item.orderNum
    if (item.children?.length) recordOrders(item.children)
  })
}

async function getDeptList() {
  loading.value = true
  try {
    const res: any = await fetchDeptList(searchForm.value)
    const raw = res.data || res
    deptOptions.value = raw || []
    deptList.value = buildTree(raw || [])
    recordOrders(deptList.value)
  } catch { /* handled by interceptor */ } finally {
    loading.value = false
  }
}

function handleSearch() {
  getDeptList()
}

function handleReset() {
  searchForm.value = { deptName: '', status: '' }
  getDeptList()
}

function toggleExpandAll() {
  refreshTable.value = false
  isExpandAll.value = !isExpandAll.value
  nextTick(() => { refreshTable.value = true })
}

async function handleSaveSort() {
  const changedDeptIds: number[] = []
  const changedOrderNums: number[] = []

  function collectChanged(list: DeptItem[]) {
    list.forEach(item => {
      if (String(originalOrders.value[item.deptId]) !== String(item.orderNum)) {
        changedDeptIds.push(item.deptId)
        changedOrderNums.push(item.orderNum)
      }
      if (item.children?.length) collectChanged(item.children)
    })
  }
  collectChanged(deptList.value)

  if (changedDeptIds.length === 0) {
    ElMessage.warning('未检测到排序修改')
    return
  }

  try {
    await fetchUpdateDeptSort({
      deptIds: changedDeptIds.join(','),
      orderNums: changedOrderNums.join(',')
    })
    ElMessage.success('排序保存成功')
    recordOrders(deptList.value)
  } catch { /* handled by interceptor */ }
}

function showDialog(type: 'add' | 'edit', row?: DeptItem) {
  dialogType.value = type
  if (type === 'edit' && row) {
    fetchDept(row.deptId).then((res: any) => {
      const d = res.data || res
      Object.assign(form, {
        deptId: d.deptId,
        parentId: d.parentId,
        deptName: d.deptName || '',
        orderNum: d.orderNum || 0,
        leader: d.leader || '',
        phone: d.phone || '',
        email: d.email || '',
        status: d.status || '0'
      })
      loadDeptTreeForEdit(row.deptId)
    })
  } else if (type === 'add') {
    Object.assign(form, { deptId: undefined, parentId: row ? row.deptId : 0, deptName: '', orderNum: 0, leader: '', phone: '', email: '', status: '0' })
    loadDeptTreeForAdd()
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function loadDeptTreeForAdd() {
  deptTreeOptions.value = convertToTreeSelect(deptOptions.value)
}

function loadDeptTreeForEdit(deptId: number) {
  fetchDeptExcludeChild(deptId).then((res: any) => {
    const treeData = res.data || []
    deptTreeOptions.value = convertToTreeSelect(treeData)
  }).catch(() => {
    deptTreeOptions.value = convertToTreeSelect(deptOptions.value)
  })
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
    if (form.deptId != null) {
      await fetchUpdateDept({ ...form })
    } else {
      await fetchAddDept({ ...form })
    }
    ElMessage.success(dialogType.value === 'add' ? '新增成功' : '修改成功')
    dialogVisible.value = false
    getDeptList()
  } catch {
    // handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: DeptItem) {
  try {
    await ElMessageBox.confirm(`确定要删除部门"${row.deptName}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteDept(row.deptId)
    ElMessage.success('删除成功')
    getDeptList()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}
</script>
