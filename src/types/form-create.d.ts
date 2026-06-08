declare module '@form-create/designer' {
  import { Plugin, Component } from 'vue'

  interface FcDesignerApi {
    getRule(): any[]
    setRule(rules: any[]): void
    getJson(): string
    getOption(): Record<string, any>
    getOptionsJson(): string
    setOption(option: Record<string, any>): void
    clear(): void
    addMenu(menu: any): void
    removeMenu(name: string): void
    setMenuItem(name: string, items: any[]): void
    appendMenuItem(name: string, item: any): void
    removeMenuItem(item: any): void
    addComponent(item: any): void
  }

  const FcDesigner: Plugin & { formCreate: any }
  export default FcDesigner
  export type { FcDesignerApi }
}

declare module '@form-create/element-ui' {
  import { Plugin } from 'vue'
  const formCreate: Plugin
  export default formCreate
}
