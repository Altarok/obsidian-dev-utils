# obsidian-dev-utils

Dieses Repository enthält nützliche Code Snippets zum Entwickeln von Plugins für Obsidian.

> [!NOTE]
> Alle Use-Cases wurden aus Eigeninteresse erstellt, Feedback und Vorschläge sind willkommen.

# MOC (Table of Contents)
- Code Block Creator
- ... *more to come*
# Code Block Creator für Obsidian
Ein abstrahiertes UI-Formular-Framework (`GenericModal`) für Obsidian-Plugins, das die Erstellung komplexer Codeblöcke in schneller Abfolge ermöglicht.
Das System spiegelt das Verhalten der nativen Obsidian-Settings in groben Zügen wider.

Codeblöcke können natürlich leer gelassen werden. Darüber hinaus wird hier davon ausgegangen, ..
* dass jede Zeile aus einem Key-Value-Paar besteht.
* dass es für jedes Paar einen Standard-Wert gibt, welcher im Codeblock nicht explizit angezeigt werden muss.

Dem Code Block Creator wird hierfür ein editierbarer `Record<string, string | number | boolean | undefined>` mitgegeben, welchen selbiger mit den Eingaben des Nutzers befüllt.
Die Keys des Records gleichen hier den Keys des Codeblocks.

## Architektur & Datenfluss

Der `GenericModal` erwartet eine Konfiguration vom Typ `GenericModalInput` und ein HTMLElement vom Obsidian-Typ Modal.
Letzteres wird von ihm befüllt. Das `GenericModalInput` Objekt enthält die folgenden Daten:
```typescript
type GenericModalInput = {
  title?: string                                        // Ein optionaler Titel für das Modal. Könnte noch entfernt werden
  pluginName: string                                    // Der Plugin Name. Wird in eckigen Klammern im Titel angezeigt
  codeBlockId: string                                   // Die ID des Codeblocks. Wird nach tripe-backticks genutzt
  mandatory: readonly MandatoryInput[]                  // Erforderlicher Input, ohne welchen der Codeblock nicht gerendert werden kann
  optional: readonly OptionalInput[]                    // Optionaler Input 
  onUpdatePreview?: (previewEl: HTMLDivElement) => void // Optionale Callback Funktion welche im Plugin genutzt werden kann um den Codeblock live zu rendern
  output: Record<string, OutputData>                    // Konstant aktualisierter Output für den Callback und den Codeblock
}
```

* **Zustandsbasiert:** Die UI-Komponenten binden sich direkt an den übergebenen `output: Record<string, OutputData>`.
* **Change-Evaluation:** Jede Nutzerinteraktion triggert den internen `write()`- bzw. `revert()`-Zyklus, aktualisiert den Daten-Record und feuert das `onUpdatePreview`-Callback.
* **Filter-Logik:** Properties werden *nur* in den finalen Codeblock serialisiert, wenn ihr aktueller Wert vom definierten `current` (Default-Wert) abweicht oder nicht `undefined`/`''` ist.

---

## API & Input-Konfiguration

Alle Selektoren erben von der Basisklasse `Selector` und konfigurieren eine native Obsidian `Setting`-Instanz über die `.draw()` Methode.

### Basistyp: `BaseInput`
Basis für die folgenden (7) Input Typen.
```typescript
type BaseInput = {
  type: 'boolean' | 'color' | 'string' | 'slider' | 'dropdown' | 'conditional' | 'dropdownMulti' | 'expandable' 
  prompt: string                  // UI-Label text
  key: string                     // Serialisierungsschlüssel & Record-Key
  current?: OutputData            // Default- & Initialwert
  ignoreKeyInCodeBlock?: boolean  // Verhindert das Schreiben des Prefixes 'key:'
  tooltip?: string                // Tooltip für den Reset-Button
}
```

## Typen-Referenz
### 1. Boolean 
Rendert eine native ToggleComponent.
```typescript
{
  type: 'boolean',
  prompt: 'Animation aktivieren',
  key: 'animate',
  current: false
}
```
- **Output im Codeblock**: `animate: true`
- **Verhalten**: Wenn der Schalter auf true gesetzt wird (Abweichung von current), serialisiert der Codeblock `animate: true`. Schaltet der User zurück auf false, greift die revert()-Logik, der Key fliegt aus dem Output-Record und die Zeile verschwindet.

### 2. Farbauswahl (ColorComponent)
Erzeugt einen nativen Farbpicker.
```typescript
{
  type: 'color',
  prompt: 'Hintergrundfarbe',
  key: 'bgColor',
  current: '#bada55',
}
```
- **Output im Codeblock**: `bgColor: #bada55`

### 3. Texteingabe
Rendert eine native TextComponent, optional validiert über eine Regex.
```typeScript
{
  type: 'string',
    prompt: 'Ausschlusskriterien (Glob Pattern)',
    key: 'excludePattern',
    current: 'node_modules/**',
    validationPattern: /^[a-zA-Z0-9_.\/*\-]+$/   // Optional
}
```
- **Validierung**: Der interne write()-Zyklus prüft den String bei jedem Tastenanschlag via validationPattern.test(value). Schlägt der Test fehl, wird der Wert blockiert, nicht in den output-Record übernommen und das Live-Preview bleibt auf dem letzten validen Stand eingefroren.
- **Output im Codeblock**: `excludePattern: src//*.test.ts`

### 4. Schieberegler (Slider)
Erzeugt einen Slider mit definierten Min/Max-Grenzen und Schrittweiten.
Werte werden intern validiert und notfalls angepasst.
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
- **Output im Codeblock**: `speed: 2.5`

### 5. Einfacher Dropdown
Erzeugt ein Standard-Dropdown-Auswahlmenü aus einer Liste von Strings.
```typescript
{
  type: 'dropdown',
  prompt: 'Ansicht',
  key: 'view',
  current: '2D',
  dropdownOptions: ['2D', '3D']
}
```
- **Output im Codeblock**: `view: 3D`

### 6. ConditionalInput (Kaskadierende Dropdowns)
Verknüpft zwei DropdownComponent-Instanzen über einen internen reaktiven onChange-Listener.
Das Auswählen einer Option im ersten Dropdown (Hauptgruppe) tauscht dynamisch die verfügbaren Optionen im zweiten Dropdown aus.
```typeScript
{
  type: 'conditional',
  prompt: 'Fahrzeugtyp ..',
  key: 'vehicle',
  subPrompt: '.. und Modell auswählen',
  nestedInput: [
    { key: "Auto", dropdownOptions: ['Ford Mustang', 'Toyota Corolla'] },
    { key: "Motorrad", dropdownOptions: ['Harley-Davidson Fat Boy', 'Vespa'] }
  ]
}
```
- **Output im Codeblock**: `vehicle: Vespa`
- **DOM-Handling**: Bei Änderung des primären Dropdowns wird das sekundäre Element via selectEl.empty() geleert und die Datenstruktur über addOptions() deterministisch neu aufgebaut.

### 7. DropdownMultiInput
Ermöglicht Multi-Selection über ein einzelnes Dropdown. Gewählte Werte werden in einem internen Array gehalten und kommagetrennter geschrieben.
```typeScript
{
  type: 'dropdownMulti',
  prompt: 'Spezialeinstellungen',
  key: 'flags',
  current: 'default',
  resetOnCurrent: true,
  dropdownOptions: ['default', 'mirror', 'inverse', 'transparent']
}
````
- **Output im Codeblock**: `flags: mirror,inverse`

### 8. Expandable Input (Layout-Gruppe)
Kapselt eine Liste von anderen Elementen innerhalb einer kollabierbaren Gruppe.

```typeScript
{
  type: 'expandable',
  prompt: 'Erweiterte Grafikoptionen',
  nestedInput: [
    { type: 'color', prompt: 'Schriftfarbe', key: 'fontColor', current: '#000000' },
    { type: 'color', prompt: 'Hintergrundfarbe', key: 'bgColor', current: '#ffffff' },
    { type: 'boolean', prompt: 'Schattierung', key: 'shadows', current: false }
  ]
}
```
- **UX / Mobile Optimierung**: Das Modal erzwingt ein Akkordeon-Verhalten über `collapseOtherExpandableSelectors()`. Das Öffnen einer Gruppe schließt alle anderen parallel geöffneten Instanzen, um UI-Overflows auf mobilen Obsidian-Clients (iOS/Android Viewports) zu verhindern.

## Geplante Features & Roadmap
- [ ] **Custom Trennzeichen (separator):** Standardmäßig werden Key und Value im Codeblock mit einem Doppelpunkt getrennt (`key: value`). Es wird ein optionaler Parameter separator auf Formular- oder Feldebene eingeführt, um beispielsweise Zuweisungen per Gleichheitszeichen (`key=value`) oder Whitespace zu erlauben.
- [ ] **Zustandsbasiertes Reset (resetOnCurrent):** Verfeinerung des automatischen Ausblendens von Werten im Codeblock, wenn sie dem vordefinierten Standardwert entsprechen.
- [ ] **Ausklappbare Gruppen erweitern**: Option anbieten eine ausklappbare Gruppe zu Beginn direkt zu öffnen.-
- [ ] **Native Picker für Auswahl-Inputs (`date` / `path` / `file`):**
  * **Date Picker:** Integration einer nativen Datumsauswahl zur Rückgabe sauberer ISO-Strings, um Format- und Validierungsfehler über Regex-Textfelder zu verhindern.
  * **Path Picker:** Implementierung einer Ordnerpfad-Auswahl, die sich an Obsidians interne Autovervollständigung anhängt, damit Pfadangaben fehlerfrei erfasst werden können.
  * **File Picker:** Bereitstellung eines Datei-Autokomplettierungs-Feldes auf Basis von Obsidians `AbstractInputSuggest`-API, um interne Vault-Links direkt in die Codeblock-Parameter zu übergeben.
