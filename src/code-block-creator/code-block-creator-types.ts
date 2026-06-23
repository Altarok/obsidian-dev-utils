import {Setting, SliderComponent, ToggleComponent, ValueComponent} from 'obsidian'
import {GenericModal} from "./code-block-creator-modal";

export type OutputData = string | boolean | number | undefined

export type Input = { type: string; prompt: string }
export type BaseInput = Input & {
  key: string;
  ignoreKeyInCodeBlock?: boolean;
  tooltip?: string;
  current?: boolean | number | string
}
export type BooleanInput = BaseInput & { type: 'boolean'; current: boolean }
export type ColorInput = BaseInput & { type: 'color'; current: string }
export type DropdownInput = BaseInput & { type: 'dropdown'; current: string; dropdownOptions: readonly string[] }
export type DropdownMultiInput = BaseInput & {
  type: 'dropdown-multi';
  current: never;
  dropdownOptions: readonly string[]
}
export type SliderInput = BaseInput & { type: 'slider'; current: number; from: number; to: number; step: number }
export type StringInput = BaseInput & { type: 'string'; current: string; validationPattern?: RegExp }
export type ExpandableInput = Input & { type: 'expandable'; nestedInput: readonly OptionalInput[] }

export type NonExpandableInput =
  BooleanInput
  | ColorInput
  | DropdownInput
  | DropdownMultiInput
  | SliderInput
  | StringInput

export type MandatoryInput = Readonly<NonExpandableInput>
export type OptionalInput = Readonly<NonExpandableInput | ExpandableInput>

export type AnyInput = MandatoryInput | OptionalInput

export type GenericModalInput = {
  readonly title?: string
  readonly pluginName: string
  readonly codeBlockId: string
  readonly mandatory: readonly MandatoryInput[]
  readonly optional: readonly OptionalInput[]
  readonly onUpdatePreview?: (previewEl: HTMLDivElement) => void

  output: Record<string, OutputData>
}

export type SelectorContext = {
  setting: Setting
  input: NonExpandableInput
  output: Record<string, OutputData>
  callback: GenericModal
  isOptional: boolean
}

export type ComponentTypeForReset<T> =
  T extends BooleanInput ? ToggleComponent :
    T extends SliderInput ? SliderComponent :
      ValueComponent<string>
