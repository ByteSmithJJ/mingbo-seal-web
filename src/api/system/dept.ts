import request from '@/utils/http'

export function fetchDeptList(params?: Api.SystemManage.DeptSearchParams) {
  return request.get<{ data: Api.SystemManage.DeptItem[] }>({
    url: '/api/system/dept/list',
    params
  })
}

export function fetchDeptExcludeChild(deptId: number) {
  return request.get<{ data: Api.SystemManage.DeptItem[] }>({
    url: `/api/system/dept/list/exclude/${deptId}`
  })
}

export function fetchDept(deptId: number) {
  return request.get<{ data: Api.SystemManage.DeptItem }>({
    url: `/api/system/dept/${deptId}`
  })
}

export function fetchAddDept(data: Api.SystemManage.DeptFormData) {
  return request.post<void>({
    url: '/api/system/dept',
    data
  })
}

export function fetchUpdateDept(data: Api.SystemManage.DeptFormData) {
  return request.put<void>({
    url: '/api/system/dept',
    data
  })
}

export function fetchUpdateDeptSort(data: { deptIds: string; orderNums: string }) {
  return request.put<void>({
    url: '/api/system/dept/updateSort',
    data
  })
}

export function fetchDeleteDept(deptId: number) {
  return request.del<void>({
    url: `/api/system/dept/${deptId}`
  })
}
