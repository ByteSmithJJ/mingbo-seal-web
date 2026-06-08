declare module 'bpmn-js/lib/Modeler' {
  import Modeler from 'bpmn-js'
  export default Modeler
}

declare module 'bpmn-js' {
  export default class Modeler {
    constructor(options: {
      container: HTMLElement
      additionalModules?: any[]
      moddleExtensions?: any
      keyboard?: { bindTo: Document | HTMLElement }
      propertiesPanel?: { parent: HTMLElement }
    })
    importXML(xml: string): Promise<{ warnings: string[] }>
    saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>
    saveSVG(): Promise<{ svg?: string; err?: Error }>
    get(service: 'commandStack'): { undo(): void; redo(): void; canUndo(): boolean; canRedo(): boolean }
    get(service: 'canvas'): { zoom(level: number | string, center?: string): void; resized(): void }
    get(service: 'alignElements'): { trigger(elements: any[], align: string): void }
    get(service: 'selection'): { get(): any[] }
    get(service: 'eventBus'): any
    get(service: string): any
    on(event: string, callback: (...args: any[]) => void): void
    off(event: string, callback: (...args: any[]) => void): void
    destroy(): void
  }
}

declare module 'bpmn-js-properties-panel' {
  export const BpmnPropertiesPanelModule: any
  export const BpmnPropertiesProviderModule: any
}

declare module 'diagram-js/lib/util/Mouse' {
  export function hasPrimaryModifier(event: any): boolean
}

declare module 'bpmn-js/lib/util/ModelUtil' {
  export function is(element: any, type: string): boolean
}

declare module 'bpmn-js/lib/util/DiUtil' {
  export function isExpanded(element: any): boolean
  export function isEventSubProcess(element: any): boolean
}

declare module 'bpmn-js/lib/features/modeling/util/ModelingUtil' {
  export function isAny(element: any, types: string[]): boolean
}

declare module 'bpmn-js/lib/features/modeling/util/LaneUtil' {
  export function getChildLanes(element: any): any[]
}
