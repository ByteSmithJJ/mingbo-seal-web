<template>
  <ElDialog
    v-model="visible"
    title="分配数据权限"
    width="500px"
    align-center
    @close="handleClose"
  >
    <ElScrollbar max-height="60vh">
      <ElForm ref="formRef" :model="form" label-width="80px">
        <ElFormItem label="角色名称">
          <ElInput v-model="form.roleName" disabled />
        </ElFormItem>
        <ElFormItem label="权限字符">
          <ElInput v-model="form.roleKey" disabled />
        </ElFormItem>
        <ElFormItem label="权限范围">
          <ElSelect v-model="form.dataScope" @change="handleScopeChange">
            <ElOption
              v-for="item in dataScopeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="数据权限" v-show="form.dataScope === '2'">
          <div v-loading="treeLoading" class="art-tree-box">
            <div class="art-tree-toolbar">
              <ElCheckbox v-model="deptExpand" @change="handleExpandChange">展开/折叠</ElCheckbox>
              <ElCheckbox v-model="deptNodeAll" @change="handleSelectAllChange">全选/全不选</ElCheckbox>
              <ElCheckbox v-model="deptCheckStrictly">父子联动</ElCheckbox>
            </div>
            <ElTree
              ref="treeRef"
              :data="deptOptions"
              show-checkbox
              node-key="id"
              default-expand-all
              :check-strictly="deptCheckStrictly"
              :props="{ children: 'children', label: 'label' }"
            >
              <template #empty>
                <span style="color: var(--el-text-color-secondary)">暂无部门数据</span>
              </template>
            </ElTree>
          </div>
        </ElFormItem>
      </ElForm>
    </ElScrollbar>
    <template #footer>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
      <ElButton @click="handleClose">取消</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import type { FormInstance, ElTree } from 'element-plus'
import { fetchRole, fetchRoleDataScope, fetchRoleDeptTree } from '@/api/system/role'

interface Props {
  modelValue: boolean
  roleData?: Api.SystemManage.RoleListItem
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

const formRef = ref<FormInstance>()
const treeRef = ref<InstanceType<typeof ElTree>>()
const submitting = ref(false)
const treeLoading = ref(false)
const deptExpand = ref(true)
const deptNodeAll = ref(false)
const deptCheckStrictly = ref(false)
const deptOptions = ref<any[]>([])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const dataScopeOptions = [
  { value: '1', label: '全部数据权限' },
  { value: '2', label: '自定数据权限' },
  { value: '3', label: '本部门数据权限' },
  { value: '4', label: '本部门及以下数据权限' },
  { value: '5', label: '仅本人数据权限' }
]

const form = reactive({
  roleId: undefined as number | undefined,
  roleName: '',
  roleKey: '',
  dataScope: '1',
  deptIds: [] as number[]
})

onMounted(() => {
  if (props.roleData) {
    initForm()
  }
})

function getDeptAllCheckedKeys(): number[] {
  const tree = treeRef.value
  if (!tree) return []
  // 不收集半选中父节点，否则回显时父节点 ID 会级联选中未勾选的子节点
  return tree.getCheckedNodes(false, false).map((n: any) => n.id)
}

async function initForm() {
  debugger
  const role = props.roleData!
  deptExpand.value = true
  deptNodeAll.value = false
  deptCheckStrictly.value = false
  deptOptions.value = []
  treeLoading.value = true

  try {
    const detail: any = await fetchRole(role.roleId)
    const scope = (detail.data || detail).dataScope
    Object.assign(form, {
      roleId: role.roleId,
      roleName: role.roleName,
      roleKey: role.roleKey,
      dataScope: scope != null ? String(scope) : '1',
      deptIds: []
    })

    const deptRes: any = await fetchRoleDeptTree(role.roleId)
    deptOptions.value = deptRes.depts || []

    const checkedKeys = deptRes.checkedKeys || []
    await nextTick()
    await nextTick()
    if (treeRef.value && checkedKeys.length > 0) {
      treeRef.value.setCheckedKeys(checkedKeys, false)
    }
  } catch {
    ElMessage.error('加载数据权限失败，请稍后重试')
  } finally {
    treeLoading.value = false
  }
}

function handleScopeChange(value: string) {
  if (value !== '2' && treeRef.value) {
    treeRef.value.setCheckedKeys([])
  }
}

function handleExpandChange(val: any) {
  const tree = treeRef.value
  if (!tree) return
  const nodes = (tree as any).store?.nodesMap
  if (nodes) {
    Object.values(nodes).forEach((node: any) => {
      node.expanded = Boolean(val)
    })
  }
}

function handleSelectAllChange(val: any) {
  const tree = treeRef.value
  if (!tree) return
  if (val) {
    const allKeys: number[] = []
    const traverse = (nodes: any[]) => {
      nodes.forEach((node) => {
        allKeys.push(node.id)
        if (node.children?.length) traverse(node.children)
      })
    }
    traverse(deptOptions.value)
    tree.setCheckedKeys(allKeys)
  } else {
    tree.setCheckedKeys([])
  }
}

const handleClose = () => {
  visible.value = false
  deptOptions.value = []
  treeLoading.value = false
  deptExpand.value = true
  deptNodeAll.value = false
  deptCheckStrictly.value = false
}

const handleSubmit = async () => {
  if (!form.roleId) return

  submitting.value = true
  try {
    const deptIds = form.dataScope === '2' ? getDeptAllCheckedKeys() : []
    await fetchRoleDataScope({
      roleId: form.roleId,
      dataScope: form.dataScope,
      deptIds
    })
    ElMessage.success('数据权限修改成功')
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
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.art-tree-box :deep(.el-tree) {
  padding: 8px;
  max-height: 300px;
  overflow-y: auto;
}
</style>
