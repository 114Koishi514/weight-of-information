THE WEIGHT OF INFORMATION — WINDOWS STATION / V1

开始使用（Windows 11）
1. 连接 NETUM NT-1809，确认以前安装的驱动仍可打印 Windows 测试页。
2. 将整个 ZIP 解压到一个普通文件夹。不要直接在压缩包内运行。
3. 双击 START_STATION.cmd，在窗口中输入热敏打印机对应的编号。
4. 浏览器自动打开 http://127.0.0.1:8765/。建议使用新版 Chrome。
5. 网页右上角点击“测试打印 / TEST PRINT”。先确认文字、中文和两侧边距均正常。
6. 参与者打字或说话、确认文字、点击交换。结算后自动发送小票，无需打印对话框。
7. 保持启动窗口开启；关闭窗口即停止实验站。无需安装 Python 或 Node。

本地网页结算后直接自动打印，不弹确认窗口。
GitHub 线上网页也可以打印：点击“测试打印”或完成一次交换后，会打开系统打印窗口。
选择 NETUM 打印机、58 mm 纸张、纵向、100% 缩放，并关闭页眉页脚，然后点击打印。
如窗口没有出现，可按 Ctrl+P 打印当前小票。关闭或取消窗口不代表已经出纸。
本程序使用 Windows 自带 PowerShell 编译附带的 C# 代码，不会安装后台服务，也不会更改系统级执行策略。
如学校电脑阻止本地脚本，请联系设备管理员允许该实验程序；无需管理员权限的本地端口为 8765。

计算设定
- 只计算确认文字的 UTF-8 bytes，保留空格和换行；语音先转写为文字。
- 网络能量参照：SWDM v4 network allocation 0.059 kWh/GB（十进制 GB）。
- 这是按数据量平均分摊的模型，不代表发送此消息实际增加的电耗。
- 不包含应用额外流量、数据中心、设备、储存、语音识别或打印的能源。
- 熟米饭参照：熟印度香米每 100g 含 529 kJ。5W LED 灯每秒 5J。
- 两项为同一能量的对照，不能相加。小数值自动换为微克、毫秒等单位，不放大。
- 默认实验材料比例：20 bytes = 1 个纸材单位，向上取整。网页“实验设置”可调整。
- 请在现场用所选废纸定义 1 个纸材单位；这一比例是虚构规则，不是环境成本。
- 默认英文界面，右上角可切中文。小票标签为英文，参与者原文保持原样。

自动打印与排错
- “已发送至打印队列”说明 Windows 已收件；无法确认纸张已经实际输出。
- 没有出纸：检查电源、纸张朝向、USB 连接与 Windows 队列是否暂停。
- 乱码：确认选中的是支持 ESC/POS 的 NETUM 热敏队列，不是 PDF 或普通 A4 打印机。
- 图片命令使用 384 点宽的 GS v 0 黑白光栅，分段输出；需在你的实体打印机上完成首次校准。
- 无权限/无麦克风/语音服务不支持时，网页会提示，打字功能仍可使用。语音可能需要联网。
- 已提交的同一小票编号不会因网络重试重复打印。状态不明时程序停止重复提交，先检查实际出纸。
- 如打印确认不明，只在核实未出纸后重新做一次交换。不提供普通“打印小票”按钮。
- 未发送的小票只在当前网页内存保留，关闭网页即清除。每次测试打印使用独立 TEST 编号。
- station-state 文件夹仅存打印任务编号、摘要与队列状态，不保存文字或图像。
- 不要在实验进行中删除 station-state；它用于跨重启防止重复打印。

测试限制
网页、公式和小票光栅可以在开发环境检查；开发环境不能连接你的 Windows 打印机。
必须用 TEST PRINT 完成一次真实出纸检查，再开始参与者实验。

英文说明
Extract the whole package. Run START_STATION.cmd, choose the physical NETUM queue, and keep the console open.
Use the local page opened at http://127.0.0.1:8765/ in Chrome. TEST PRINT checks the paper and margins.
Each confirmed exchange submits one receipt automatically. There is no normal print button or print dialog.
The online GitHub page instead opens the system print dialog for each exchange or TEST PRINT.
Select NETUM, 58 mm paper, portrait and 100% scale; turn off headers and footers and confirm Print.
Ctrl+P prints the current complete receipt. Closing the print dialog does not confirm paper output.
Receipt labels are English; message text is retained in its original language.
The print service binds only to loopback and rejects cross-origin requests. It cannot be used remotely.

Sources
https://sustainablewebdesign.org/estimating-digital-emissions/
https://doi.org/10.1111/jiec.13512
https://www.sainsburys.co.uk/groceries/product/sainsburys-basmati-rice-so-organic-500g
https://learn.microsoft.com/en-us/windows/win32/printdocs/sending-data-directly-to-a-printer
https://www.netum.net/products/nt-1809-thermal-printer
