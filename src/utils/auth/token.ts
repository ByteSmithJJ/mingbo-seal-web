/**
 * Token 工具模块
 * 提供 JWT token 解析和过期验证功能
 *
 * @module utils/auth/token
 */

interface JwtPayload {
  exp?: number
  iat?: number
  [key: string]: unknown
}

/** base64url 转 base64 标准格式 */
function base64UrlToBase64(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return base64
}

/** 解码 JWT payload */
function decodePayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = atob(base64UrlToBase64(payload))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/** 剥离可能的 Bearer 前缀，返回纯 token */
function normalizeToken(token: string): string {
  return token.startsWith('Bearer ') ? token.slice(7) : token
}

/**
 * 检查 token 是否已过期
 * @param token JWT token 字符串（可含 Bearer 前缀）
 * @returns true 表示 token 无效或已过期
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true

  const rawToken = normalizeToken(token)
  if (!rawToken) return true

  const payload = decodePayload(rawToken)
  // 非 JWT 格式（如纯 UUID），无法本地判断，交给服务端验证
  if (!payload) return false

  // 无 exp 字段，过期由服务端控制（如 Redis TTL），本地不判过期
  if (!payload.exp) return false

  // 有 exp 字段，比较当前时间与过期时间（秒级 Unix 时间戳）
  return Date.now() / 1000 >= payload.exp
}
