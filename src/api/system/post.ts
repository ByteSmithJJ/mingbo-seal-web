import request from '@/utils/http'

export function fetchPostList(params: Api.SystemManage.PostSearchParams) {
  return request.get<{ rows: Api.SystemManage.PostItem[]; total: number }>({
    url: '/api/system/post/list',
    params
  })
}

export function fetchPost(postId: number) {
  return request.get<{ data: Api.SystemManage.PostItem }>({
    url: `/api/system/post/${postId}`
  })
}

export function fetchAddPost(data: Api.SystemManage.PostFormData) {
  return request.post<void>({
    url: '/api/system/post',
    data
  })
}

export function fetchUpdatePost(data: Api.SystemManage.PostFormData) {
  return request.put<void>({
    url: '/api/system/post',
    data
  })
}

export function fetchDeletePost(postId: string) {
  return request.del<void>({
    url: `/api/system/post/${postId}`
  })
}

export function fetchPostExport(data: Api.SystemManage.PostSearchParams) {
  return request.post<Blob>({
    url: '/api/system/post/export',
    data,
    responseType: 'blob'
  })
}
