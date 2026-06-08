import { AppRouteRecord } from '@/types/router'

export const toolRoutes: AppRouteRecord = {
  path: '/tool',
  name: 'Tool',
  component: '/index/index',
  meta: {
    title: 'menus.tool.title',
    icon: 'ri:tools-line',
    roles: ['admin']
  },
  children: [
    {
      path: 'swagger',
      name: 'Swagger',
      component: '/tool/swagger',
      meta: {
        title: 'menus.tool.swagger',
        icon: 'ri:braces-line',
        keepAlive: false,
        roles: ['admin']
      }
    }
  ]
}
