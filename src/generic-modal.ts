import {ColorComponent, Notice, Setting, SliderComponent, ToggleComponent, ValueComponent} from 'obsidian'

export type OutputData = string | boolean | number | undefined

function toRecord(strings: readonly string[]): Record<string, string> {
  return Object.fromEntries(strings.map(str => [str, str]))
}

type Input = { type: string; prompt: string /* shown to user */ }

type BaseInput = Input & {
  key: string // key in output Record
  tooltip?: string // shown to user as tooltip
  current?: boolean | number | string
}

type BooleanInput = BaseInput & { type: 'boolean'; current: boolean }
type ColorInput = BaseInput & { type: 'color'; current: string }
type DropdownInput = BaseInput & { type: 'dropdown'; current: string; dropdownOptions: readonly string[] }
type DropdownMultiInput = BaseInput & { type: 'dropdown-multi'; current: never; dropdownOptions: readonly string[] }
type SliderInput = BaseInput & { type: 'slider'; current: number; from: number; to: number; step: number }
type StringInput = BaseInput & { type: 'string'; current: string; validationPattern?: RegExp }

type ExpandableInput = Input & {
  type: 'expandable'; nestedInput: readonly OptionalInput[]
}

export type MandatoryInput = Readonly<BooleanInput | ColorInput | DropdownInput | DropdownMultiInput | SliderInput | StringInput>

export type OptionalInput = Readonly<BooleanInput | ColorInput | DropdownInput | DropdownMultiInput | SliderInput | StringInput
  | ExpandableInput>

export type AnyInput = MandatoryInput | OptionalInput

export type GenericModalInput = {
  readonly title?: string
  readonly pluginName: string
  readonly codeBlockId: string
  readonly mandatory: readonly MandatoryInput[]
  readonly optional: readonly OptionalInput[]
  readonly createCodeBlock: () => string
  readonly onUpdatePreview?: (previewEl: HTMLDivElement) => void

  output: Record<string, OutputData>
}

abstract class Selector {
  protected constructor(
    readonly setting: Setting,
    private readonly anyData: MandatoryInput,
    public output: Record<string, OutputData>,
    public readonly callback: GenericModal,
    public readonly isOptional: boolean) {
  }

  private validate(value: string): boolean {
    if (this.anyData.type !== 'string' || !this.anyData.validationPattern) return true
    return this.anyData.validationPattern?.test(value) ?? true
  }

  write(value: OutputData) {
    if (typeof value === 'string' && !this.validate(value)) return
    // if (this.output?.[this.anyData.key])
    this.output[this.anyData.key] = value
    this.callback.updateTextArea()
  }

  revert() {
    this.resetValueToCurrent() // set modal value before output
    this.output[this.anyData.key] = undefined // set output value
    this.callback.updateTextArea()
  }

  addName() {
    let prompt: string = this.anyData.prompt
    if (this.isOptional && 'current' in this.anyData) {
      const currVal = this.anyData.current !== undefined ? this.anyData.current : 'none'
      prompt += ` Preset value is: ${currVal}`
    }
    this.setting.setName(prompt)
  }

  abstract draw(): void

  abstract resetValueToCurrent(): void

  addResetButton() {
    let tooltip: string = this.anyData.current ? `Reset to ${this.anyData.current}` : `Reset`
    this.setting.addExtraButton(eb =>
      eb.setIcon('lucide-rotate-ccw')
        .setTooltip(tooltip, {delay: -1})
        .onClick(() => this.revert()))
  }
}

abstract class StringValueSelector extends Selector {
  resettableStringComponent?: ValueComponent<string>

  protected constructor(setting: Setting,
                        readonly data: ColorInput | DropdownInput | StringInput,
                        output: Record<string, OutputData>,
                        callback: GenericModal,
                        isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  resetValueToCurrent(): void {
    this.resettableStringComponent?.setValue(this.data.current)
  }
}

class BooleanSelector extends Selector {
  private readonly initialValue: boolean
  private toggle?: ToggleComponent

  constructor(
    setting: Setting,
    data: BooleanInput,
    output: Record<string, OutputData>,
    callback: GenericModal,
    readonly isOptional: boolean
  ) {
    super(setting, data, output, callback, isOptional)
    this.initialValue = data.current
  }

  draw() {
    const {setting, initialValue} = this
    setting.clear()
    super.addName()

    setting.addToggle(tc =>
      this.toggle = tc
        .setValue(initialValue)
        .onChange((active: boolean) => {
          if (active === initialValue) this.revert()
          else this.write(active)
        })
    )

    this.addResetButton()
  }

  resetValueToCurrent(): void {
    this.toggle?.setValue(this.initialValue)
  }
}

class ColorSelector extends StringValueSelector {
  constructor(setting: Setting, readonly data: ColorInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()
    setting.addColorPicker((color: ColorComponent) =>
      this.resettableStringComponent = color
        .setValue(data.current)
        .onChange(value => this.write(value))
    )
    this.addResetButton()
  }

  resetValueToCurrent(): void {
    this.resettableStringComponent?.setValue('#000000')
  }
}

class DropdownSelector extends StringValueSelector {
  constructor(setting: Setting, public data: DropdownInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()
    setting.addDropdown(dd =>
      this.resettableStringComponent = dd
        .addOptions(toRecord(data.dropdownOptions))
        .setValue(data.current)
        .onChange((value: string) => this.write(value))
    )
    this.addResetButton()
  }
}

class DropdownMultiSelector extends Selector {
  private selections: string[] = []
  private concatenatedSelections: string = ''
  private separator: string = ',' // add data.separator?

  constructor(setting: Setting, public data: DropdownMultiInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting
      .addText(tc => tc.setValue(this.concatenatedSelections).setDisabled(true))
      .addDropdown(button =>
        button
          .addOptions(toRecord(data.dropdownOptions))
          .onChange((value: string) => {
            if (!this.selections.includes(value)) this.selections.push(value)
            this.concatenatedSelections = this.selections.join(this.separator)
            this.write(value)
          })
      )

    this.addResetButton()
  }

  resetValueToCurrent(): void {
    this.selections = []
    this.concatenatedSelections = ''
  }
}

class ExpandableSelector /* extends Selector */ {
  private toggleActive: boolean = false
  private hiddenSettings: Setting[] = []
  private hasBuilt: boolean = false

  // private button: any

  constructor(public setting: Setting, public contentEl: HTMLElement, public data: ExpandableInput, public output: Record<string, OutputData>, public callback: GenericModal) {
    // super(setting, data, output, callback, true)
  }

  hideOrShow() {
    for (const s of this.hiddenSettings)
      s.settingEl.style.display = this.toggleActive ? '' /* unhide */ : 'none' /* hide */
  }

  draw() {
    if (this.hasBuilt) {
      this.hideOrShow()
      return
    }

    const {setting, data, output, contentEl, callback} = this

    for (const oldSetting of this.hiddenSettings) {
      oldSetting.settingEl.remove()
    }

    this.hiddenSettings = []

    setting.clear()
    setting.setName(data.prompt)

    setting.addExtraButton(bc => {
      // this.button = bc
      bc.setIcon('lucide-chevron-down')
      bc.onClick(() => {
        this.toggleActive = !this.toggleActive
        bc.setIcon(this.toggleActive ? 'lucide-chevron-up' : 'lucide-chevron-down')
        this.hideOrShow()
      })
    })

    for (const input of data.nestedInput) {

      const subSetting = new Setting(contentEl)
      this.hiddenSettings.push(subSetting)

      switch (input.type) {
        case 'boolean':
          new BooleanSelector(subSetting, input, output, callback, true).draw()
          break
        case 'color':
          new ColorSelector(subSetting, input, output, callback, true).draw()
          break
        case 'dropdown':
          new DropdownSelector(subSetting, input, output, callback, true).draw()
          break
        case 'dropdown-multi':
          new DropdownMultiSelector(subSetting, input, output, callback, true).draw()
          break
        // case 'expandable':
        //     new ExpandableSelector(new Setting(contentEl), input, output, callback).draw()
        //   break
        case 'slider':
          new SliderSelector(subSetting, input, output, callback, true).draw()
          break
        case 'string':
          new StringSelector(subSetting, input, output, callback, true).draw()
          break
      }
    }

    this.hideOrShow()
    // this.addExplanationAsTooltip()
    this.hasBuilt = true
  }

}

class SliderSelector extends Selector {
  slider?: SliderComponent

  constructor(setting: Setting, readonly data: SliderInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting.addSlider(sc => {
      this.slider = sc
        .setValue(data.current)
        .setLimits(data.from, data.to, data.step)
        .onChange((value: number) => this.write(value))
    })

    super.addResetButton()
  }

  resetValueToCurrent(): void {
    this.slider?.setValue(this.data.current)
  }
}

class StringSelector extends StringValueSelector {
  constructor(setting: Setting, readonly data: StringInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting.addText(tc => {
      this.resettableStringComponent = tc
      tc.setValue(data.current)
        .onChange((value: string) => this.write(value))
    })
    super.addResetButton()
  }
}

export class GenericModal {
  private textElement!: HTMLTextAreaElement
  private previewContainerEl!: HTMLDivElement
  private adjustHeight!: () => void

  constructor(public contentEl: HTMLElement, public data: GenericModalInput) {
  }

  createSelectors(inputs: readonly AnyInput[], isOptional: boolean) {
    const {contentEl, data} = this
    const output = data.output

    for (const input of inputs) switch (input.type) {
      case 'boolean':
        new BooleanSelector(new Setting(contentEl), input, output, this, isOptional).draw()
        break
      case 'color':
        new ColorSelector(new Setting(contentEl), input, output, this, isOptional).draw()
        break
      case 'dropdown':
        new DropdownSelector(new Setting(contentEl), input, output, this, isOptional).draw()
        break
      case 'dropdown-multi':
        new DropdownMultiSelector(new Setting(contentEl), input, output, this, isOptional).draw()
        break
      case 'expandable':
        if (isOptional) {
          new ExpandableSelector(new Setting(contentEl), contentEl, input, output, this).draw()
        } else {
          console.warn('Mandatory input can not be expandable')
        }
        break
      case 'slider':
        new SliderSelector(new Setting(contentEl), input, output, this, isOptional).draw()
        break
      case 'string':
        new StringSelector(new Setting(contentEl), input, output, this, isOptional).draw()
        break
    }
  }

  display() {
    const {contentEl, data} = this

    const headingText = data.title ?? (data.pluginName ? `[${data.pluginName}] Code block creator` : 'Code block creator')
    new Setting(contentEl).setName(headingText).setHeading()

    this.createSelectors(data.mandatory, false)
    this.createSelectors(data.optional, true)

    /* Create text area */
    this.createTextArea()

    /* create live SVG */
    this.previewContainerEl = contentEl.createDiv()
    this.previewContainerEl.style.width = '100%'
    this.previewContainerEl.style.display = 'flex'
    this.previewContainerEl.style.justifyContent = 'center'
    this.previewContainerEl.style.marginBottom = '1.5rem'

    this.updateTextArea()
  }

  private createTextArea() {

    const codeBlockContent: string = this.createCodeBlockContent()

    const setting = new Setting(this.contentEl)
      .setName('Output')
      .addTextArea(cb => {

        cb.setValue(codeBlockContent).setDisabled(true)

        this.textElement = cb.inputEl

        cb.inputEl.style.width = '100%'
        cb.inputEl.style.height = '80px' // Set a generous default height for the code block
        cb.inputEl.style.resize = 'vertical' // Allow the user to manually scale it vertically if they want
      })

    this.adjustHeight = () => {
      this.textElement.style.height = 'auto'
      this.textElement.style.height = `${this.textElement.scrollHeight}px`
    }

    // this.textElement.addEventListener('input', this.adjustHeight)

    this.adjustHeight()

    new Setting(this.contentEl).addButton(bc => bc
      .setIcon('copy')
      .onClick(async () => this.copyToClipboard())
      .setTooltip('Copy entire code block to clipboard', {'delay': -1})
      .setButtonText('Copy')
    )

    // 2. Clear Obsidian's default flex alignment limits on the setting container control block
    setting.controlEl.style.width = '100%'
    setting.controlEl.style.flexGrow = '1'

    // 3. Force the setting row to stack vertically if it gets too crowded
    setting.settingEl.style.flexDirection = 'column'
    setting.settingEl.style.alignItems = 'stretch'

    return setting
  }

  updateTextArea() {
    let codeBlockContent = this.createCodeBlockContent()

    if (this.textElement) {
      this.textElement.value = codeBlockContent
    }

    this.adjustHeight()

    /* Trigger the live preview renderer if it was passed in */
    if (this.data.onUpdatePreview && this.previewContainerEl) {
      this.data.onUpdatePreview(this.previewContainerEl)
    }
  }

  private async copyToClipboard() {
    let codeBlockContent = this.createCodeBlockContent()
    try {
      await window.navigator.clipboard.writeText(codeBlockContent)
      new Notice('Copied code block to clipboard.')
    } catch (err) {
      new Notice('Copy to clipboard failed.')
    }
  }

  private createCodeBlockContent() {
    return this.data.createCodeBlock()
  }

  const createCodeBlock = (): string => {
    const {optional, output} = this.data
    if (!output.smiles) return ''
    let code = `${output.smiles}\n`

    const settings: MandatoryInput[] = []

    const addToSettings = (o: OptionalInput): void => {
      if (o.type === 'expandable')
        o.nestedInput.forEach((o2: OptionalInput) => addToSettings(o2))
      else if (!!o && 'key' in o)
        settings.push(o)
    }

    optional.forEach((o: OptionalInput) =>
      addToSettings(o)
    )

    for (const setting of settings) {
      if (!setting) continue

      const localValue = output[setting.key]
      if (localValue === undefined || localValue === '') continue

      const key: string = setting.key
      const globalValue = setting.current
      if (globalValue === localValue) continue

      code += `${key}: ${localValue}\n`
    }

    return `\`\`\`smiles\n${code}\`\`\``
  }

}
