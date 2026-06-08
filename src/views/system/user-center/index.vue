<!-- 个人中心页面 -->
<template>
  <div class="w-full h-full p-0 bg-transparent border-none shadow-none">
    <div class="relative flex-b mt-2.5 max-md:block max-md:mt-1">
      <!-- 左侧：用户信息卡片 -->
      <div class="w-112 mr-5 max-md:w-full max-md:mr-0">
        <div class="art-card-sm relative p-9 pb-6 overflow-hidden text-center">
          <img class="absolute top-0 left-0 w-full h-50 object-cover" src="@imgs/user/bg.webp" />
          <img
            class="relative z-10 w-20 h-20 mt-30 mx-auto object-cover border-2 border-white rounded-full"
            :src="profile.avatar || defaultAvatar"
          />
          <h2 class="mt-5 text-xl font-normal">{{ profile.nickName || profile.userName }}</h2>
          <p class="mt-1 text-sm text-g-500">@{{ profile.userName }}</p>

          <div class="w-75 mx-auto mt-7.5 text-left">
            <div v-if="profile.dept?.deptName" class="mt-2.5">
              <ArtSvgIcon icon="ri:building-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ profile.dept.deptName }}</span>
            </div>
            <div v-if="profile.roleGroup" class="mt-2.5">
              <ArtSvgIcon icon="ri:shield-user-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ profile.roleGroup }}</span>
            </div>
            <div class="mt-2.5">
              <ArtSvgIcon icon="ri:mail-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ profile.email || '-' }}</span>
            </div>
            <div class="mt-2.5">
              <ArtSvgIcon icon="ri:phone-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ profile.phonenumber || '-' }}</span>
            </div>
            <div v-if="profile.loginDate" class="mt-2.5">
              <ArtSvgIcon icon="ri:login-circle-line" class="text-g-700" />
              <span class="ml-2 text-sm">最后登录：{{ profile.loginDate }}</span>
            </div>
            <div v-if="profile.createTime" class="mt-2.5">
              <ArtSvgIcon icon="ri:calendar-line" class="text-g-700" />
              <span class="ml-2 text-sm">注册时间：{{ profile.createTime }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：设置表单 -->
      <div class="flex-1 overflow-hidden max-md:w-full max-md:mt-3.5">
        <!-- 基本设置 -->
        <div class="art-card-sm">
          <h1 class="p-4 text-xl font-normal border-b border-g-300">基本设置</h1>
          <ElForm
            ref="profileFormRef"
            :model="form"
            :rules="profileRules"
            class="box-border p-5 [&>.el-row_.el-form-item]:w-[calc(50%-10px)] [&>.el-row_.el-input]:w-full [&>.el-row_.el-select]:w-full"
            label-width="86px"
            label-position="top"
            :disabled="profileLoading"
          >
            <ElRow>
              <ElFormItem label="用户昵称" prop="nickName">
                <ElInput v-model="form.nickName" :disabled="!isEdit" maxlength="30" />
              </ElFormItem>
              <ElFormItem label="性别" prop="sex" class="ml-5">
                <ElSelect v-model="form.sex" :disabled="!isEdit">
                  <ElOption
                    v-for="item in sexOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </ElRow>
            <ElRow>
              <ElFormItem label="邮箱" prop="email">
                <ElInput v-model="form.email" :disabled="!isEdit" maxlength="50" />
              </ElFormItem>
              <ElFormItem label="手机号码" prop="phonenumber" class="ml-5">
                <ElInput v-model="form.phonenumber" :disabled="!isEdit" maxlength="11" />
              </ElFormItem>
            </ElRow>
            <div class="flex-c justify-end [&_.el-button]:!w-27.5">
              <ElButton v-if="!isEdit" type="primary" class="w-22.5" v-ripple @click="startEdit">
                编辑
              </ElButton>
              <template v-else>
                <ElButton class="w-22.5" v-ripple @click="cancelEdit">取消</ElButton>
                <ElButton
                  type="primary"
                  class="w-22.5 ml-3"
                  v-ripple
                  :loading="saving"
                  @click="handleSave"
                >
                  保存
                </ElButton>
              </template>
            </div>
          </ElForm>
        </div>

        <!-- 更改密码 -->
        <div class="art-card-sm my-5">
          <h1 class="p-4 text-xl font-normal border-b border-g-300">更改密码</h1>
          <ElForm
            ref="pwdFormRef"
            :model="pwdForm"
            :rules="pwdRules"
            class="box-border p-5"
            label-width="86px"
            label-position="top"
            :disabled="pwdLoading"
          >
            <ElFormItem label="当前密码" prop="oldPassword">
              <ElInput
                v-model="pwdForm.oldPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
                autocomplete="current-password"
              />
            </ElFormItem>
            <ElFormItem label="新密码" prop="newPassword">
              <ElInput
                v-model="pwdForm.newPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
                autocomplete="new-password"
              />
            </ElFormItem>
            <ElFormItem label="确认新密码" prop="confirmPassword">
              <ElInput
                v-model="pwdForm.confirmPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
                autocomplete="new-password"
              />
            </ElFormItem>
            <div class="flex-c justify-end [&_.el-button]:!w-27.5">
              <ElButton v-if="!isEditPwd" type="primary" class="w-22.5" v-ripple @click="isEditPwd = true">
                修改密码
              </ElButton>
              <template v-else>
                <ElButton class="w-22.5" v-ripple @click="cancelEditPwd">取消</ElButton>
                <ElButton
                  type="primary"
                  class="w-22.5 ml-3"
                  v-ripple
                  :loading="pwdSaving"
                  @click="handleUpdatePwd"
                >
                  保存
                </ElButton>
              </template>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/store/modules/user'
  import type { FormInstance, FormRules } from 'element-plus'
  import { fetchGetProfile, fetchUpdateProfile, fetchUpdatePwd } from '@/api/profile'
  import defaultAvatar from '@imgs/user/avatar.webp'

  defineOptions({ name: 'UserCenter' })

  const userStore = useUserStore()
  const userInfo = computed(() => userStore.getUserInfo)

  /** ===== 个人信息 ===== */
  const profile = reactive<Partial<Api.Profile.UserProfile>>({})
  const profileLoading = ref(false)

  const form = reactive({
    nickName: '',
    email: '',
    phonenumber: '',
    sex: ''
  })

  const profileFormRef = ref<FormInstance>()
  const isEdit = ref(false)
  const saving = ref(false)

  /** 备份表单数据，用于取消编辑时恢复 */
  const formBackup = reactive({ nickName: '', email: '', phonenumber: '', sex: '' })

  const sexOptions = [
    { value: '0', label: '男' },
    { value: '1', label: '女' },
    { value: '2', label: '未知' }
  ]

  const profileRules: FormRules = {
    nickName: [
      { required: true, message: '请输入用户昵称', trigger: 'blur' },
      { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
    ],
    email: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
    ],
    phonenumber: [
      { required: true, message: '请输入手机号码', trigger: 'blur' },
      {
        pattern: /^1[3-9]\d{9}$/,
        message: '请输入正确的手机号码',
        trigger: 'blur'
      }
    ],
    sex: [{ required: true, message: '请选择性别', trigger: 'change' }]
  }

  /** ===== 密码修改 ===== */
  const pwdForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const pwdFormRef = ref<FormInstance>()
  const isEditPwd = ref(false)
  const pwdSaving = ref(false)
  const pwdLoading = ref(false)

  /** 自定义验证：确认密码必须与新密码一致 */
  const validateConfirmPassword = (_rule: any, value: string, callback: (e?: Error) => void) => {
    if (value !== pwdForm.newPassword) {
      callback(new Error('两次输入的密码不一致'))
    } else {
      callback()
    }
  }

  const pwdRules: FormRules = {
    oldPassword: [
      { required: true, message: '请输入当前密码', trigger: 'blur' },
      { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
    ],
    newPassword: [
      { required: true, message: '请输入新密码', trigger: 'blur' },
      { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
    ],
    confirmPassword: [
      { required: true, message: '请再次输入新密码', trigger: 'blur' },
      { validator: validateConfirmPassword, trigger: 'blur' }
    ]
  }

  /** ===== 数据加载 ===== */
  /** 将后端数据填充到表单 */
  const fillForm = (data: Partial<Api.Profile.UserProfile>) => {
    form.nickName = data.nickName || ''
    form.email = data.email || ''
    form.phonenumber = data.phonenumber || ''
    form.sex = data.sex || '2'
  }

  /** 备份表单数据 */
  const backupForm = () => {
    formBackup.nickName = form.nickName
    formBackup.email = form.email
    formBackup.phonenumber = form.phonenumber
    formBackup.sex = form.sex
  }

  /** 加载个人信息 */
  const loadProfile = async () => {
    profileLoading.value = true
    try {
      const data = await fetchGetProfile()
      Object.assign(profile, data)
      fillForm(data)
    } catch {
      ElMessage.error('获取个人信息失败')
    } finally {
      profileLoading.value = false
    }
  }

  /** ===== 基本设置操作 ===== */
  const startEdit = () => {
    backupForm()
    isEdit.value = true
  }

  const cancelEdit = () => {
    form.nickName = formBackup.nickName
    form.email = formBackup.email
    form.phonenumber = formBackup.phonenumber
    form.sex = formBackup.sex
    isEdit.value = false
    profileFormRef.value?.clearValidate()
  }

  const handleSave = async () => {
    const valid = await profileFormRef.value?.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
      await fetchUpdateProfile({
        nickName: form.nickName,
        email: form.email,
        phonenumber: form.phonenumber,
        sex: form.sex
      })
      // 更新本地展示数据
      profile.nickName = form.nickName
      profile.email = form.email
      profile.phonenumber = form.phonenumber
      profile.sex = form.sex
      isEdit.value = false
      ElMessage.success('个人信息修改成功')
    } catch {
      ElMessage.error('个人信息修改失败')
    } finally {
      saving.value = false
    }
  }

  /** ===== 密码修改操作 ===== */
  const cancelEditPwd = () => {
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    isEditPwd.value = false
    pwdFormRef.value?.clearValidate()
  }

  const handleUpdatePwd = async () => {
    const valid = await pwdFormRef.value?.validate().catch(() => false)
    if (!valid) return

    pwdSaving.value = true
    try {
      await fetchUpdatePwd({
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword
      })
      ElMessage.success('密码修改成功，请重新登录')
      // 清空表单
      pwdForm.oldPassword = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
      isEditPwd.value = false
      // 密码修改后退出登录，让用户重新登录
      setTimeout(() => {
        userStore.logOut()
      }, 1500)
    } catch {
      ElMessage.error('密码修改失败')
    } finally {
      pwdSaving.value = false
    }
  }

  /** ===== 生命周期 ===== */
  onMounted(() => {
    loadProfile()
  })
</script>
