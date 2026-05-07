import type { Translations } from '../types'

export const es: Translations = {
  toolbar: { ariaLabel: 'Formato de texto' },
  history: { undo: 'Deshacer', redo: 'Rehacer' },
  formatting: { bold: 'Negrita', italic: 'Cursiva', underline: 'Subrayado', strikethrough: 'Tachado', highlight: 'Resaltado' },
  headings: { heading1: 'Encabezado 1', heading2: 'Encabezado 2', heading3: 'Encabezado 3' },
  blocks: { bulletList: 'Lista con viñetas', orderedList: 'Lista numerada', blockquote: 'Cita', codeBlock: 'Bloque de código', horizontalRule: 'Línea horizontal' },
  alignment: { alignLeft: 'Alinear a la izquierda', alignCenter: 'Centrar', alignRight: 'Alinear a la derecha' },
  link: { insertLink: 'Insertar enlace', editorAriaLabel: 'Editor de enlace', textLabel: 'Texto', textPlaceholder: 'Texto del enlace…', urlLabel: 'URL', urlPlaceholder: 'https://…', applyButton: 'Aplicar', removeLinkButton: 'Eliminar enlace' },
  image: { insertImage: 'Insertar imagen', inserterAriaLabel: 'Insertor de imagen', urlTab: 'URL', uploadTab: 'Subir', imageUrlLabel: 'URL de la imagen', urlPlaceholder: 'https://…', altTextLabel: 'Texto alternativo', altTextPlaceholder: 'Descripción de la imagen…', insertButton: 'Insertar', dropzoneHint: 'Haz clic o arrastra una imagen aquí' },
  variables: { insertVariable: 'Insertar variable', pickerAriaLabel: 'Selector de variables', addCustomVariable: '+ Agregar variable personalizada…', back: '← Volver', backAriaLabel: 'Volver a la lista de variables', newVariableTitle: 'Nueva variable', namePlaceholder: 'Nombre de la variable…', addButton: 'Agregar', addOptionButton: '+', addOptionPlaceholder: 'Agregar opción…', removeOption: (option) => `Eliminar ${option}`, typeLabels: { text: 'Campo de texto', textarea: 'Área de texto', select: 'Lista desplegable', date: 'Fecha', daterange: 'Rango de fechas' } },
  tts: { insertTTS: 'Asignar voz', popoverAriaLabel: 'Asignación de voz', marksTab: 'Marcas guardadas', assignTab: 'Asignar', markLabel: 'Marca', markPlaceholder: 'Nombre de la marca…', voiceLabel: 'Voz / modelo', voiceSelectDefault: 'Selecciona una voz…', inflectionLabel: 'Inflexión', inflectionSelectDefault: 'Selecciona una inflexión…', applyButton: 'Aplicar', playButton: 'Reproducir', stopButton: 'Detener', removeButton: 'Eliminar marca' },
  variableNode: { fromLabel: 'Desde', toLabel: 'Hasta', clickToFill: (label) => `Clic para completar ${label}`, variableTitle: (label, value) => `${label}: ${value}` },
}
