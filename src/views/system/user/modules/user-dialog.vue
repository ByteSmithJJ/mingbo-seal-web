<template>
  <ElDialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增用户' : '编辑用户'"
    width="580px"
    align-center
    @close="handleClose"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="用户名称" prop="userName">
            <ElInput v-model="form.userName" placeholder="请输入登录名称" maxlength="30" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="用户昵称" prop="nickName">
            <ElInput v-model="form.nickName" placeholder="请输入用户昵称" maxlength="30" />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol v-if="dialogType === 'add'" :span="12">
          <ElFormItem label="密码" prop="password">
            <ElInput
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              maxlength="20"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="手机号码" prop="phonenumber">
            <ElInput v-model="form.phonenumber" placeholder="请输入手机号码" maxlength="11" />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="邮箱" prop="email">
            <ElInput v-model="form.email" placeholder="请输入邮箱" maxlength="50" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="性别" prop="sex">
            <ElSelect v-model="form.sex" placeholder="请选择性别">
              <ElOption label="男" value="0" />
              <ElOption label="女" value="1" />
              <ElOption label="未知" value="2" />
            </ElSelect>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="归属部门" prop="deptId">
            <ElTreeSelect
              v-model="form.deptId"
              :data="deptTree"
              :props="{ label: 'label', value: 'id', children: 'children' }"
              placeholder="请选择归属部门"
              check-strictly
              clearable
              filterable
              style="width: 100%"
            />
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="岗位">
            <ElSelect v-model="form.postIds" placeholder="请选择岗位" multiple clearable>
              <ElOption
                v-for="post in postList"
                :key="post.value"
                :label="post.label"
                :value="post.value"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="20">
        <ElCol :span="12">
          <ElFormItem label="角色" prop="roleIds">
            <ElSelect v-model="form.roleIds" placeholder="请选择角色" multiple clearable>
              <ElOption
                v-for="role in roleList"
                :key="role.roleId"
                :label="role.roleName"
                :value="role.roleId"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="12">
          <ElFormItem label="状态">
            <ElRadioGroup v-model="form.status">
              <ElRadio value="0">正常</ElRadio>
              <ElRadio value="1">停用</ElRadio>
            </ElRadioGroup>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <!-- 头像 -->
      <ElFormItem label="头像">
        <div class="flex items-center gap-3">
          <ElUpload
            class="avatar-uploader"
            :show-file-list="false"
            :before-upload="handleBeforeUpload"
            :http-request="handleAvatarUpload"
            accept="image/*"
          >
            <div
              class="avatar-trigger w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[var(--main-color)] transition-colors"
            >
              <img v-if="form.avatar" :src="form.avatar" class="w-full h-full object-cover" />
              <div v-else class="flex flex-col items-center text-gray-400">
                <span class="text-2xl leading-none">+</span>
                <span class="text-xs mt-1">上传</span>
              </div>
            </div>
          </ElUpload>
          <div class="text-xs text-gray-400">
            <p>支持 jpg、png 格式</p>
            <p>大小不超过 2MB</p>
            <p v-if="form.avatar">
              <ElButton link size="small" type="danger" @click="form.avatar = ''">移除头像</ElButton>
            </p>
          </div>
        </div>
      </ElFormItem>

      <ElFormItem label="备注">
        <ElInput
          v-model="form.remark"
          type="textarea"
          :rows="2"
          placeholder="请输入备注信息"
          maxlength="500"
          show-word-limit
        />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">确定</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { fetchDeptTree, fetchAddUser, fetchUpdateUser, fetchUploadFile } from '@/api/system/user'
  import { fetchGetRoleList } from '@/api/system-manage'

  interface Props {
    modelValue: boolean
    dialogType: 'add' | 'edit'
    userData?: Api.SystemManage.UserListItem
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    dialogType: 'add',
    userData: undefined
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const deptTree = ref<Api.SystemManage.DeptTreeNode[]>([])
  const roleList = ref<Api.SystemManage.RoleSimple[]>([])
  const postList = ref<{ label: string; value: number }[]>([])

  const defaultForm = (): Api.SystemManage.UserFormData => ({
    userId: undefined,
    userName: '',
    nickName: '',
    password: '',
    sex: '0',
    email: '',
    phonenumber: '',
    avatar: '',
    status: '0',
    deptId: undefined,
    roleIds: [],
    postIds: [],
    remark: ''
  })

  const form = reactive<Api.SystemManage.UserFormData>(defaultForm())

  const rules = reactive<FormRules>({
    userName: [
      { required: true, message: '请输入用户名称', trigger: 'blur' },
      { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
    ],
    nickName: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }],
    password: [
      {
        required: true,
        message: '请输入密码',
        trigger: 'blur',
        validator: (_rule, value, callback) => {
          if (props.dialogType === 'add' && !value) {
            callback(new Error('请输入密码'))
          } else {
            callback()
          }
        }
      },
      { min: 5, max: 20, message: '长度在 5 到 20 个字符', trigger: 'blur' }
    ],
    email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
    phonenumber: [
      {
        pattern: /^1[3-9]\d{9}$/,
        message: '请输入正确的手机号码',
        trigger: 'blur'
      }
    ],
    deptId: [{ required: true, message: '请选择归属部门', trigger: 'change' }],
    roleIds: [{ required: true, message: '请选择角色', trigger: 'change' }]
  })

  // 加载部门树和角色列表
  async function loadOptions() {
    try {
      const [tree, roles] = await Promise.all([fetchDeptTree(), fetchGetRoleList({ current: 1, size: 1000 })])
      deptTree.value = tree || []
      roleList.value = (roles as any)?.rows || (roles as any)?.records || []
    } catch {
      // options loading failed
    }
  }

  loadOptions()

  watch(
    () => props.modelValue,
    (newVal) => {
      if (newVal) initForm()
    }
  )

  function initForm() {
    const isEdit = props.dialogType === 'edit' && props.userData
    if (isEdit && props.userData) {
      const u = props.userData as any
      Object.assign(form, {
        userId: u.userId,
        userName: u.userName || '',
        nickName: u.nickName || '',
        password: '',
        sex: u.sex || '0',
        email: u.email || '',
        phonenumber: u.phonenumber || '',
        avatar: u.avatar || '',
        status: u.status || '0',
        deptId: u.dept?.deptId,
        roleIds: u.roles ? u.roles.map((r: any) => r.roleId) : [],
        postIds: u.postIds || [],
        remark: u.remark || ''
      })
    } else {
      Object.assign(form, defaultForm())
    }
    nextTick(() => {
      formRef.value?.clearValidate()
    })
  }

  // 上传前校验
  function handleBeforeUpload(file: File) {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      ElMessage.error('只能上传图片文件')
      return false
    }
    const isLt2M = file.size / 1024 / 1024 < 2
    if (!isLt2M) {
      ElMessage.error('头像大小不能超过2MB')
      return false
    }
    return true
  }

  // 自定义上传（使用 axios 实例自动携带 token）
  async function handleAvatarUpload(options: { file: File }) {
    const formData = new FormData()
    formData.append('file', options.file)
    try {
      const data = await fetchUploadFile(formData)
      if (data?.url) {
        // 后端返回完整URL，取相对路径，让图片走 Vite 代理到达后端
        form.avatar = data.url.replace(/^https?:\/\/[^/]+/, '')
        ElMessage.success('头像上传成功')
      }
    } catch {
      // 错误由 HTTP 拦截器统一处理
    }
  }

  function handleClose() {
    visible.value = false
    formRef.value?.resetFields()
  }

  async function handleSubmit() {
    if (!formRef.value) return
    try {
      await formRef.value.validate()
    } catch {
      return
    }

    submitting.value = true
    try {
      if (props.dialogType === 'add') {
        await fetchAddUser({ ...form })
      } else {
        await fetchUpdateUser({ ...form })
      }
      ElMessage.success(props.dialogType === 'add' ? '新增成功' : '修改成功')
      emit('success')
      handleClose()
    } catch {
      // error handled by HTTP interceptor
    } finally {
      submitting.value = false
    }
  }
</script>
