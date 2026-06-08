<!-- 菜单管理页面 -->
<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="formItems"
      :rules="{}"
      @reset="handleReset"
      @search="handleSearch"
    />

    <ElCard class="art-table-card">
      <ArtTableHeader :showZebra="false" :loading="loading" @refresh="getMenuList">
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
        v-if="refreshTable"
        ref="tableRef"
        row-key="menuId"
        :loading="loading"
        :data="menuList"
        :columns="columns"
        :stripe="false"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :default-expand-all="isExpandAll"
      />
    </ElCard>

    <!-- 新增/编辑菜单弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加菜单' : '修改菜单'"
      width="680px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="上级菜单">
          <ElTreeSelect
            v-model="form.parentId"
            :data="menuTreeOptions"
            :props="{ label: 'label', value: 'id', children: 'children' }"
            placeholder="选择上级菜单"
            check-strictly
            clearable
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="菜单类型">
          <ElRadioGroup v-model="form.menuType" :disabled="dialogType === 'edit'">
            <ElRadio label="M">目录</ElRadio>
            <ElRadio label="C">菜单</ElRadio>
            <ElRadio label="F">按钮</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElRow :gutter="20">
          <ElCol :span="form.menuType !== 'F' ? 12 : 24">
            <ElFormItem label="菜单名称" prop="menuName">
              <ElInput v-model="form.menuName" placeholder="请输入菜单名称" />
            </ElFormItem>
          </ElCol>
          <ElCol v-if="form.menuType !== 'F'" :span="12">
            <ElFormItem label="图标">
              <ElInput v-model="form.icon" placeholder="请输入图标名称" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="显示排序" prop="orderNum">
              <ElInputNumber v-model="form.orderNum" :min="0" controls-position="right" style="width: 100%" />
            </ElFormItem>
          </ElCol>
          <ElCol v-if="form.menuType !== 'F'" :span="12">
            <ElFormItem label="是否外链">
              <ElRadioGroup v-model="form.isFrame">
                <ElRadio value="0">是</ElRadio>
                <ElRadio value="1">否</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow v-if="form.menuType !== 'F'" :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="路由地址" prop="path">
              <ElInput v-model="form.path" placeholder="请输入路由地址" />
            </ElFormItem>
          </ElCol>
          <ElCol v-if="form.menuType === 'C'" :span="12">
            <ElFormItem label="组件路径">
              <ElInput v-model="form.component" placeholder="请输入组件路径" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow v-if="form.menuType !== 'M'" :gutter="20">
          <ElCol :span="form.menuType === 'C' ? 12 : 24">
            <ElFormItem label="权限字符">
              <ElInput v-model="form.perms" placeholder="请输入权限标识" />
            </ElFormItem>
          </ElCol>
          <ElCol v-if="form.menuType === 'C'" :span="12">
            <ElFormItem label="路由参数">
              <ElInput v-model="form.query" placeholder='如：{"id": 1}' />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow v-if="form.menuType === 'C'" :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="是否缓存">
              <ElRadioGroup v-model="form.isCache">
                <ElRadio value="0">缓存</ElRadio>
                <ElRadio value="1">不缓存</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="20">
          <ElCol v-if="form.menuType !== 'F'" :span="12">
            <ElFormItem label="显示状态">
              <ElRadioGroup v-model="form.visible">
                <ElRadio value="0">显示</ElRadio>
                <ElRadio value="1">隐藏</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="菜单状态">
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
import { fetchMenuList, fetchMenu, fetchAddMenu, fetchUpdateMenu, fetchUpdateMenuSort, fetchDeleteMenu } from '@/api/system/menu'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { ElTag, ElInputNumber, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'Menu' })

type MenuItem = Api.SystemManage.MenuItem

const loading = ref(false)
const isExpandAll = ref(false)
const refreshTable = ref(true)
const menuList = ref<MenuItem[]>([])
const menuOptions = ref<MenuItem[]>([])
const menuTreeOptions = ref<{ id: number; label: string; children: any[] }[]>([])
const dialogVisible = ref(false)
const dialogType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const originalOrders = ref<Record<number, number>>({})

const searchForm = ref({
  menuName: '',
  status: ''
})

const form = reactive<Api.SystemManage.MenuFormData>({
  parentId: 0,
  menuName: '',
  icon: '',
  menuType: 'M',
  orderNum: 0,
  isFrame: '1',
  isCache: '0',
  visible: '0',
  status: '0'
})

const rules = reactive<FormRules>({
  menuName: [{ required: true, message: '菜单名称不能为空', trigger: 'blur' }],
  orderNum: [{ required: true, message: '显示排序不能为空', trigger: 'blur' }],
  path: [{ required: true, message: '路由地址不能为空', trigger: 'blur' }]
})

const statusOptions = [
  { label: '正常', value: '0' },
  { label: '停用', value: '1' }
]

const formItems = computed(() => [
  { label: '菜单名称', key: 'menuName', type: 'input', props: { placeholder: '请输入菜单名称', clearable: true } },
  { label: '状态', key: 'status', type: 'select', props: { placeholder: '菜单状态', options: statusOptions, clearable: true } }
])

const columns = computed(() => [
  {
    prop: 'menuName',
    label: '菜单名称',
    minWidth: 180,
    showOverflowTooltip: true
  },
  {
    prop: 'menuType',
    label: '菜单类型',
    width: 100,
    formatter: (row: MenuItem) => {
      const map: Record<string, { type: string; text: string }> = {
        M: { type: 'primary', text: '目录' },
        C: { type: 'success', text: '菜单' },
        F: { type: 'warning', text: '按钮' }
      }
      const config = map[row.menuType] || { type: 'info', text: '未知' }
      return h(ElTag, { type: config.type as 'primary' | 'success' | 'warning' | 'info' | 'danger', size: 'small' }, () => config.text)
    }
  },
  {
    prop: 'orderNum',
    label: '排序',
    width: 150,
    formatter: (row: MenuItem) =>
      h(ElInputNumber, {
        modelValue: row.orderNum,
        'onUpdate:modelValue': (val: number | undefined) => { row.orderNum = (val ?? 0) },
        min: 0,
        size: 'small',
        controlsPosition: 'right',
        style: 'width: 88px'
      })
  },
  { prop: 'perms', label: '权限标识', minWidth: 150, showOverflowTooltip: true },
  { prop: 'component', label: '组件路径', minWidth: 150, showOverflowTooltip: true },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    formatter: (row: MenuItem) =>
      h(ElTag, { type: row.status === '0' ? 'success' : 'danger', size: 'small' }, () => row.status === '0' ? '正常' : '停用')
  },
  {
    prop: 'operation',
    label: '操作',
    width: 200,
    fixed: 'right' as const,
    formatter: (row: MenuItem) =>
      h('div', { class: 'flex items-center gap-1' }, [
        h(ArtButtonTable, { type: 'edit', onClick: () => showDialog('edit', row) }),
        h(ArtButtonTable, { type: 'add', title: '新增子菜单', onClick: () => showDialog('add', row) }),
        h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) })
      ])
  }
])

onMounted(() => getMenuList())

function buildTree(data: MenuItem[]): MenuItem[] {
  const map = new Map<number, MenuItem>()
  const result: MenuItem[] = []
  data.forEach(item => { map.set(item.menuId, { ...item, children: [] }) })
  data.forEach(item => {
    const node = map.get(item.menuId)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(node)
    } else {
      result.push(node)
    }
  })
  return result
}

function convertToTreeSelect(nodes: MenuItem[]): { id: number; label: string; children: any[] }[] {
  return nodes.map(n => ({
    id: n.menuId,
    label: n.menuName,
    children: n.children ? convertToTreeSelect(n.children) : []
  }))
}

function recordOrders(list: MenuItem[]) {
  list.forEach(item => {
    originalOrders.value[item.menuId] = item.orderNum
    if (item.children?.length) recordOrders(item.children)
  })
}

async function getMenuList() {
  loading.value = true
  try {
    const res: any = await fetchMenuList(searchForm.value)
    const data = res.data || res
    menuOptions.value = Array.isArray(data) ? data : []
    menuList.value = buildTree(Array.isArray(data) ? data : [])
    recordOrders(menuList.value)
  } catch { /* handled by interceptor */ } finally {
    loading.value = false
  }
}

function handleSearch() {
  getMenuList()
}

function handleReset() {
  searchForm.value = { menuName: '', status: '' }
  getMenuList()
}

function loadMenuTree() {
  menuTreeOptions.value = [{ id: 0, label: '主类目', children: convertToTreeSelect(menuOptions.value) }]
}

function resetForm() {
  Object.assign(form, {
    menuId: undefined,
    parentId: 0,
    menuName: '',
    icon: '',
    menuType: 'M',
    orderNum: 0,
    isFrame: '1',
    isCache: '0',
    visible: '0',
    status: '0',
    path: '',
    component: '',
    query: '',
    routeName: '',
    perms: '',
    remark: ''
  })
}

function showDialog(type: 'add' | 'edit', row?: MenuItem) {
  dialogType.value = type
  loadMenuTree()

  if (type === 'edit' && row) {
    fetchMenu(row.menuId).then((res: any) => {
      const d = res.data || res
      Object.assign(form, {
        menuId: d.menuId,
        parentId: d.parentId ?? 0,
        menuName: d.menuName || '',
        icon: d.icon || '',
        menuType: d.menuType || 'M',
        orderNum: d.orderNum || 0,
        isFrame: d.isFrame || '1',
        isCache: d.isCache || '0',
        visible: d.visible || '0',
        status: d.status || '0',
        path: d.path || '',
        component: d.component || '',
        query: d.query || '',
        routeName: d.routeName || '',
        perms: d.perms || '',
        remark: d.remark || ''
      })
    })
  } else if (type === 'add') {
    resetForm()
    if (row) form.parentId = row.menuId
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function handleDialogClose() {
  dialogVisible.value = false
  formRef.value?.resetFields()
}

function toggleExpandAll() {
  refreshTable.value = false
  isExpandAll.value = !isExpandAll.value
  nextTick(() => { refreshTable.value = true })
}

async function handleSaveSort() {
  const changedIds: number[] = []
  const changedOrders: number[] = []

  function collectChanged(list: MenuItem[]) {
    list.forEach(item => {
      if (String(originalOrders.value[item.menuId]) !== String(item.orderNum)) {
        changedIds.push(item.menuId)
        changedOrders.push(item.orderNum)
      }
      if (item.children?.length) collectChanged(item.children)
    })
  }
  collectChanged(menuList.value)

  if (changedIds.length === 0) {
    ElMessage.warning('未检测到排序修改')
    return
  }

  try {
    await fetchUpdateMenuSort({
      menuIds: changedIds.join(','),
      orderNums: changedOrders.join(',')
    })
    ElMessage.success('排序保存成功')
    recordOrders(menuList.value)
  } catch { /* handled by interceptor */ }
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch { return }

  submitting.value = true
  try {
    if (form.menuId != null) {
      await fetchUpdateMenu({ ...form })
    } else {
      await fetchAddMenu({ ...form })
    }
    ElMessage.success(dialogType.value === 'add' ? '新增成功' : '修改成功')
    dialogVisible.value = false
    getMenuList()
  } catch {
    // handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: MenuItem) {
  try {
    await ElMessageBox.confirm(`确定要删除菜单"${row.menuName}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fetchDeleteMenu(row.menuId)
    ElMessage.success('删除成功')
    getMenuList()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
  }
}
</script>
