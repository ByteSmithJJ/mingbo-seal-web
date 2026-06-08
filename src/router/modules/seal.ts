import { AppRouteRecord } from '@/types/router'

export const sealRoutes: AppRouteRecord = {
  path: '/seal',
  name: 'Seal',
  component: '/index/index',
  meta: {
    title: 'menus.seal.title',
    icon: 'ri:stamp-line',
    roles: ['admin']
  },
  children: [
    {
      path: 'info',
      name: 'SealInfo',
      component: '/seal/info',
      meta: {
        title: 'menus.seal.info',
        icon: 'ri:file-info-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'authorization',
      name: 'SealAuthorization',
      component: '/seal/authorization',
      meta: {
        title: 'menus.seal.authorization',
        icon: 'ri:shield-keyhole-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
    {
      path: 'position',
      name: 'SealPosition',
      component: '/seal/position',
      meta: {
        title: 'menus.seal.position',
        icon: 'ri:focus-2-line',
        keepAlive: true,
        roles: ['admin']
      }
    }
  ]
}
