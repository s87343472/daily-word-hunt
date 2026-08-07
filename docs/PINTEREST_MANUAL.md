# Pinterest（个人账号 + 每天 1 张手动上传）

## 会不会 spam？

**不会。** 每天 **1 张原创 Pin** 是 Pinterest 常见健康节奏。

更像 spam 的是：一天上百张重复图、无意义批量、同一图刷很多 board。  
我们是「今日题一张 + 可点进站点」，没问题。

## 每天怎么发（3 分钟）

```bash
# 默认：美东「今天」的 daily 包
pnpm gen:pin

# 指定日期 / 系列
pnpm gen:pin -- --date 2026-08-07
pnpm gen:pin -- --pack nature --date 2026-08-07
```

输出（本地，默认不进 Git）：

- `out/pinterest/YYYY-MM-DD-daily.png` — 竖图 1000×1500  
- `out/pinterest/YYYY-MM-DD-daily.txt` — 标题 / 描述 / 链接  

然后：

1. 打开 [pinterest.com](https://www.pinterest.com/)（**个人账号即可**）  
2. **Create Pin** → 上传 PNG  
3. 把 `.txt` 里的 Title / Description / Link 粘贴进去  
4. 建议 Board：`Free Word Search` 或 `Daily Puzzles`

## 建议

- 固定每天同一时段发 1 张即可  
- 偶尔发 `/print` 打印向 Pin 也可以（改 link 或另做一张）  
- 有点击再考虑 Business / API 自动化  

无需 Business 账户。
