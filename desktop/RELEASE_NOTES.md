# DoiProof Prüfer 0.5.0 für Windows

Portable Windows-Anwendung zur Prüfung exportierter DoiProof-ZIP-Beweispakete (Manifest v1/v2).

- Ohne Installation: `DoiProof-Pruefer-0.5.0-Windows.exe` herunterladen und starten.
- Offline: CRC, Bildbytes, kanonisches Manifest und gemeinsamen SHA-256-Paket-Hash prüfen.
- Optional online: Doichain-Transaktion und vorhandene BTC-/DOI-Vorabblöcke über die angegebenen Dienste abfragen.
- Bericht als Markdown oder JSON speichern; Hash aus der Oberfläche kopieren.
- Das ZIP und sein Foto werden nicht hochgeladen. Online werden Paket- und Block-Hashes abgefragt.
- Kein qualifizierter Zeitstempel und keine Attestierung der mobilen App oder des Motivs.
- Die Onlineabfrage nutzt den Doichain-MCP-Dienst, den auch die App verwendet, und Blockstream. Für eine unabhängige Kettenprüfung eigene Nodes verwenden.

Der Windows-Build ist derzeit **nicht mit einem Code-Signing-Zertifikat signiert**. Windows SmartScreen kann daher eine Warnung anzeigen. Vergleiche die SHA-256-Summe der EXE mit der im Release veröffentlichten `SHA256SUMS.txt` und beziehe sie aus diesem privaten GitHub-Repository.
