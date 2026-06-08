<template>
  <ElDialog
    v-model="visible"
    title="菜单权限"
    width="520px"
    align-center
    class="el-dialog-border"
    @close="handleClose"
  >
    <ElScrollbar height="70vh">
      <ElTree
        ref="treeRef"
        :data="menuOptions"
        show-checkbox
        node-key="id"
        :default-expand-all="isExpandAll"
        :default-checked-keys="checkedKeys"
        :props="defaultProps"
        :check-strictly="false"
      >
        <template #default="{ data }">
          <span>{{ data.label }}</span>
        </template>
      </ElTree>
    </ElScrollbar>
    <template #footer>
      <ElButton @click="toggleExpandAll">{{ isExpandAll ? '全部收起' : '全部展开' }}</ElButton>
      <ElButton @click="toggleSelectAll">{{ isSelectAll ? '取消全选' : '全部选择' }}</ElButton>
      <ElButton type="primary" :loading="saving" @click="savePermission">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import type { ElTree } from 'element-plus'
import { fetchMenuTreeselect, fetchRoleMenuTreeselect } from '@/api/system/menu'
import { fetchUpdateRole } from '@/api/system/role'

type RoleListItem = Api.SystemManage.RoleListItem

interface Props {
  modelValue: boolean
  roleData?: RoleListItem
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  roleData: undefined
})

const emit = defineEmits<Emits>()

const treeRef = ref<InstanceType<typeof ElTree>>()
const isExpandAll = ref(true)
const isSelectAll = ref(false)
const saving = ref(false)
const menuOptions = ref<any[]>([])
const checkedKeys = ref<number[]>([])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const defaultProps = {
  children: 'children',
  label: 'label'
}

const getAllNodeKeys = (nodes: any[]): number[] => {
  const keys: number[] = []
  const traverse = (nodeList: any[]): void => {
    nodeList.forEach((node) => {
      if (node.id) keys.push(node.id)
      if (node.children?.length) traverse(node.children)
    })
  }
  traverse(nodes)
  return keys
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && props.roleData) {
      loadMenuTree(props.roleData.roleId)
    }
  }
)

async function loadMenuTree(roleId: number) {
  try {
    const res: any = await fetchRoleMenuTreeselect(roleId)
    // 后端返回的 menus 已经是 TreeSelect 树结构 [{id, label, children}]
    menuOptions.value = res.menus || []
    checkedKeys.value = res.checkedKeys || []
    nextTick(() => {
      if (treeRef.value && checkedKeys.value.length > 0) {
        treeRef.value.setCheckedKeys(checkedKeys.value, false)
      }
    })
  } catch {
    // fallback: load all menus
    const res: any = await fetchMenuTreeselect()
    // HTTP 拦截器已提取 data，res 就是 TreeSelect[] 树数组
    menuOptions.value = Array.isArray(res) ? res : (res.data || [])
  }
}

const handleClose = () => {
  visible.value = false
  checkedKeys.value = []
  menuOptions.value = []
}

const toggleExpandAll = () => {
  const tree = treeRef.value
  if (!tree) return
  const nodes = (tree as any).store?.nodesMap
  if (nodes) {
    Object.values(nodes).forEach((node: any) => {
      node.expanded = !isExpandAll.value
    })
  }
  isExpandAll.value = !isExpandAll.value
}

const toggleSelectAll = () => {
  const tree = treeRef.value
  if (!tree) return
  if (!isSelectAll.value) {
    const allKeys = getAllNodeKeys(menuOptions.value)
    tree.setCheckedKeys(allKeys)
  } else {
    tree.setCheckedKeys([])
  }
  isSelectAll.value = !isSelectAll.value
}

const savePermission = async () => {
  if (!props.roleData) return

  const tree = treeRef.value
  if (!tree) return

  saving.value = true
  try {
    const checkedNodes = tree.getCheckedNodes(false, false)
    // 不收集半选中父节点，否则回显时会因 check-strictly=false 级联选中未勾选的子节点
    const menuIds = checkedNodes.map((n: any) => n.id)

    await fetchUpdateRole({
      roleId: props.roleData.roleId,
      roleName: props.roleData.roleName,
      roleKey: props.roleData.roleKey,
      roleSort: (props.roleData as any).roleSort ?? 0,
      status: (props.roleData as any).status ?? '0',
      menuIds
    })
    ElMessage.success('权限保存成功')
    emit('success')
    handleClose()
  } catch {
    // handled by HTTP interceptor
  } finally {
    saving.value = false
  }
}
</script>
