Dieses Repository enthält nützliche Code Snippets zum Entwickeln von Plugins für Obsidian. 

# MOC

- **Code Block Creator**
- ... more to come 
# Code Block Creator
Ein beliebig konfigurierbares Popup ("Modal" in Obsidiansprache) welches Usern erlaubt mehrere Code Blocks in schneller Abfolge zu erstellen. 

Alle nötigen Konfigurationen und gewünschten Outputs werden vom nutzenden Plugin definiert, nicht unähnlich zu Obsidians Settings Popups.

Codeblöcke können natürlich leer gelassen werden. Darüber hinaus wird hier davon ausgegangen, dass jede Zeile aus einem Key-Value-Paar besteht. 

Dem Code Block Creator word hierfür ein editierbarer `Record<string, string | number | boolean | undefined>` mitgegeben welche selbiger mit den Eingaben des Nutzers befüllt.
Die Keys des `Record` gleichen hier den Keys des Codeblocks.

> [!INFO]
> Es mitzugeben dient dem Aufrufer konstant auf den Output zugreifen zu können. Auf Basis dessen kann eine Callback Funktion erstellt werden welche den momentanen Stand jederzeit in ein live Preview verwandeln kann.

Dieses Code Snippet soll dabei helfen diese zu befüllen. Fertige Codeblöcke können im Popup in die Zwischenablage kopiert oder direkt in die gerade offene Datei geschrieben werden. Vorraussetzung hierfür ist, dass es sich um eine Markdown Datei handelt welche gerade editierbar ist.


> [!NOTE] 
> Farbauswahl
> 
> Input:
> ```typescript
>   type: 'color' // fixer Wert
>   prompt: 'Hintergrundfarbe' // Beispiel
>   key: 'bgColor' // Key für Codeblock 
>   current: '#bada55' // Startwert für Farbauswahl. Im Codeblock wird später stehen: `bgColor: #bada55`
>   ignoreKeyInCodeBlock: true | false // Optional! False wenn nicht angegeben. True würde das obige Beispiel ändern zu: `#bada55` (ohne `bgColor: `)
>   tooltip: 'Ändert Hintergrundfarbe' // Beispiel. Optional! Wird angezeigt wenn Maus über Reset-Button liegt
> ```
> 