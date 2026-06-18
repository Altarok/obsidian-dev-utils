import {Notice, Setting} from 'obsidian'

export type OutputData = string | boolean | undefined

function toRecord(strings: readonly string[]): Record<string, string> {
  let record: Record<string, string> = {}
  for (const str of strings) record[str] = str
  return record
}

export interface BaseInput {
  readonly type: string
  readonly name: string
  readonly key: string
  readonly explanation?: string // optional long description for first time users
  readonly current?: string | boolean // current value
  readonly validationPattern?: RegExp
}

export interface BooleanInput extends BaseInput {
  type: 'boolean'
  current: boolean
  validationPattern?: never
}

export interface ColorInput extends BaseInput {
  type: 'color'
  current: string
  validationPattern?: never
}

export interface DropdownInput extends BaseInput {
  type: 'dropdown'
  current: string
  validationPattern?: never
  readonly dropdownOptions: readonly string[]
}

export interface StringInput extends BaseInput {
  type: 'string'
  current: string
  validationPattern?: RegExp // optional validation pattern
}

export type AnyInput = BooleanInput | ColorInput | DropdownInput | StringInput;

export interface GenericModalInput {
  readonly title?: string
  readonly pluginName?: string
  readonly mandatory: Readonly<AnyInput>[]
  readonly optional: Readonly<AnyInput>[]
  output: Record<string, OutputData>
  readonly createCodeBlock: () => string
  readonly onUpdatePreview?: (previewEl: HTMLDivElement) => void
}

abstract class Selector {
  toggleActive: boolean = false

  protected constructor(
    readonly setting: Setting,
    private readonly anyData: AnyInput,
    public output: Record<string, OutputData>,
    public readonly callback: GenericModal,
    public readonly isOptional: boolean) {
  }

  private validate(value: string): boolean {
    if (!this.anyData.validationPattern) return true
    return this.anyData.validationPattern.test(value)
  }

  write(value: OutputData) {
    if (typeof value === 'string' && !this.validate(value)) return
    // if (this.output?.[this.anyData.key])
    this.output[this.anyData.key] = value
    this.callback.updateTextArea()
  }

  revert() {
    // if (this.output?.[this.anyData.key])
    this.output[this.anyData.key] = undefined
    this.callback.updateTextArea()
  }

  addDefaultName() {
    if (this.isOptional)
      this.setting.setName(`Overwrite ${this.anyData.name}? Preset value is: ${this.anyData.current === '' ? 'none' : this.anyData.current}`)
    else
      this.setting.setName(`Please input ${this.anyData.name}.`)
  }

  addToggle() {
    if (!this.isOptional) return;
    this.setting.addToggle(tc => tc.setValue(this.toggleActive)
      .onChange(async (active: boolean) => {
        if (!active) this.revert()
        this.toggleActive = active
        this.draw()
      }))
  }

  abstract draw(): void

  addExplanationAsTooltip() {
    const tooltip = this.anyData.explanation ?? 'No explanation'
    this.setting.addExtraButton(eb => eb.setIcon('lucide-circle-question-mark').setTooltip(tooltip, {delay: -1}))
  }
}

class BooleanSelector extends Selector {
  private readonly initialValue: boolean

  constructor(setting: Setting, readonly data: BooleanInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
    this.initialValue = data.current
  }

  draw() {
    const {setting, initialValue} = this
    setting.clear()
    super.addDefaultName()

    setting.addToggle(tc => tc.setValue(initialValue)
      .onChange(async (active: boolean) => {
        if (active === initialValue) this.revert()
        else this.write(active)
      }))

    this.addExplanationAsTooltip()
  }
}

class ColorSelector extends Selector {
  constructor(setting: Setting, readonly data: ColorInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addDefaultName()
    setting.addColorPicker(color => color.setValue(data.current)
      .onChange(async (value: string) => this.write(value)))
    this.addToggle()
    this.addExplanationAsTooltip()
  }
}

class DropdownSelector extends Selector {

  constructor(setting: Setting, public data: DropdownInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addDefaultName()
    setting.addDropdown((button) => button
      .addOptions(toRecord(data.dropdownOptions)).setValue(data.current)
      .onChange(async (value: string) => this.write(value))
      .setDisabled(!this.toggleActive))

    this.addToggle()
    this.addExplanationAsTooltip()
  }
}

class StringSelector extends Selector {
  constructor(setting: Setting, readonly data: StringInput, output: Record<string, OutputData>, callback: GenericModal, readonly isOptional: boolean) {
    super(setting, data, output, callback, isOptional)
  }

  draw() {
    const {setting, data} = this
    setting.clear()
    super.addDefaultName()

    setting.addText(tc => tc
      .setValue(data.current)
      .onChange(async (value: string) => this.write(value))
      .setDisabled(this.isOptional && !this.toggleActive))

    super.addToggle()
    super.addExplanationAsTooltip()
  }
}

export class GenericModal {
  private textElement!: HTMLTextAreaElement
  private previewContainerEl!: HTMLDivElement;
  private adjustHeight!: () => void;

  constructor(public contentEl: HTMLElement, public data: GenericModalInput) {
  }

  display() {
    const {contentEl, data} = this
    const output = data.output;

    new Setting(contentEl).setName(data.title ?? data.pluginName ? data.pluginName + ' ' + 'Code block creator' : 'Code block creator').setHeading()

    for (const overwriteSetting of data.mandatory) switch (overwriteSetting.type) {
      // new MainInputSelector(new Setting(contentEl), overwriteSetting as MainInput, output, this).draw()
      case 'boolean':
        new BooleanSelector(new Setting(contentEl), overwriteSetting as BooleanInput, output, this, false).draw()
        break;
      case 'color':
        new ColorSelector(new Setting(contentEl), overwriteSetting as ColorInput, output, this, false).draw()
        break;
      case 'dropdown':
        new DropdownSelector(new Setting(contentEl), overwriteSetting as DropdownInput, output, this, false).draw()
        break;
      case 'string':
        new StringSelector(new Setting(contentEl), overwriteSetting as StringInput, output, this, false).draw()
        break;
    }


    new Setting(contentEl).setName('Select the global settings you want to overwrite for your code block.')

    for (const overwriteSetting of data.optional) switch (overwriteSetting.type) {
      case 'boolean':
        new BooleanSelector(new Setting(contentEl), overwriteSetting as BooleanInput, output, this, true).draw()
        break;
      case 'color':
        new ColorSelector(new Setting(contentEl), overwriteSetting as ColorInput, output, this, true).draw()
        break;
      case 'dropdown':
        new DropdownSelector(new Setting(contentEl), overwriteSetting as DropdownInput, output, this, true).draw()
        break;
      case 'string':
        new StringSelector(new Setting(contentEl), overwriteSetting as StringInput, output, this, true).draw()
        break;
      /* no 'main' here */
    }

    /* Create text area */
    this.createTextArea()


    /* create live SVG */
    this.previewContainerEl = contentEl.createDiv();
    this.previewContainerEl.style.width = '100%';
    this.previewContainerEl.style.display = 'flex';
    this.previewContainerEl.style.justifyContent = 'center';
    this.previewContainerEl.style.marginBottom = '1.5rem';

    this.updateTextArea();
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
    };

    // this.textElement.addEventListener('input', this.adjustHeight);

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
    let codeBlockContent = this.createCodeBlockContent();

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
    let codeBlockContent = this.createCodeBlockContent();
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
}
