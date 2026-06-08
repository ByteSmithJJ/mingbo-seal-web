import request from '@/utils/http'

/**
 * 获取当前用户个人信息
 * GET /system/user/profile
 */
export function fetchGetProfile() {
  return request.get<Api.Profile.UserProfile>({
    url: '/api/system/user/profile'
  })
}

/**
 * 修改当前用户个人信息
 * PUT /system/user/profile
 */
export function fetchUpdateProfile(data: Api.Profile.UpdateProfileParams) {
  return request.put({
    url: '/api/system/user/profile',
    data
  })
}

/**
 * 修改当前用户密码
 * PUT /system/user/profile/updatePwd
 */
export function fetchUpdatePwd(data: Api.Profile.UpdatePwdParams) {
  return request.put({
    url: '/api/system/user/profile/updatePwd',
    data
  })
}
