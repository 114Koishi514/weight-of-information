# The Weight of Information · 信息的重量

黑白像素风格的 1920 × 1080 横屏实验网页。输入或说话后，查看数据量、食物与灯照能量参照，并生成热敏小票。

- 网页源文件：`docs/`，通过 GitHub Pages 的 `main` 分支 `/docs` 目录发布。
- [下载 Windows 自动打印启动包](docs/downloads/Information_Station_Windows.zip?raw=true)：解压后运行 `START_STATION.cmd`，选择 NETUM 打印机，使用自动打开的本地网页。
- 在线网页的“测试打印”和每次交换都会打开小票打印窗口。选择 NETUM、58 mm 纸张、纵向、100% 缩放，关闭页眉页脚后确认打印。
- 无需确认窗口的自动出纸仍通过 Windows 本地启动包完成。


A browser-local experiment for typed or spoken messages, with a separate Windows automatic receipt station. English UI with a Chinese toggle. No server-side participant database or analytics.

The exhibition interface uses a fixed 1920 × 1080 landscape canvas, scaled uniformly to the available viewport. Input, speech controls and settlement actions stay within that canvas. Long message quotes and receipt previews scroll inside their own panels. Physical receipts remain 384 dots wide; the screen scaling never affects printer output. Use browser fullscreen for a 1920 × 1080 monitor.

## Web

Buildless `docs/`: input → modelled result → canvas receipt. Typed text is measured as UTF-8 bytes; speech uses the browser Web Speech API and is confirmed as editable text. Speech support, microphone access and recognition service availability depend on the user's browser and network. The site never claims that modelled energy is actual per-message electricity.

`npm test` covers multilingual measurement, empty/overlength input, reference conversions, material rounding and ESC/POS raster bit order. `npm run check` checks JavaScript syntax. Native browser QA covers submission, English/Chinese UI, receipt previews, setup and input validation.

## Windows station

Source is in `station/`. Run `node build-station.mjs` after frontend changes to produce `docs/downloads/Information_Station_Windows.zip`.

The user extracts the ZIP, runs `START_STATION.cmd`, and chooses the physical printer queue. Windows PowerShell compiles `Station.cs` with installed .NET Framework assemblies. The station serves the same frontend on **127.0.0.1:8765 only**, authenticates print requests with a session token, rejects cross-origin requests, and sends 384-dot monochrome GS v 0 raster data to the Windows RAW spooler. All local resources are bundled, including the OFL-licensed Silkscreen font.

The online site prints a separate 48 mm receipt canvas on 58 mm paper through `window.print()`. TEST PRINT opens a test receipt, and each submitted exchange automatically opens its own receipt. The user selects the installed NETUM printer and confirms the system dialog. Ctrl+P also prepares the current full receipt, outside the scaled landscape interface. Closing or cancelling the dialog never marks a job as printed. The browser cannot confirm physical paper output or choose a printer silently.

The local Windows page retains silent automatic printing. It does not expose the printer to the online site or other origins. The only print control is TEST PRINT. Each submitted exchange queues its receipt automatically. Retries use a persistent idempotency ledger containing job ID/hash/state only. Ambiguous printer acknowledgement prevents blind retries; queue acceptance never claims physical paper output.

Physical output and native Windows execution cannot be verified in the Linux development environment. The first real-device check is TEST PRINT. The printer must already work from Windows. Nothing installs as a service, changes system-wide execution policy or requires Python/Node on the user's computer.

## Experimental assumptions

- Network-only attribution: 0.059 kWh/GB from SWDM v4, decimal GB, payload only. Excludes overhead, data centres, end-user devices, storage, speech and printing.
- Cooked basmati rice reference: 529 kJ/100g (Sainsbury's label). Lamp: defined 5W electrical load. Same energy in two units; no equivalence of environmental footprints or useful work.
- Provisional material rule: 20 bytes per paper unit, rounded up. Adjustable locally. The researcher defines the physical unit before the session. This is not an energy-to-material conservation law.
- The input text is neither sent to a recipient nor saved to a server. Speech recognition may use the browser vendor's online service. Unsent print jobs remain only in page memory.

References are linked in the on-site Method dialog and the bundled bilingual readme.
