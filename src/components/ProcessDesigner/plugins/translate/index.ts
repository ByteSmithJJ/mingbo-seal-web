export default function customTranslate(translations: Record<string, string>) {
  return function (template: string, replacements?: Record<string, string>): string {
    replacements = replacements || {}
    template = translations[template] || template
    return template.replace(/{([^}]+)}/g, (_, key) => {
      let str = replacements[key]
      if (
        translations[replacements[key]] !== null &&
        translations[replacements[key]] !== undefined
      ) {
        str = translations[replacements[key]]
      }
      return str || `{${key}}`
    })
  }
}
