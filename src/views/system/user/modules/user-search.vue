<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    :rules="rules"
    @reset="handleReset"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  import { fetchDeptTree } from '@/api/system/user'

  type UserSearchFormParams = Api.SystemManage.UserSearchParams & {
    daterange?: string[]
  }

  interface Props {
    modelValue: UserSearchFormParams
    hideDept?: boolean
  }

  interface Emits {
    (e: 'update:modelValue', value: UserSearchFormParams): void
    (e: 'search', params: UserSearchFormParams): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const searchBarRef = ref()

  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const rules = {}

  const statusOptions = [
    { label: '正常', value: '0' },
    { label: '停用', value: '1' }
  ]

  const deptTreeOptions = ref<{ label: string; value: number }[]>([])

  onMounted(async () => {
    try {
      const tree = await fetchDeptTree()
      deptTreeOptions.value = flattenTree(tree)
    } catch {
      // deptTree load failed, search without dept filter
    }
  })

  function flattenTree(tree: Api.SystemManage.DeptTreeNode[]): { label: string; value: number }[] {
    const result: { label: string; value: number }[] = []
    function walk(nodes: Api.SystemManage.DeptTreeNode[]) {
      for (const node of nodes) {
        result.push({ label: node.label, value: node.id })
        if (node.children) walk(node.children)
      }
    }
    walk(tree)
    return result
  }

  const formItems = computed(() => {
    const items = [
      {
        label: '用户名称',
        key: 'userName',
        type: 'input',
        placeholder: '请输入用户名称',
        clearable: true
      },
      {
        label: '手机号码',
        key: 'phonenumber',
        type: 'input',
        placeholder: '请输入手机号码',
        props: { maxlength: 11 },
        clearable: true
      },
      {
        label: '状态',
        key: 'status',
        type: 'select',
        props: {
          placeholder: '用户状态',
          options: statusOptions,
          clearable: true
        }
      },
      {
        label: '部门',
        key: 'deptId',
        type: 'select',
        hidden: props.hideDept,
        props: {
          placeholder: '请选择部门',
          options: deptTreeOptions.value,
          clearable: true,
          filterable: true
        }
      },
      {
        label: '创建时间',
        key: 'daterange',
        type: 'datetime',
        props: {
          style: { width: '100%' },
          placeholder: '请选择日期范围',
          type: 'daterange',
          rangeSeparator: '至',
          startPlaceholder: '开始日期',
          endPlaceholder: '结束日期',
          valueFormat: 'YYYY-MM-DD',
          shortcuts: [
            { text: '今日', value: [new Date(), new Date()] },
            { text: '最近一周', value: [new Date(Date.now() - 604800000), new Date()] },
            { text: '最近一个月', value: [new Date(Date.now() - 2592000000), new Date()] }
          ]
        }
      }
    ]
    return items
  })

  function handleReset() {
    emit('reset')
  }

  async function handleSearch(params: UserSearchFormParams) {
    await searchBarRef.value.validate()
    emit('search', params)
  }
</script>
