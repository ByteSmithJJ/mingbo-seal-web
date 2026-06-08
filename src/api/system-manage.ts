import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/api/system/user/list',
    params
  })
}

// 获取角色列表
export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return request.get<Api.SystemManage.RoleList>({
    url: '/api/system/role/list',
    params
  })
}

// 获取当前用户路由/菜单树（用于动态路由注册）
export function fetchGetRouters() {
  return request.get<AppRouteRecord[]>({
    url: '/api/getRouters'
  })
}

// 获取全部菜单列表（用于菜单管理页面）
export function fetchGetMenuList() {
  return request.get<AppRouteRecord[]>({
    url: '/api/system/menu/list'
  })
}
