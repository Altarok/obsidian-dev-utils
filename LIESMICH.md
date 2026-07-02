Dieses Repository enthält nützliche Code Snippets zum Entwickeln von Plugins für Obsidian. 

# MOC

- **Code Block Creator**
- ... more to come 
# Code Block Creator
Ein beliebig konfigurierbares Popup ("Modal" in Obsidiansprache) welches Usern erlaubt mehrere Code Blocks in schneller Abfolge zu erstellen. 

Alle nötigen Konfigurationen und gewünschten Outputs werden vom nutzenden Plugin definiert, nicht unähnlich zu Obsidians Settings Popups.


> [!NOTE] 
> Farbauswahl
> 
> Input:
> ```typescript
>    type: 'color' // fixer Wert
>    prompt: 'Hintergrundfarbe' // Beispiel
>    key: 'bgColor' // Key für Codeblock 
>    current: '#bada55' // Startwert für Farbauswahl. Im Codeblock wird später stehen: `bgColor: #bada55`
>    ignoreKeyInCodeBlock: true | false // Optional! False wenn nicht angegeben. True würde das obige Beispiel ändern zu: `#bada55` (ohne `bgColor: `)
>   tooltip: 'Ändert Hintergrundfarbe' // Beispiel. Optional! Wird angezeigt wenn Maus über Reset-Button liegt
> ```
> 