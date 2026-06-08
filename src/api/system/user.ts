import request from '@/utils/http'

// ==================== 用户管理 ====================

export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/api/system/user/list',
    params
  })
}

export function fetchGetUserInfo(userId: number) {
  return request.get<Api.SystemManage.UserListItem>({
    url: `/api/system/user/${userId || ''}`
  })
}

export function fetchAddUser(data: Api.SystemManage.UserFormData) {
  return request.post<void>({
    url: '/api/system/user',
    data
  })
}

export function fetchUpdateUser(data: Api.SystemManage.UserFormData) {
  return request.put<void>({
    url: '/api/system/user',
    data
  })
}

export function fetchDeleteUser(userIds: string) {
  return request.del<void>({
    url: `/api/system/user/${userIds}`
  })
}

export function fetchResetPassword(data: Api.SystemManage.ResetPwdParams) {
  return request.put<void>({
    url: '/api/system/user/resetPwd',
    data
  })
}

export function fetchChangeUserStatus(data: Api.SystemManage.ChangeStatusParams) {
  return request.put<void>({
    url: '/api/system/user/changeStatus',
    data
  })
}

export function fetchGetUserAuthRole(userId: number) {
  return request.get<{ user: Api.SystemManage.UserListItem; roles: Api.SystemManage.RoleSimple[] }>(
    {
      url: `/api/system/user/authRole/${userId}`
    }
  )
}

export function fetchAssignUserRole(data: Api.SystemManage.UserAuthRoleParams) {
  return request.put<void>({
    url: '/api/system/user/authRole',
    data
  })
}

export function fetchDeptTree() {
  return request.get<Api.SystemManage.DeptTreeNode[]>({
    url: '/api/system/user/deptTree'
  })
}

export function fetchExportUser(params: Api.SystemManage.UserSearchParams) {
  return request.post({
    url: '/api/system/user/export',
    params,
    responseType: 'blob'
  })
}

export function fetchImportUser(data: FormData) {
  return request.post<{ msg: string }>({
    url: '/api/system/user/importData',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function fetchImportTemplate() {
  return request.post<Blob>({
    url: '/api/system/user/importTemplate',
    responseType: 'blob'
  })
}

// ==================== 用户资料 ====================

export function fetchGetProfile() {
  return request.get<Api.SystemManage.UserListItem>({
    url: '/api/system/user/profile'
  })
}

export function fetchUpdateProfile(data: Partial<Api.SystemManage.UserListItem>) {
  return request.put<void>({
    url: '/api/system/user/profile',
    data
  })
}

export function fetchUpdatePassword(oldPassword: string, newPassword: string) {
  return request.put<void>({
    url: '/api/system/user/profile/updatePwd',
    data: { oldPassword, newPassword }
  })
}

export function fetchUploadAvatar(data: FormData) {
  return request.post<{ imgUrl: string }>({
    url: '/api/system/user/profile/avatar',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 通用文件上传
export function fetchUploadFile(data: FormData) {
  return request.post<{ url: string; fileName: string }>({
    url: '/api/common/upload',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
