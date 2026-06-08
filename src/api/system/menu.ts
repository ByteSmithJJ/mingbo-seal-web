import request from '@/utils/http'

export function fetchMenuList(params?: { menuName?: string; status?: string }) {
  return request.get<{ data: Api.SystemManage.MenuItem[] }>({
    url: '/api/system/menu/list',
    params
  })
}

export function fetchMenu(menuId: number) {
  return request.get<{ data: Api.SystemManage.MenuItem }>({
    url: `/api/system/menu/${menuId}`
  })
}

export function fetchMenuTreeselect() {
  return request.get<{ data: Api.SystemManage.MenuItem[] }>({
    url: '/api/system/menu/treeselect'
  })
}

export function fetchRoleMenuTreeselect(roleId: number) {
  return request.get<{ menus: Api.SystemManage.MenuItem[]; checkedKeys: number[] }>({
    url: `/api/system/menu/roleMenuTreeselect/${roleId}`
  })
}

export function fetchAddMenu(data: Api.SystemManage.MenuFormData) {
  return request.post<void>({
    url: '/api/system/menu',
    data
  })
}

export function fetchUpdateMenu(data: Api.SystemManage.MenuFormData) {
  return request.put<void>({
    url: '/api/system/menu',
    data
  })
}

export function fetchUpdateMenuSort(data: { menuIds: string; orderNums: string }) {
  return request.put<void>({
    url: '/api/system/menu/updateSort',
    data
  })
}

export function fetchDeleteMenu(menuId: number) {
  return request.del<void>({
    url: `/api/system/menu/${menuId}`
  })
}
