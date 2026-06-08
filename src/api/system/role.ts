import request from '@/utils/http'

export function fetchRoleList(params: Api.SystemManage.RoleSearchParams) {
  return request.get<{ rows: Api.SystemManage.RoleListItem[]; total: number }>({
    url: '/api/system/role/list',
    params
  })
}

export function fetchRole(roleId: number) {
  return request.get<{ data: Api.SystemManage.RoleListItem }>({
    url: `/api/system/role/${roleId}`
  })
}

export function fetchAddRole(data: Api.SystemManage.RoleFormData) {
  return request.post<void>({
    url: '/api/system/role',
    data
  })
}

export function fetchUpdateRole(data: Api.SystemManage.RoleFormData) {
  return request.put<void>({
    url: '/api/system/role',
    data
  })
}

export function fetchDeleteRole(roleId: string) {
  return request.del<void>({
    url: `/api/system/role/${roleId}`
  })
}

export function fetchChangeRoleStatus(roleId: number, status: string) {
  return request.put<void>({
    url: '/api/system/role/changeStatus',
    data: { roleId, status }
  })
}

export function fetchRoleDataScope(data: {
  roleId: number
  dataScope: string
  deptIds?: number[]
}) {
  return request.put<void>({
    url: '/api/system/role/dataScope',
    data
  })
}

export function fetchAllocatedUserList(params: {
  pageNum: number
  pageSize: number
  roleId: number
  userName?: string
  phonenumber?: string
}) {
  return request.get<{ rows: any[]; total: number }>({
    url: '/api/system/role/authUser/allocatedList',
    params
  })
}

export function fetchUnallocatedUserList(params: {
  pageNum: number
  pageSize: number
  roleId: number
  userName?: string
  phonenumber?: string
}) {
  return request.get<{ rows: any[]; total: number }>({
    url: '/api/system/role/authUser/unallocatedList',
    params
  })
}

export function fetchCancelAuthUser(data: { userId: number; roleId: number }) {
  return request.put<void>({
    url: '/api/system/role/authUser/cancel',
    data
  })
}

export function fetchCancelAuthUserAll(data: { roleId: number; userIds: string }) {
  return request.put<void>({
    url: '/api/system/role/authUser/cancelAll',
    params: data
  })
}

export function fetchSelectAuthUserAll(data: { roleId: number; userIds: string }) {
  return request.put<void>({
    url: '/api/system/role/authUser/selectAll',
    params: data
  })
}

export function fetchRoleDeptTree(roleId: number) {
  return request.get<{ depts: any[]; checkedKeys: number[] }>({
    url: `/api/system/role/deptTree/${roleId}`
  })
}

export function fetchExportRole(params: Api.SystemManage.RoleSearchParams) {
  return request.post<Blob>({
    url: '/api/system/role/export',
    params,
    responseType: 'blob'
  })
}
