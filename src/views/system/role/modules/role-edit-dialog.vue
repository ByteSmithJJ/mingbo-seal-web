<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增角色' : '编辑角色'"
    width="600px"
    align-center
    @close="handleClose"
  >
    <ElScrollbar max-height="65vh">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
        <ElFormItem label="角色名称" prop="roleName">
          <ElInput v-model="form.roleName" placeholder="请输入角色名称" />
        </ElFormItem>
        <ElFormItem label="权限字符" prop="roleKey">
          <ElInput v-model="form.roleKey" placeholder="请输入权限字符" />
        </ElFormItem>
        <ElFormItem label="角色顺序" prop="roleSort">
          <ElInputNumber v-model="form.roleSort" :min="0" controls-position="right" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="form.status">
            <ElRadio value="0">正常</ElRadio>
            <ElRadio value="1">停用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="菜单权限">
          <div class="art-tree-box">
            <div class="art-tree-toolbar">
              <ElButton size="small" text @click="toggleExpandAll">{{ isExpandAll ? '全部收起' : '全部展开' }}</ElButton>
              <ElButton size="small" text @click="toggleSelectAll">{{ isSelectAll ? '取消全选' : '全部选择' }}</ElButton>
            </div>
            <ElTree
              ref="treeRef"
              :key="treeKey"
              :data="menuOptions"
              show-checkbox
              node-key="id"
              :default-expand-all="isExpandAll"
              :props="{ children: 'children', label: 'label' }"
              :check-strictly="false"
            >
              <template #default="{ data }">
                <span>{{ data.label }}</span>
              </template>
            </ElTree>
          </div>
        </ElFormItem>
        <ElFormItem label="备注" prop="remark">
          <ElInput
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </ElFormItem>
      </ElForm>
    </ElScrollbar>
    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules, ElTree } from 'element-plus'
import { fetchAddRole, fetchUpdateRole } from '@/api/system/role'
import { fetchMenuTreeselect, fetchRoleMenuTreeselect } from '@/api/system/menu'

type RoleListItem = Api.SystemManage.RoleListItem

interface Props {
  modelValue: boolean
  dialogType: 'add' | 'edit'
  roleData?: RoleListItem
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  dialogType: 'add',
  roleData: undefined
})

const emit = defineEmits<Emits>()

const formRef = ref<FormInstance>()
const treeRef = ref<InstanceType<typeof ElTree>>()
const submitting = ref(false)
const isExpandAll = ref(true)
const isSelectAll = ref(false)
const menuOptions = ref<any[]>([])
const treeKey = ref(0)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const rules = reactive<FormRules>({
  roleName: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  roleKey: [
    { required: true, message: '请输入权限字符', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
})

const form = reactive<Api.SystemManage.RoleFormData>({
  roleName: '',
  roleKey: '',
  roleSort: 0,
  status: '0',
  menuIds: [],
  deptIds: [],
  remark: ''
})

watch(
  () => [props.modelValue, props.roleData] as const,
  ([visible, data]) => {
    if (visible) initForm()
  }
)

function getAllNodeKeys(nodes: any[]): number[] {
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

async function loadMenuTree(roleId?: number) {
  try {
    if (roleId != null) {
      const res: any = await fetchRoleMenuTreeselect(roleId)
      // 后端返回的 menus 已经是 TreeSelect 树结构 [{id, label, children}]
      menuOptions.value = res.menus || []
      // 通过 key 强制重建 ElTree，再用 setCheckedKeys 精确回显（避免 default-checked-keys 的级联问题）
      treeKey.value++
      await nextTick()
      await nextTick()
      treeRef.value?.setCheckedKeys(res.checkedKeys || [])
    } else {
      const res: any = await fetchMenuTreeselect()
      const data = Array.isArray(res) ? res : (res.data || [])
      menuOptions.value = data
    }
  } catch {
    menuOptions.value = []
  }
}

const initForm = () => {
  if (props.dialogType === 'edit' && props.roleData) {
    const d = props.roleData as any
    Object.assign(form, {
      roleId: d.roleId,
      roleName: d.roleName || '',
      roleKey: d.roleKey || '',
      roleSort: d.roleSort ?? 0,
      status: d.status ?? '0',
      menuIds: d.menuIds || [],
      deptIds: d.deptIds || [],
      remark: d.remark || ''
    })
    loadMenuTree(d.roleId)
  } else {
    Object.assign(form, {
      roleId: undefined,
      roleName: '',
      roleKey: '',
      roleSort: 0,
      status: '0',
      menuIds: [],
      deptIds: [],
      remark: ''
    })
    loadMenuTree()
  }
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

const handleClose = () => {
  visible.value = false
  formRef.value?.resetFields()
  menuOptions.value = []
  treeKey.value++
  isExpandAll.value = true
  isSelectAll.value = false
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch { return }

  submitting.value = true
  try {
    // 从树中获取选中的菜单ID（不收集半选中父节点，否则回显时会因 check-strictly=false 级联到未选中的子节点）
    const tree = treeRef.value
    let menuIds: number[] = []
    if (tree) {
      const checkedNodes = tree.getCheckedNodes(false, false)
      menuIds = checkedNodes.map((n: any) => n.id)
    }

    const submitData = { ...form, menuIds }
    if (form.roleId != null) {
      await fetchUpdateRole(submitData)
    } else {
      await fetchAddRole(submitData)
    }
    ElMessage.success(props.dialogType === 'add' ? '新增成功' : '修改成功')
    emit('success')
    handleClose()
  } catch {
    // handled by HTTP interceptor
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.art-tree-box {
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
}

.art-tree-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.art-tree-box :deep(.el-tree) {
  padding: 8px;
  max-height: 280px;
  overflow-y: auto;
}
</style>
