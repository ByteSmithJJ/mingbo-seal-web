<!-- 定时任务页面 -->
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
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="handleAdd" v-ripple>新增</ElButton>
            <ElButton :disabled="selectedRows.length === 0" @click="handleBatchDelete" v-ripple>
              批量删除
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <!-- 新增/编辑弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="750px"
      align-center
      @close="handleDialogClose"
    >
      <ElForm ref="formRef" :model="form" :rules="formRules" label-width="110px">
        <ElRow :gutter="20">
          <ElCol :span="12">
            <ElFormItem label="任务名称" prop="jobName">
              <ElInput v-model="form.jobName" placeholder="请输入任务名称" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="任务分组" prop="jobGroup">
              <ElSelect v-model="form.jobGroup" placeholder="请选择任务分组">
                <ElOption
                  v-for="item in jobGroupOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="调用方法" prop="invokeTarget">
              <ElInput
                v-model="form.invokeTarget"
                type="textarea"
                :rows="3"
                placeholder="请输入调用目标字符串"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="cron 表达式" prop="cronExpression">
              <ElInput v-model="form.cronExpression" placeholder="请输入 cron 执行表达式">
                <template #append>
                  <ElButton type="primary" @click="handleShowCron">生成表达式</ElButton>
                </template>
              </ElInput>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="执行策略" prop="misfirePolicy">
              <ElRadioGroup v-model="form.misfirePolicy">
                <ElRadio value="1">立即执行</ElRadio>
                <ElRadio value="2">执行一次</ElRadio>
                <ElRadio value="3">放弃执行</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="是否并发" prop="concurrent">
              <ElRadioGroup v-model="form.concurrent">
                <ElRadio value="0">允许</ElRadio>
                <ElRadio value="1">禁止</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </ElCol>
          <ElCol v-if="isEdit" :span="12">
            <ElFormItem label="状态" prop="status">
              <ElRadioGroup v-model="form.status">
                <ElRadio value="0">正常</ElRadio>
                <ElRadio value="1">暂停</ElRadio>
              </ElRadioGroup>
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- Cron 表达式生成器弹窗 -->
    <ElDialog
      v-model="openCron"
      title="Cron 表达式生成器"
      width="850px"
      append-to-body
      destroy-on-close
      align-center
    >
      <Crontab
        v-if="openCron"
        :expression="expression"
        @hide="openCron = false"
        @fill="crontabFill"
      />
    </ElDialog>

    <!-- 详情弹窗 -->
    <JobDetail v-model:visible="detailVisible" :row="detailRow" type="job" />
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/core/useTable'
  import {
    fetchJobList,
    fetchJob,
    addJob,
    updateJob,
    changeJobStatus,
    runJob,
    deleteJob
  } from '@/api/monitor'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import {
    ElTag,
    ElSwitch,
    ElMessageBox,
    ElMessage,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import JobDetail from './detail.vue'
  // @ts-expect-error Vue 2 Options API component without TS declarations
  import Crontab from './crontab/index.vue'

  defineOptions({ name: 'Job' })

  const router = useRouter()

  type JobItem = Api.Monitor.JobItem

  const openCron = ref(false)
  const expression = ref('')

  const selectedRows = ref<JobItem[]>([])
  const dialogVisible = ref(false)
  const dialogTitle = ref('新增任务')
  const isEdit = ref(false)
  const submitLoading = ref(false)
  const detailVisible = ref(false)
  const detailRow = ref<JobItem | null>(null)
  const formRef = ref<FormInstance>()

  const searchForm = ref<Api.Monitor.JobSearchParams>({
    jobName: undefined,
    jobGroup: undefined,
    status: undefined
  })

  const initForm: Api.Monitor.JobFormData = {
    jobName: '',
    jobGroup: 'DEFAULT',
    invokeTarget: '',
    cronExpression: '',
    misfirePolicy: '1',
    concurrent: '0',
    status: '0'
  }

  const form = reactive<Api.Monitor.JobFormData>({ ...initForm })

  const formRules: FormRules = {
    jobName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
    jobGroup: [{ required: true, message: '请选择任务分组', trigger: 'change' }],
    invokeTarget: [{ required: true, message: '请输入调用目标字符串', trigger: 'blur' }],
    cronExpression: [{ required: true, message: '请输入 cron 表达式', trigger: 'blur' }]
  }

  const jobGroupMap: Record<string, string> = {
    DEFAULT: '默认',
    SYSTEM: '系统'
  }

  const jobGroupOptions = Object.entries(jobGroupMap).map(([value, label]) => ({ label, value }))

  const formItems = computed(() => [
    {
      label: '任务名称',
      key: 'jobName',
      type: 'input',
      props: { placeholder: '请输入任务名称', clearable: true }
    },
    {
      label: '任务分组',
      key: 'jobGroup',
      type: 'select',
      props: { placeholder: '请选择任务分组', options: jobGroupOptions, clearable: true }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择任务状态',
        options: [
          { label: '正常', value: '0' },
          { label: '暂停', value: '1' }
        ],
        clearable: true
      }
    }
  ])

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchJobList,
      apiParams: { pageNum: 1, pageSize: 10 },
      paginationKey: { current: 'pageNum', size: 'pageSize' },
      columnsFactory: () => [
        { type: 'selection', width: 50 },
        { prop: 'jobId', label: '任务编号', width: 90 },
        {
          prop: 'jobName',
          label: '任务名称',
          minWidth: 140,
          showOverflowTooltip: true,
          formatter: (row: JobItem) =>
            h(
              'span',
              { class: 'link-type cursor-pointer', onClick: () => handleView(row) },
              row.jobName
            )
        },
        {
          prop: 'jobGroup',
          label: '任务分组',
          width: 100,
          formatter: (row: JobItem) =>
            h(ElTag, { size: 'small' }, () => jobGroupMap[row.jobGroup] || row.jobGroup)
        },
        { prop: 'invokeTarget', label: '调用目标', minWidth: 200, showOverflowTooltip: true },
        { prop: 'cronExpression', label: 'cron 表达式', width: 150, showOverflowTooltip: true },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: JobItem) =>
            h(ElSwitch, {
              modelValue: row.status === '0',
              'onUpdate:modelValue': () => handleStatusChange(row)
            })
        },
        {
          prop: 'operation',
          label: '操作',
          width: 230,
          fixed: 'right' as const,
          formatter: (row: JobItem) => {
            return h('div', { class: 'flex items-center gap-1' }, [
              h(ArtButtonTable, { type: 'edit', onClick: () => handleUpdate(row) }),
              h(ArtButtonTable, { type: 'delete', onClick: () => handleDelete(row) }),
              h(
                ElTag,
                {
                  size: 'small',
                  class: 'cursor-pointer',
                  onClick: () => handleRun(row)
                },
                () => '执行一次'
              ),
              h(
                ElTag,
                {
                  size: 'small',
                  class: 'cursor-pointer',
                  type: 'info',
                  onClick: () => handleJobLog(row)
                },
                () => '调度日志'
              )
            ])
          }
        }
      ]
    },
    transform: {
      responseAdapter: (response: any) => ({
        records: response.rows || [],
        total: response.total || 0,
        current: undefined as any,
        size: undefined as any
      })
    }
  })

  function handleSearch(params: Record<string, any>) {
    replaceSearchParams(params)
    getData()
  }

  function handleReset() {
    resetSearchParams()
  }

  async function handleStatusChange(row: JobItem) {
    const newStatus = row.status === '0' ? '1' : '0'
    const text = newStatus === '0' ? '启用' : '停用'
    try {
      await ElMessageBox.confirm(`确定要${text}任务"${row.jobName}"吗？`, '状态修改', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await changeJobStatus(row.jobId, newStatus)
      ElMessage.success(`${text}成功`)
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  async function handleRun(row: JobItem) {
    try {
      await ElMessageBox.confirm(`确定要立即执行一次任务"${row.jobName}"吗？`, '执行确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await runJob({ jobId: row.jobId, jobGroup: row.jobGroup })
      ElMessage.success('执行成功')
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  async function handleView(row: JobItem) {
    try {
      const res: any = await fetchJob(row.jobId)
      detailRow.value = res.data || res
      detailVisible.value = true
    } catch {
      // error handled by interceptor
    }
  }

  function handleJobLog(row: JobItem) {
    // 跳转到调度日志页面
    router.push({ name: 'SystemJobLog', query: { jobId: row.jobId } })
  }

  function handleShowCron() {
    expression.value = form.cronExpression
    openCron.value = true
  }

  function crontabFill(value: string) {
    form.cronExpression = value
  }

  function handleAdd() {
    dialogTitle.value = '新增任务'
    isEdit.value = false
    Object.assign(form, initForm)
    dialogVisible.value = true
  }

  async function handleUpdate(row: JobItem) {
    try {
      const res: any = await fetchJob(row.jobId)
      const job = res.data || res
      dialogTitle.value = '修改任务'
      isEdit.value = true
      Object.assign(form, {
        jobId: job.jobId,
        jobName: job.jobName,
        jobGroup: job.jobGroup,
        invokeTarget: job.invokeTarget,
        cronExpression: job.cronExpression,
        misfirePolicy: job.misfirePolicy,
        concurrent: job.concurrent,
        status: job.status
      })
      dialogVisible.value = true
    } catch {
      // error handled by interceptor
    }
  }

  function handleDialogClose() {
    formRef.value?.resetFields()
    Object.assign(form, initForm)
  }

  async function handleSubmit() {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return

    submitLoading.value = true
    try {
      if (isEdit.value) {
        await updateJob({ ...form })
        ElMessage.success('修改成功')
      } else {
        await addJob({ ...form })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
      refreshData()
    } catch {
      // error handled by interceptor
    } finally {
      submitLoading.value = false
    }
  }

  async function handleDelete(row: JobItem) {
    try {
      await ElMessageBox.confirm(`确定要删除任务"${row.jobName}"吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deleteJob(String(row.jobId))
      ElMessage.success('删除成功')
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  async function handleBatchDelete() {
    if (selectedRows.value.length === 0) return
    const ids = selectedRows.value.map((r) => r.jobId).join(',')
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的${selectedRows.value.length}条任务吗？`,
        '批量删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      await deleteJob(ids)
      ElMessage.success('删除成功')
      refreshData()
    } catch (err: any) {
      if (err === 'cancel' || err === 'close') return
    }
  }

  function handleSelectionChange(selection: JobItem[]) {
    selectedRows.value = selection
  }
</script>
