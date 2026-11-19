type UiMessage =
  | { type: 'resize'; height: number }
  | { type: 'scan' }
  | { type: 'focus-node'; nodeId: string }
  | { type: 'apply-one'; nodeId: string; variableId: string }
  | { type: 'apply-many'; items: Array<{ nodeId: string; variableId: string }> }

type Candidate = {
  variableId: string
  variableName: string
  collectionId: string
  collectionName: string
  valuePreview: string
}

type ScanRow = {
  nodeId: string
  nodeName: string
  textPreview: string
  pageName: string
  path: string
  reason: string
  candidates: Candidate[]
}

const PANEL_WIDTH = 360
const PREVIEW_LIMIT = 120

function send(message: unknown): void {
  figma.ui.postMessage(message)
}

function preview(value: string): string {
  return value.length > PREVIEW_LIMIT ? value.slice(0, PREVIEW_LIMIT) + '…' : value
}

function getTextPreview(variable: Variable, collection: VariableCollection): string {
  const value = variable.valuesByMode[collection.defaultModeId]
  return typeof value === 'string' ? preview(value) : ''
}

async function scanDocument(): Promise<void> {
  send({ type: 'scan-start' })

  const [variables, collections] = await Promise.all([
    figma.variables.getLocalVariablesAsync('STRING'),
    figma.variables.getLocalVariableCollectionsAsync(),
  ])
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]))
  const variableById = new Map(variables.map((variable) => [variable.id, variable]))
  const variableCollection = new Map<string, VariableCollection>()
  for (const variable of variables) {
    const collection = collectionById.get(variable.variableCollectionId)
    if (collection) variableCollection.set(variable.id, collection)
  }

  const pages = [...figma.root.children]
  const rows: ScanRow[] = []
  const unresolvedCount = { value: 0 }
  const totalPages = pages.length

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex]
    await page.loadAsync()
    send({
      type: 'scan-progress',
      message: 'กำลังสแกนหน้า ' + (pageIndex + 1) + ' จาก ' + totalPages + ' · ' + page.name,
    })

    const stack: Array<{ node: BaseNode; ancestors: string[] }> = []
    for (let index = page.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: page.children[index], ancestors: [] })
    }

    while (stack.length > 0) {
      const current = stack.pop()!
      const node = current.node
      if ('children' in node) {
        const nextAncestors = [...current.ancestors, node.name]
        for (let index = node.children.length - 1; index >= 0; index -= 1) {
          stack.push({ node: node.children[index], ancestors: nextAncestors })
        }
      }
      if (node.type !== 'TEXT') continue

      const characterBinding = node.boundVariables?.characters
      const aliases: VariableAlias[] = !characterBinding
        ? []
        : Array.isArray(characterBinding)
          ? characterBinding as VariableAlias[]
          : [characterBinding as VariableAlias]
      const localBindings = aliases.filter((alias) => variableById.has(alias.id))
      if (localBindings.length > 0) continue

      let oldName: string | null = null
      let oldCollectionName: string | null = null
      if (aliases.length > 0) {
        const oldVariables = await Promise.all(
          aliases.map((alias) => variableById.get(alias.id) ?? figma.variables.getVariableByIdAsync(alias.id)),
        )
        const oldVariable = oldVariables.find((variable) => variable !== null && variable.resolvedType === 'STRING')
        if (oldVariable) {
          oldName = oldVariable.name
          const oldCollection =
            collectionById.get(oldVariable.variableCollectionId) ??
            (await figma.variables.getVariableCollectionByIdAsync(oldVariable.variableCollectionId))
          oldCollectionName = oldCollection?.name ?? null
        }
      }

      const expectedName = oldName ?? node.name
      const matching = variables.filter((variable) => variable.name === expectedName)
      const sameCollection = oldCollectionName
        ? matching.filter((variable) => variableCollection.get(variable.id)?.name === oldCollectionName)
        : matching
      const candidates = (sameCollection.length > 0 ? sameCollection : matching)
        .map((variable) => {
          const collection = variableCollection.get(variable.id)
          if (!collection) return null
          return {
            variableId: variable.id,
            variableName: variable.name,
            collectionId: collection.id,
            collectionName: collection.name,
            valuePreview: getTextPreview(variable, collection),
          }
        })
        .filter((candidate): candidate is Candidate => candidate !== null)

      if (candidates.length === 0) {
        unresolvedCount.value += 1
        continue
      }

      rows.push({
        nodeId: node.id,
        nodeName: node.name,
        textPreview: preview(node.characters),
        pageName: page.name,
        path: [...current.ancestors, node.name].join(' / '),
        reason: aliases.length > 0 ? 'พบ binding เดิมที่อ้างถึง variable ซึ่งไม่อยู่ในไฟล์แล้ว' : 'ยังไม่มี binding ของ characters',
        candidates,
      })
    }
  }

  send({
    type: 'scan-result',
    rows,
    collections: collections.map((collection) => ({ id: collection.id, name: collection.name })),
    unresolvedCount: unresolvedCount.value,
    textCount: rows.length + unresolvedCount.value,
  })
}

async function bindText(nodeId: string, variableId: string): Promise<string> {
  const [node, variable] = await Promise.all([
    figma.getNodeByIdAsync(nodeId),
    figma.variables.getVariableByIdAsync(variableId),
  ])
  if (!node || node.type !== 'TEXT') return 'ไม่พบ text layer นี้แล้ว'
  if (!variable || variable.resolvedType !== 'STRING') return 'ไม่พบ string variable ที่เลือกแล้ว'

  const fonts = node.characters.length > 0 ? node.getRangeAllFontNames(0, node.characters.length) : []
  for (const font of fonts) {
    await figma.loadFontAsync(font)
  }
  node.setBoundVariable('characters', variable)
  return 'สำเร็จ'
}

async function focusNode(nodeId: string): Promise<void> {
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type !== 'TEXT') {
    figma.notify('ไม่พบ text layer นี้แล้ว')
    return
  }
  // เปลี่ยนไปหน้าที่ layer อยู่ก่อน แล้วเลือกและ zoom ไปที่ layer
  let page: BaseNode | null = node
  while (page && page.type !== 'PAGE') page = page.parent
  if (page && page.type === 'PAGE' && figma.currentPage.id !== page.id) {
    await figma.setCurrentPageAsync(page)
  }
  figma.currentPage.selection = [node]
  figma.viewport.scrollAndZoomIntoView([node])
}

figma.showUI(__html__, { width: PANEL_WIDTH, height: 560, themeColors: true })
figma.root.setRelaunchData({ open: '' })

figma.ui.onmessage = async (message: UiMessage) => {
  if (message.type === 'resize') {
    figma.ui.resize(PANEL_WIDTH, Math.max(300, Math.min(900, Math.round(message.height))))
    return
  }
  if (message.type === 'focus-node') {
    try {
      await focusNode(message.nodeId)
    } catch {
      figma.notify('ไม่สามารถไปที่ layer นี้ได้')
    }
    return
  }
  if (message.type === 'scan') {
    try {
      await scanDocument()
    } catch (error) {
      send({ type: 'scan-error', message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดระหว่างสแกน' })
    }
    return
  }
  if (message.type === 'apply-one') {
    try {
      const result = await bindText(message.nodeId, message.variableId)
      send({ type: 'apply-result', nodeId: message.nodeId, success: result === 'สำเร็จ', message: result })
    } catch (error) {
      send({
        type: 'apply-result',
        nodeId: message.nodeId,
        success: false,
        message: error instanceof Error ? error.message : 'apply ไม่สำเร็จ',
      })
    }
    return
  }
  if (message.type === 'apply-many') {
    let applied = 0
    let failed = 0
    for (let index = 0; index < message.items.length; index += 1) {
      const item = message.items[index]
      try {
        const result = await bindText(item.nodeId, item.variableId)
        if (result === 'สำเร็จ') applied += 1
        else failed += 1
      } catch {
        failed += 1
      }
      send({
        type: 'apply-progress',
        completed: index + 1,
        total: message.items.length,
        applied,
        failed,
      })
    }
    send({ type: 'apply-many-result', applied, failed })
  }
}
