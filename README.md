# dsh-reasoning-effort-slider

DSH 推理强度滑块插件，支持 7 档调节（off/minimal/low/medium/high/xhigh/max），带有炫酷的视觉效果。

## 功能

- **7 档滑块**: off / minimal / low / medium / high / xhigh / max
- **炫酷视觉效果**: 辐射光效、粒子系统、渐变填充
- **自动适配**: 读取模型目录中的 reasoning.efforts 声明
- **可配置**: 自定义档位名称和视觉效果
- **设置面板**: 启用/禁用开关，视觉效果选择

## 安装

```powershell
dsh plugin --profile web add github:<user>/dsh-reasoning-effort-slider#main
dsh --profile web --dump-config
```

重启 DSH Web Host 后生效。

## 配置

在 `~/.dsh/settings.yaml` 中：

```yaml
dsh-reasoning-effort:
  levels:
    - id: off
      name: 关闭
    - id: minimal
      name: 极低
    - id: low
      name: 低
    - id: medium
      name: 中
    - id: high
      name: 高
    - id: xhigh
      name: 极高
    - id: max
      name: 最大
  visualEffect: radiation  # radiation | particles | gradient
```

## 许可证

MIT
