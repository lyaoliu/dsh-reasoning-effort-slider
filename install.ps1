# DSH Reasoning Effort Slider Plugin 安装脚本
# 请右键点击此脚本，选择"以管理员身份运行"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DSH Reasoning Effort Slider 插件安装程序" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 插件路径
$pluginPath = "C:\Users\LIULU\Desktop\dsh-reasoning-effort-slider"

# 检查插件目录是否存在
if (-not (Test-Path $pluginPath)) {
    Write-Host "错误：插件目录不存在：$pluginPath" -ForegroundColor Red
    exit 1
}

Write-Host "插件目录：$pluginPath" -ForegroundColor Green
Write-Host ""

# 检查 DSH CLI 是否存在
$dshPath = Get-Command dsh -ErrorAction SilentlyContinue
if (-not $dshPath) {
    Write-Host "错误：找不到 dsh 命令，请确保 DSH 已正确安装" -ForegroundColor Red
    exit 1
}

Write-Host "DSH 路径：$($dshPath.Source)" -ForegroundColor Green
Write-Host ""

# 显示当前安装的插件列表
Write-Host "当前已安装的插件：" -ForegroundColor Yellow
dsh plugin --profile web list 2>$null | Select-String -Pattern "reasoning" -ErrorAction SilentlyContinue
if (-not $?) {
    Write-Host "(无法获取插件列表)" -ForegroundColor Gray
}
Write-Host ""

# 询问用户是否继续
Write-Host "即将执行以下操作：" -ForegroundColor Cyan
Write-Host "1. 安装插件：dsh plugin --profile web add $pluginPath" -ForegroundColor White
Write-Host "2. 验证安装：dsh --profile web --dump-config" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "是否继续？(y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "安装已取消" -ForegroundColor Yellow
    exit 0
}

# 执行安装
Write-Host ""
Write-Host "正在安装插件..." -ForegroundColor Green
dsh plugin --profile web add $pluginPath 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "插件安装成功！" -ForegroundColor Green
} else {
    Write-Host "插件安装失败，错误代码：$LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
    Write-Host "尝试手动安装..." -ForegroundColor Yellow
    
    # 手动添加配置
    $configPath = "$env:USERPROFILE\.dsh\cordis.patch.yml"
    Write-Host "配置文件路径：$configPath" -ForegroundColor Gray
    
    if (Test-Path $configPath) {
        $configContent = Get-Content $configPath -Raw
        if ($configContent -notmatch 'reasoning-effort-slider') {
            Write-Host "正在更新配置文件..." -ForegroundColor Green
            $newConfig = @"
# dsh-reasoning-effort-slider bundle patch
- insert:
    - id: reasoning-effort-slider
      name: 'dsh-reasoning-effort-slider'
"@
            Set-Content -Path $configPath -Value $newConfig -Encoding UTF8
            Write-Host "配置文件已更新" -ForegroundColor Green
        } else {
            Write-Host "配置文件已包含该插件" -ForegroundColor Gray
        }
    } else {
        Write-Host "错误：找不到配置文件 $configPath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "安装完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Yellow
Write-Host "1. 重启 DSH Web Host" -ForegroundColor White
Write-Host "2. 打开 DSH Web GUI (http://127.0.0.1:64241)" -ForegroundColor White
Write-Host "3. 在输入框下方应该能看到推理强度滑块" -ForegroundColor White
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
