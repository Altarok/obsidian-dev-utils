Dieses Repository enthält nützliche Code Snippets zum Entwickeln von Plugins für Obsidian.
# MOC (Table of Contents)
 * Code Block Creator
 * ... *more to come*
# Code Block Creator
Ein beliebig konfigurierbares Popup ("Modal" in Obsidiansprache), welches Usern erlaubt, mehrere Code Blocks in schneller Abfolge zu erstellen.

Alle nötigen Konfigurationen und gewünschten Outputs werden vom nutzenden Plugin definiert, nicht unähnlich zu Obsidians Settings Popup.

Codeblöcke können natürlich leer gelassen werden. Darüber hinaus wird hier davon ausgegangen, ..
 * dass jede Zeile aus einem Key-Value-Paar besteht.
 * dass es für jedes Paar einen Standard-Wert gibt, welcher im Codeblock nicht explizit angezeigt werden muss. *(wip: konfigurierbar machen)*

Dem Code Block Creator wird hierfür ein editierbarer `Record<string, string | number | boolean | undefined>` mitgegeben, welchen selbiger mit den Eingaben des Nutzers befüllt. Die Keys des Records gleichen hier den Keys des Codeblocks.

> [!NOTE]
> **Begründung:**
> Den Record mitzugeben dient dem Aufrufer dazu, konstant auf den Output zugreifen zu können. Auf Basis dessen kann eine Callback-Funktion erstellt werden, welche den momentanen Stand jederzeit in ein Live-Preview verwandelt.

Dieses Code Snippet soll dabei helfen, diesen Record zu befüllen. Fertige Codeblöcke können im Popup in die Zwischenablage kopiert oder direkt in die gerade offene Datei geschrieben werden. Voraussetzung hierfür ist, dass es sich um eine Markdown-Datei handelt, welche gerade editierbar ist (source mode).

## Input-Typen & Konfiguration
Jeder Selektor besitzt folgende **Basiseigenschaften**:
 * prompt: string — Die Beschriftung im UI.
 * key: string — Der Schlüssel, der im finalen Codeblock und im Output-Record landet.
 * current: OutputData — Der Standard- bzw. Initialwert.
 * ignoreKeyInCodeBlock?: boolean *(Optional)* — Wenn true, wird nur der Wert ohne key: in den Codeblock geschrieben.
 * tooltip?: string *(Optional)* — Der Hover-Text für den Reset-Button.
### Farbauswahl (color)
Erzeugt einen nativen Farbpicker.
```typescript
{
  type: 'color',
  prompt: 'Hintergrundfarbe',
  key: 'bgColor',
  current: '#bada55',
  ignoreKeyInCodeBlock: false,
  tooltip: 'Ändert die Hintergrundfarbe des Würfels'
}

```
*Output im Codeblock:* bgColor: #bada55 (bzw. nur #bada55 wenn ignoreKeyInCodeBlock: true).
### Ein/Aus-Schalter (boolean)
Erzeugt einen Toggle-Schalter (Checkbox-Stil).
```typescript
{
  type: 'boolean',
  prompt: 'Animation aktivieren',
  key: 'animate',
  current: true
}

```
*Output im Codeblock:* animate: true
### Schieberegler (slider)
Erzeugt einen Slider mit definierten Min/Max-Grenzen und Schrittweiten.
```typescript
{
  type: 'slider',
  prompt: 'Animationsgeschwindigkeit',
  key: 'speed',
  current: 1,
  from: 0,
  to: 5,
  step: 0.5
}

```
*Output im Codeblock:* speed: 2.5
### Texteingabe (string)
Erzeugt ein einfaches Textfeld, optional validiert über eine Regex.
```typescript
{
  type: 'string',
  prompt: 'Algorithmus Sequenz',
  key: 'moves',
  current: "R U R' U'",
  validationPattern: /^[RULDFBMSXYZrudfbmsxyz01234567' ]+$/
}

```
*Output im Codeblock:* moves: R U R' U'
### Einfaches Dropdown (dropdown)
Erzeugt ein Standard-Dropdown-Auswahlmenü aus einer Liste von Strings.
```typescript
{
  type: 'dropdown',
  prompt: 'Ansicht',
  key: 'view',
  current: '2D',
  dropdownOptions: ['2D', '3D', 'Sticker-only']
}

```
*Output im Codeblock:* view: 3D
### Dynamisches Dropdown-Paar (conditional)
Erzeugt zwei verknüpfte Dropdowns. Das Auswählen einer Option im ersten Dropdown (Hauptgruppe) tauscht dynamisch die verfügbaren Optionen im zweiten Dropdown aus.
```typescript
{
  type: 'conditional',
  prompt: 'Kategorie wählen',
  key: 'id',
  subPrompt: '.. und Fall auswählen',
  nestedInput: [
    { key: "OLL", dropdownOptions: ['OLL 1', 'OLL 2'] },
    { key: "PLL", dropdownOptions: ['Aa-Perm', 'Ua-Perm'] }
  ]
}

```
### Multi-Auswahl Dropdown (dropdownMulti)
Erzeugt ein Dropdown, bei dem mehrere Werte hintereinander ausgewählt werden können. Die Werte werden verkettet dargestellt.
```typescript
{
  type: 'dropdownMulti',
  prompt: 'Spezialeinstellungen',
  key: 'flags',
  current: 'default',
  resetOnCurrent: true,
  dropdownOptions: ['mirror', 'inverse', 'transparent']
}

```
*Output im Codeblock:* flags: mirror,inverse
### Ausklappbare Gruppen (expandable)
Gruppiert mehrere Selektoren optisch in einem animierten Akkordeon-Container (z.B. für "Erweiterte Einstellungen"), um das Modal übersichtlich zu halten.
```typescript
{
  type: 'expandable',
  prompt: 'Erweiterte Grafikoptionen',
  nestedInput: [
    { type: 'color', prompt: 'Pfeilfarbe', key: 'arrowColor', current: '#ff0000' },
    { type: 'boolean', prompt: 'Schattierung', key: 'shadows', current: false }
  ]
}

```
## Geplante Features & Roadmap
 * [ ] **Custom Trennzeichen (separator):** standardmäßig werden Key und Value im Codeblock mit einem Doppelpunkt getrennt (key: value). Es wird ein optionaler Parameter separator auf Formular- oder Feldebene eingeführt, um beispielsweise Zuweisungen per Gleichheitszeichen (key=value) oder Whitespace zu erlauben.
 * [ ] **Zustandsbasiertes Reset (resetOnCurrent):** Verfeinerung des automatischen Ausblendens von Werten im Codeblock, wenn sie dem definierten Standardwert entsprechen.
