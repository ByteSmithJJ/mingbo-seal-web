<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    :rules="rules"
    @reset="handleReset"
    @search="handleSearch"
  >
  </ArtSearchBar>
</template>

<script setup lang="ts">
type RoleSearchFormParams = Api.SystemManage.RoleSearchParams & {
  daterange?: string[]
}

interface Props {
  modelValue: RoleSearchFormParams
}

interface Emits {
  (e: 'update:modelValue', value: RoleSearchFormParams): void
  (e: 'search', params: RoleSearchFormParams): void
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

const formItems = computed(() => [
  {
    label: '角色名称',
    key: 'roleName',
    type: 'input',
    placeholder: '请输入角色名称',
    clearable: true
  },
  {
    label: '权限字符',
    key: 'roleKey',
    type: 'input',
    placeholder: '请输入权限字符',
    clearable: true
  },
  {
    label: '状态',
    key: 'status',
    type: 'select',
    props: {
      placeholder: '角色状态',
      options: statusOptions,
      clearable: true
    }
  },
  {
    label: '创建日期',
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
])

const handleReset = () => {
  emit('reset')
}

const handleSearch = async (params: RoleSearchFormParams) => {
  await searchBarRef.value.validate()
  emit('search', params)
}
</script>
