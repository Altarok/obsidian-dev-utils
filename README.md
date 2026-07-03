# obsidian-dev-utils

> [!NOTE]
> This is an automatically translated version of the (German) LIESMICH.md file. 

This repository contains useful code snippets for developing plugins for Obsidian.

> [!NOTE]
> All use cases were created for personal use; feedback and suggestions are welcome.

# MOC (Table of Contents)

- Code Block Creator
- ... *more to come*

# Code Block Creator for Obsidian

An abstracted UI form framework (`GenericModal`) for Obsidian plugins that enables the rapid generation of complex code blocks. The system loosely mirrors the behavior of native Obsidian settings.

Code blocks can, of course, be left blank. Furthermore, the architecture assumes:

* Every line consists of a key-value pair.
* Each pair has a default value that does not need to be explicitly rendered in the code block.

The Code Block Creator is passed a mutable `Record<string, string | number | boolean | undefined>`, which it populates based on user input. The keys of the record correspond directly to the keys generated in the code block.

## Architecture & Data Flow

`GenericModal` expects a configuration object of type `GenericModalInput` and an HTML element provided by Obsidian's native `Modal` class, which it populates. The `GenericModalInput` object contains the following fields:

```typescript
type GenericModalInput = {
  title?: string                                        // Optional title for the modal. Might be deprecated.
  pluginName: string                                    // The plugin name. Displayed in square brackets in the title.
  codeBlockId: string                                   // The code block identifier used after the triple backticks.
  mandatory: readonly MandatoryInput[]                  // Required inputs without which the code block cannot be rendered.
  optional: readonly OptionalInput[]                    // Optional inputs.
  onUpdatePreview?: (previewEl: HTMLDivElement) => void // Optional callback invoked by the plugin to render a live preview.
  output: Record<string, OutputData>                    // Continuously updated output record for the callback and code block.
}

```

* **State-Driven:** UI components bind directly to the passed `output: Record<string, OutputData>`.
* **Change Evaluation:** Any user interaction triggers an internal `write()` or `revert()` cycle, updates the data record, and fires the `onUpdatePreview` callback.
* **Serialization Filtering:** Properties are *only* serialized into the final code block if their current value deviates from the defined `current` (default) value and is not `undefined` or `''`.

---

## API & Input Configuration

All selectors inherit from the `Selector` base class and configure a native Obsidian `Setting` instance via the `.draw()` lifecycle method.

### Base Type: `BaseInput`

The common primitive foundation for the input types listed below.

```typescript
type BaseInput = {
  type: 'boolean' | 'color' | 'string' | 'slider' | 'dropdown' | 'conditional' | 'dropdownMulti' | 'expandable' 
  prompt: string                  // UI label text
  key: string                     // Serialization key & output record key
  current?: OutputData            // Default & initial value
  ignoreKeyInCodeBlock?: boolean  // Prevents printing the 'key:' prefix in the block
  tooltip?: string                // Tooltip text for the reset button
}

```

## Type Reference

### 1. Boolean

Renders a native Obsidian `ToggleComponent`.

```typescript
{
  type: 'boolean',
  prompt: 'Enable animation',
  key: 'animate',
  current: false
}

```

* **Code Block Output:** `animate: true`
* **Behavior:** When shifted to `true` (deviating from `current`), the block serializes `animate: true`. Toggling back to `false` triggers the `revert()` logic, removing the key from the output record and clearing the line from the block.

### 2. Color (ColorComponent)

Renders a native HTML5 color picker wrapper.

```typescript
{
  type: 'color',
  prompt: 'Background color',
  key: 'bgColor',
  current: '#bada55',
}

```

* **Code Block Output:** `bgColor: #bada55`

### 3. String (Text Input)

Renders a native Obsidian `TextComponent` with optional regular expression validation.

```typescript
{
  type: 'string',
  prompt: 'Exclusion pattern (Glob)',
  key: 'excludePattern',
  current: 'node_modules/**',
  validationPattern: /^[a-zA-Z0-9_.\/*\-]+$/   // Optional
}

```

* **Validation:** The internal `write()` cycle validates the string on every keystroke using `validationPattern.test(value)`. If validation fails, state mutation is blocked, the output record is not updated, and the live preview freezes at the last valid state.
* **Code Block Output:** `excludePattern: src//*.test.ts`

### 4. Slider

Renders an Obsidian `SliderComponent` with explicit scale definitions. Values are validated internally against the bounds.

```typescript
{
  type: 'slider',
  prompt: 'Animation speed',
  key: 'speed',
  current: 1,
  from: 0,
  to: 5,
  step: 0.5
}

```

* **Code Block Output:** `speed: 2.5`

### 5. Dropdown

Renders a standard HTML select menu using Obsidian's `DropdownComponent`.

```typescript
{
  type: 'dropdown',
  prompt: 'Render mode',
  key: 'view',
  current: '2D',
  dropdownOptions: ['2D', '3D']
}

```

* **Code Block Output:** `view: 3D`

### 6. Conditional (Cascading Dropdowns)

Links two `DropdownComponent` instances together using a reactive internal `onChange` listener. Selecting a primary option dynamically updates the options available in the secondary dropdown.

```typescript
{
  type: 'conditional',
  prompt: 'Component type ..',
  key: 'component',
  subPrompt: '.. and layout style',
  nestedInput: [
    { key: "Card", dropdownOptions: ['Minimal Card', 'Detailed Grid'] },
    { key: "List", dropdownOptions: ['Ordered Flex', 'Table View'] }
  ]
}

```

* **Code Block Output:** `component: Detailed Grid`
* **DOM Handling:** When the primary dropdown mutates, the secondary element is cleared via `selectEl.empty()` and its option structure is deterministically rebuilt using `addOptions()`.

### 7. Multi-Select Dropdown (`dropdownMulti`)

Allows multi-selection within a single dropdown control. Selected items are stored in an internal array tracker and written to a disabled `TextComponent` as a delimited string.

```typescript
{
  type: 'dropdownMulti',
  prompt: 'Active environment flags',
  key: 'flags',
  current: 'default',
  resetOnCurrent: true,
  dropdownOptions: ['default', 'production', 'staging', 'debug']
}

```

* **Code Block Output:** `flags: production,debug`

### 8. Expandable Input (Layout Group)

Capsules a nested collection of other input nodes within a collapsible `SettingGroup` layout block.

```typescript
{
  type: 'expandable',
  prompt: 'Advanced layout rules',
  nestedInput: [
    { type: 'color', prompt: 'Font color', key: 'fontColor', current: '#000000' },
    { type: 'color', prompt: 'Canvas tint', key: 'bgColor', current: '#ffffff' },
    { type: 'boolean', prompt: 'Drop shadows', key: 'shadows', current: false }
  ]
}

```

* **UX & Mobile Optimization:** The modal enforces an accordion layout paradigm via `collapseOtherExpandableSelectors()`. Opening any group automatically collapses all other parallel groups, preventing layout overflow on mobile Obsidian viewports (iOS/Android).

---

## Planned Features & Roadmap

* [ ] **Custom Separator Handling:** By default, keys and values are serialized with a colon delimiter (`key: value`). An optional `separator` configuration parameter will be introduced at the form or field level to support alternative assignments like equals signs (`key=value`) or whitespace.
* [ ] **State-Based Resets (`resetOnCurrent`):** Further refinements to automatically exclude parameters from the generated code block when their value matches the predefined default value.
* [ ] **Expanded Accordion Controls:** Provide a flag to initialize an expandable layout group in an open state by default.
