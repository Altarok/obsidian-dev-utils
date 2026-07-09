import {SliderComponent, ToggleComponent, ValueComponent} from 'obsidian'
import {GenericModal} from './code-block-creator-modal'

export type OutputData = string | boolean | number | undefined

export type Input = {
  /** Type of UI */
  type: 'boolean' | 'color' | 'conditional' | 'dropdown' | 'dropdownMulti' | 'path' | 'slider' | 'string' | 'expandable'
  /** Tells user what to decide in this UI */
  prompt: string
  /** Optional: If set, UI will be shown on top in the UI as well as in the code block.
   * Also, there will be no reset button. TODO add reset button?*/
  mandatory?: boolean
}
export type BaseInput = Input & {
  /** Key of input. Used in output Record. Also shown in code block. */
  key: string
  /** Pre-set value. Will not be shown in code block as it is presumed to be a default value.
   * Used to reduce code block size. */
  current: string | boolean | number
  /** Optional. Corresponding value would be added to code block without key-prefix. */
  ignoreKeyInCodeBlock?: boolean
  /** Optional tooltip. Would be shown under the prompt on mouse-over. */
  tooltip?: string
}
type StringValueInput = BaseInput & { /** Pre-selected default value. */ current: string }
type ToggleValueInput = BaseInput & { /** Pre-selected default value. */ current: boolean }
type NumberValueInput = BaseInput & { /** Pre-selected default value. */ current: number }


export type BooleanInput = ToggleValueInput & {
  type: 'boolean'; current: boolean
}

export type ColorInput = StringValueInput & { type: 'color' }

export type ConditionalInput = BaseInput & {
  type: 'conditional'; subPrompt: string
  nestedInput: { key: string, dropdownOptions: string[] | Record<string, string> }[]
}
export type DropdownInput = StringValueInput & {
  type: 'dropdown'
  /** Dropdown options. */
  dropdownOptions: readonly string[]
}
export type DropdownMultiInput = StringValueInput & { type: 'dropdownMulti'
  resetOnCurrent: boolean
  dropdownOptions: readonly string[] | Record<string, string>
}
export type ExpandableInput = Input & {  type: 'expandable'
  openOnStart?: boolean; mandatory: false; nestedInput: readonly MandatoryInput[]
}
export type PathInput = StringValueInput & { type: 'path' }
export type SliderInput = NumberValueInput & { type: 'slider'
  /** Lower bound */
  from: number
  /** Upper bound */
  to: number
  /** Step range */
  step: number
}
export type StringInput = StringValueInput & {
  type: 'string'
  /** Optional validation pattern for string. Input must match this to be used in code block. */
  validationPattern?: RegExp
}

export type NonExpandableInput =
  BooleanInput
  | ColorInput
  | DropdownInput
  | DropdownMultiInput
  | PathInput
  | SliderInput
  | StringInput
  | ConditionalInput

export type MandatoryInput = Readonly<NonExpandableInput>
export type UserInput = Readonly<NonExpandableInput | ExpandableInput>

export type GenericModalInput = {
  readonly pluginName: string
  readonly codeBlockId: string
  readonly keyValueSeparator?: string
  readonly input: readonly UserInput[]
  readonly onUpdatePreview?: (previewEl: HTMLDivElement) => void

  output: Record<string, OutputData>
}

export type SelectorContext = {
  contentEl: HTMLElement
  input: NonExpandableInput
  output: Record<string, OutputData>
  callback: GenericModal
  isOptional: boolean
}

export type ComponentTypeForReset<T> =
  T extends BooleanInput ? ToggleComponent :
    T extends SliderInput ? SliderComponent :
      ValueComponent<string>
