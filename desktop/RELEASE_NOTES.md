# DoiProof Prüfer 0.6.0 für Windows

Portable Windows-Anwendung zur Prüfung exportierter DoiProof-ZIP-Beweispakete (Manifest v1/v2).

- Ohne Installation: `DoiProof-Pruefer-0.6.0-Windows.exe` herunterladen und starten.
- Offline: CRC, Bildbytes, kanonisches Manifest und gemeinsamen SHA-256-Paket-Hash prüfen.
- Optional online: Doichain-Transaktion und vorhandene BTC-/DOI-Vorabblöcke über die angegebenen Dienste abfragen.
- Bericht als Markdown oder JSON speichern; Hash aus der Oberfläche kopieren.
- Nach ausdrücklichem Einblenden: Originalfoto vergrößern und sämtliche Manifest- und Exportstatusangaben lesen, einschließlich vorhandener GPS-, Geräte- und Bilddaten.
- Standortkoordinaten bleiben zunächst lokal. Eine OpenStreetMap-Karte wird erst nach einem weiteren Klick geladen; der Kartendienst kann dabei ungefähr den Standort und die IP-Adresse erkennen. Kartenkacheln werden für mindestens sieben Tage zwischengespeichert.
- Das ZIP und sein Foto werden nicht hochgeladen. Online werden Paket- und Block-Hashes abgefragt.
- Kein qualifizierter Zeitstempel und keine Attestierung der mobilen App oder des Motivs.
- Die Onlineabfrage nutzt den Doichain-MCP-Dienst, den auch die App verwendet, und Blockstream. Für eine unabhängige Kettenprüfung eigene Nodes verwenden.

Der Windows-Build ist derzeit **nicht mit einem Code-Signing-Zertifikat signiert**. Windows SmartScreen kann daher eine Warnung anzeigen. Vergleiche die SHA-256-Summe der EXE mit der im Release veröffentlichten `SHA256SUMS.txt` und beziehe sie aus diesem privaten GitHub-Repository.
