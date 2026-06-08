import request from '@/utils/http'

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/login',
    params
  })
}

export function fetchGetUserInfo() {
  return request.get<Api.Auth.UserInfo>({
    url: '/api/getInfo'
  })
}

export function fetchGetCaptcha() {
  return request.get<{ captchaEnabled: boolean; uuid: string; img: string }>({
    url: '/api/captchaImage'
  })
}

export function fetchRoleOptions() {
  return request.get<{ roleId: number; roleName: string; roleKey: string }[]>({
    url: '/api/getRoleOptions'
  })
}
