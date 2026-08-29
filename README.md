# dsh-reasoning-effort-slider

DSH 推理强度滑块插件，支持 7 档调节，带有鲸落妈妈皮肤和 chibi 小人动画。

## 功能

- **7 档滑块**: off / minimal / low / medium / high / xhigh / max
- **鲸落妈妈皮肤**: 全局配色 + 滑块辐射光效
- **chibi 小人**: 根据当前档位切换动画帧
- **自动声明**: 未配置的模型拖滑块时自动写入 settings.yaml（无需重启）
- **自愈机制**: 服务器拒绝非法档位时，自动从报错中解析合法列表并重写配置
- **知识库**: 内置模型档位映射，含 wire 值转换（off→none 等）
- **兼容性自动修复**: pi-ai 模型自动写入 `supportsDeveloperRole: false`
- **宿主日志**: 声明/自愈失败时输出警告日志

## 安装

```powershell
dsh plugin --profile web add github:lyaoliu/dsh-reasoning-effort-slider#main
dsh --profile web --dump-config
```

重启 DSH Web Host 后生效。

## 配置

在 `~/.dsh/settings.yaml` 中：

```yaml
dsh-reasoning-effort:
  enabled: true
  visualEffect: radiation  # radiation | particles | gradient
```

## 工作原理

1. 用户拖动滑块 → 插件检测该模型是否已有 `reasoningEfforts` 配置
2. 若无 → 自动写入默认七档 + `compat.supportsDeveloperRole: false` 到 settings.yaml
3. settings.yaml 热监听自动生效，滑块立即刷新
4. 发送消息时服务器若拒绝档位 → turn-error 节点触发自愈：解析合法列表 → 重写配置 → 自动切到最近支持档

## 许可证

MIT
