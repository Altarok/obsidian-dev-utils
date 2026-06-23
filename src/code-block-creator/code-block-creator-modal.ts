import {ExtraButtonComponent, Notice, Setting, SettingGroup, ValueComponent} from 'obsidian'
import {
  AnyInput, BooleanInput, ColorInput, ComponentTypeForReset, DropdownInput,
  DropdownMultiInput, ExpandableInput, GenericModalInput,
  MandatoryInput, NonExpandableInput, OptionalInput, OutputData,
  SelectorContext, SliderInput, StringInput
} from "./code-block-creator-types";


const toRecord = (strings: readonly string[]): Record<string, string> => Object.fromEntries(strings.map(s => [s, s]))

const SelectorRegistry: Record<string, (ctx: SelectorContext) => void> = {
  boolean: ({setting, input, output, callback, isOptional}) =>
    new BooleanSelector(setting, input as BooleanInput, output, callback, isOptional).draw(),
  color: ({setting, input, output, callback, isOptional}) =>
    new ColorSelector(setting, input as ColorInput, output, callback, isOptional).draw(),
  dropdown: ({setting, input, output, callback, isOptional}) =>
    new DropdownSelector(setting, input as DropdownInput, output, callback, isOptional).draw(),
  'dropdown-multi': ({setting, input, output, callback, isOptional}) =>
    new DropdownMultiSelector(setting, input as DropdownMultiInput, output, callback, isOptional).draw(),
  slider: ({setting, input, output, callback, isOptional}) =>
    new SliderSelector(setting, input as SliderInput, output, callback, isOptional).draw(),
  string: ({setting, input, output, callback, isOptional}) =>
    new StringSelector(setting, input as StringInput, output, callback, isOptional).draw(),
}

abstract class Selector<T extends MandatoryInput = MandatoryInput> {
  resettableComponent?: ComponentTypeForReset<T>

  constructor(public readonly setting: Setting,
              public readonly data: T,
              public output: Record<string, OutputData>, // not readonly
              public readonly callback: GenericModal,
              public readonly isOptional: boolean) {
  }

  //
  private validate(value: string): boolean {
    if (this.data.type !== 'string' || !this.data.validationPattern) return true
    return this.data.validationPattern?.test(value) ?? true
  }

  write(value: OutputData) {
    if (typeof value === 'string' && !this.validate(value)) return
    this.output[this.data.key] = value
    this.callback.updateTextArea()
  }

  revert() {
    this.resetValueToCurrent() // set modal value before output
    this.output[this.data.key] = undefined // set output value
    this.callback.updateTextArea()
  }

  addName() {
    this.setting.setName(this.data.prompt)
  }

  abstract draw(): void

  addResetButton() {
    if (!this.isOptional) return
    const backupValue: string = typeof this.data.current === 'boolean' || this.data.current ? `${this.data.current}` : 'none'
    let tooltip: string = `Reset to: ${backupValue}`
    this.setting.addExtraButton(eb =>
      eb.setIcon('lucide-rotate-ccw')
      .setTooltip(tooltip, {delay: -1})
      .onClick(() => this.revert()))
  }

  resetValueToCurrent(): void {
    if (!this.resettableComponent) return
    if (this.data.type === 'color') {
      (this.resettableComponent as ValueComponent<string>).setValue('#000000')
    } else if (this.data.type === 'dropdown-multi') {
      // TODO
    } else {
      this.resettableComponent.setValue(this.data.current as never)
    }
  }
}

class BooleanSelector extends Selector<BooleanInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting.addToggle(tc => this.resettableComponent =
      tc.setValue(data.current).onChange((active: boolean) => {
        if (active === data.current) this.revert()
        else this.write(active)
      })
    )

    this.addResetButton()
  }
}

class ColorSelector extends Selector<ColorInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()
    setting.addColorPicker(c => this.resettableComponent =
      c.setValue(data.current).onChange(value => this.write(value)))
    this.addResetButton()
  }
}

class DropdownSelector extends Selector<DropdownInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()
    setting.addDropdown(dd => this.resettableComponent =
      dd.addOptions(toRecord(data.dropdownOptions)).setValue(data.current)
      .onChange((value: string) => this.write(value))
    )
    this.addResetButton()
  }
}

class DropdownMultiSelector extends Selector<DropdownMultiInput> {
  private selections: string[] = []
  private concatenatedSelections: string = ''
  private separator: string = ',' // add data.separator?

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting.addText(tc => tc.setValue(this.concatenatedSelections).setDisabled(true))
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

class ExpandableSelector {
  private toggleActive: boolean = false
  private hasBuilt: boolean = false
  private bc?: ExtraButtonComponent
  private wrapperEl!: HTMLDivElement;

  constructor(public contentEl: HTMLElement,
              public data: ExpandableInput,
              public output: Record<string, OutputData>,
              public cb: GenericModal) {
  }

  hideOrShow(toggleActive: boolean) {
    if (toggleActive) this.show(); else this.hide()
  }

  hide() {
    this.toggleActive = false
    this.bc?.setIcon('lucide-chevron-down')
    this.wrapperEl.style.height = '0px'
  }

  private show() {
    this.toggleActive = true
    this.bc?.setIcon('lucide-chevron-up')
    this.cb.collapseOtherExpandableSelectors(this)

    this.wrapperEl.style.height = `${this.wrapperEl.scrollHeight}px`
    this.wrapperEl.style.backgroundColor = 'var(--background-modifier-box-shadow)'
    this.wrapperEl.style.borderRadius = '8px'
  }

  draw() {
    if (this.hasBuilt) {
      this.hideOrShow(this.toggleActive)
      return
    }

    const {data, output, contentEl, cb: callback} = this
    const settingGroup: SettingGroup = new SettingGroup(contentEl)

    settingGroup.setHeading(data.prompt)

    settingGroup.addExtraButton(bc =>
      this.bc = bc.setIcon('lucide-chevron-down').onClick(() => this.hideOrShow(!this.toggleActive))
    )

    // Create the outer grid container and inner content wrapper for CSS transitions
    this.wrapperEl = contentEl.createDiv()
    this.wrapperEl.style.overflow = 'hidden'
    this.wrapperEl.style.transition = 'height 0.25s ease-out'
    this.wrapperEl.style.marginBottom = '12px'

    const createSubSettingWithInlineCss = () => {
      const subSetting = new Setting(this.wrapperEl)

      Object.assign(subSetting.settingEl.style, {
        display: 'flex',
        flexShrink: '0',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '6px 12px'
      })

      Object.assign(subSetting.controlEl.style, {
        display: 'flex',
        alignItems: 'center',
        flexShrink: '0'
      })

      return subSetting
    }

    for (const input of data.nestedInput) {

      if (input.type === 'expandable') {
        continue
      }

      const render = SelectorRegistry[input.type]
      if (render) {
        render({setting: createSubSettingWithInlineCss(), input, output, callback, isOptional: true})
      }

    }

    this.hideOrShow(this.toggleActive)
    this.hasBuilt = true
  }

}

class SliderSelector extends Selector<SliderInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    let lowerBound: number = data.from
    let upperBound: number = data.to

    if (data.current < lowerBound) lowerBound = data.current
    else if (data.current > upperBound) upperBound = data.current

    setting.addSlider(sc => this.resettableComponent =
      sc.setValue(data.current).setLimits(lowerBound, upperBound, data.step)
      .onChange((value: number) => this.write(value))
    )

    super.addResetButton()
  }
}

class StringSelector extends Selector<StringInput> {
  draw() {
    const {setting, data} = this
    setting.clear()
    super.addName()

    setting.addText(tc => this.resettableComponent =
      tc.setValue(data.current).onChange((value: string) => this.write(value)))

    super.addResetButton()
  }
}

export class GenericModal {
  private textElement!: HTMLTextAreaElement
  private previewContainerEl!: HTMLDivElement
  private adjustHeight!: () => void
  private expandableSelectors: ExpandableSelector[] = []

  constructor(public contentEl: HTMLElement, public data: GenericModalInput) {
  }

  private createSelectors(inputs: readonly AnyInput[], isOptional: boolean) {
    const {contentEl, data} = this
    const output = data.output


    for (const input of inputs) {

      if (input.type === 'expandable') {
        if (isOptional) {
          const expandableSelector = new ExpandableSelector(contentEl, input, output, this)
          expandableSelector.draw()
          this.expandableSelectors.push(expandableSelector)
        } else {
          console.warn('Mandatory input can not be expandable')
        }
        continue
      }

      const render = SelectorRegistry[input.type]
      if (render) {
        render({setting: new Setting(contentEl), input, output, callback: this, isOptional})
      }
    }
  }

  display() {
    const {contentEl, data} = this

    const headingText = data.title ?? (data.pluginName ? `[${data.pluginName}] Code block creator` : 'Code block creator')
    new Setting(contentEl).setName(headingText).setHeading()

    this.createSelectors(data.mandatory, false)
    this.createSelectors(data.optional, true)

    /* create live SVG */
    this.previewContainerEl = contentEl.createDiv()
    this.previewContainerEl.style.width = '100%'
    this.previewContainerEl.style.display = 'flex'
    this.previewContainerEl.style.justifyContent = 'center'
    this.previewContainerEl.style.marginBottom = '0'

    /* Create text area */
    this.createTextArea()
    this.updateTextArea()
  }

  private createTextArea() {

    const codeBlockContent: string = this.createCodeBlock()

    const setting = new Setting(this.contentEl).setName('Output')
    .addTextArea(cb => {
      cb.setValue(codeBlockContent).setDisabled(true)
      this.textElement = cb.inputEl
      cb.inputEl.style.width = '100%'
      cb.inputEl.style.height = '80px' // Set a generous default height for the code block
      cb.inputEl.style.resize = 'vertical' // Allow the user to manually scale it vertically if they want
    }).addExtraButton(bc => bc
      .setIcon('copy')
      .onClick(async () => this.copyToClipboard())
      .setTooltip('Copy entire code block to clipboard', {'delay': -1})
    )

    this.adjustHeight = () => {
      this.textElement.style.height = 'auto'
      this.textElement.style.height = `${this.textElement.scrollHeight}px`
    }

    this.adjustHeight()

    setting.controlEl.style.width = '100%'
    setting.controlEl.style.flexGrow = '1'

    // Make live output move below its setting name
    setting.settingEl.style.flexDirection = 'column'
    setting.settingEl.style.alignItems = 'stretch'

    return setting
  }

  updateTextArea() {
    let codeBlockContent = this.createCodeBlock()

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
    let codeBlockContent = this.createCodeBlock()
    try {
      await window.navigator.clipboard.writeText(codeBlockContent)
      new Notice('Code block copied to clipboard.')
    } catch (err) {
      new Notice('Copy to clipboard failed.')
    }
  }

  flattenInput(inputs: readonly OptionalInput[]): NonExpandableInput[] {
    return inputs.flatMap(input =>
      input.type === 'expandable' ? this.flattenInput(input.nestedInput) : [input]
    )
  }

  private createCodeBlock = (): string => {
    const {codeBlockId, mandatory, optional, output} = this.data

    // Keep only mandatory input needed for code block
    const activeMandatory: MandatoryInput[] = mandatory.filter(m => output[m.key])

    const allFlatSettings = this.flattenInput([...activeMandatory, ...optional])

    // if (allFlatSettings.length === 0) return `\`\`\`${codeBlockId}\n\`\`\``

    let codeBlockContent: string = allFlatSettings
    .filter(setting => { // keep only valid non-default values
      const localValue = output[setting.key]
      return localValue !== undefined && localValue !== '' && localValue !== setting.current
    })
    .map(setting => { // add key prefix if wanted
      const localValue = output[setting.key]
      return setting.ignoreKeyInCodeBlock ? `${localValue}` : `${setting.key}: ${localValue}`
    })
    .join('\n')

    if (codeBlockContent.length > 0) codeBlockContent += '\n'

    return `\`\`\`${codeBlockId}\n${codeBlockContent}\`\`\``
  }

  /** @param expandable - gets expanded right now */
  collapseOtherExpandableSelectors(expandable: ExpandableSelector) {
    this.expandableSelectors.forEach(e => {
      if (e !== expandable) e.hide()
    })
  }
}
