import { some } from 'min-dash'

const ALLOWED_TYPES: Record<string, string[]> = {
  FailedJobRetryTimeCycle: [
    'bpmn:StartEvent',
    'bpmn:BoundaryEvent',
    'bpmn:IntermediateCatchEvent',
    'bpmn:Activity'
  ],
  Connector: ['bpmn:EndEvent', 'bpmn:IntermediateThrowEvent'],
  Field: ['bpmn:EndEvent', 'bpmn:IntermediateThrowEvent']
}

function is(element: any, type: string): boolean {
  return element && typeof element.$instanceOf === 'function' && element.$instanceOf(type)
}

function exists(element: any): boolean {
  return element && element.length
}

function includesType(collection: any[], type: string): boolean {
  return (
    exists(collection) &&
    some(collection, function (element: any) {
      return is(element, type)
    })
  )
}

function anyType(element: any, types: string[]): boolean {
  return some(types, function (type: string) {
    return is(element, type)
  })
}

function isAllowed(propName: string, propDescriptor: any, newElement: any): boolean {
  const name = propDescriptor.name
  const types = ALLOWED_TYPES[name.replace(/flowable:/, '')]
  return name === propName && anyType(newElement, types)
}

export default class FlowableModdleExtension {
  static $inject = ['eventBus']

  constructor(eventBus: any) {
    eventBus.on(
      'property.clone',
      (context: any) => {
        const newElement = context.newElement
        const propDescriptor = context.propertyDescriptor
        this.canCloneProperty(newElement, propDescriptor)
      },
      this
    )
  }

  canCloneProperty(newElement: any, propDescriptor: any): boolean | undefined {
    if (isAllowed('flowable:FailedJobRetryTimeCycle', propDescriptor, newElement)) {
      return (
        includesType(newElement.eventDefinitions, 'bpmn:TimerEventDefinition') ||
        includesType(newElement.eventDefinitions, 'bpmn:SignalEventDefinition') ||
        is(newElement.loopCharacteristics, 'bpmn:MultiInstanceLoopCharacteristics')
      )
    }

    if (isAllowed('flowable:Connector', propDescriptor, newElement)) {
      return includesType(newElement.eventDefinitions, 'bpmn:MessageEventDefinition')
    }

    if (isAllowed('flowable:Field', propDescriptor, newElement)) {
      return includesType(newElement.eventDefinitions, 'bpmn:MessageEventDefinition')
    }
  }
}
