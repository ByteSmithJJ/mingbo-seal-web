import { AppRouteRecord } from '@/types/router'

export const formRoutes: AppRouteRecord = {
  path: '/form',
  name: 'Form',
  component: '/index/index',
  meta: {
    title: 'menus.form.title',
    icon: 'ri:file-list-3-line',
    roles: ['admin']
  },
  children: [
    {
      path: 'template',
      name: 'FormTemplate',
      component: '/form/template',
      meta: {
        title: 'menus.form.template',
        icon: 'ri:file-text-line',
        keepAlive: true,
        roles: ['admin']
      }
    },
  ]
}
