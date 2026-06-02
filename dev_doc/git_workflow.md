# 项目 Git 仓库管理说明

## 仓库配置

本项目基于 [LobsterAI](https://github.com/netease-youdao/LobsterAI.git) 进行二次开发，采用双远程仓库策略：

| 远程名称 | 仓库地址 | 说明 |
|---------|---------|------|
| `origin` | `https://codeup.aliyun.com/66f3de5e691d6fdafb3cd1de/ai/ypaction.git` | 正式仓库（阿里云 CodeUp） |
| `upstream` | `https://github.com/netease-youdao/LobsterAI.git` | 上游开源仓库（GitHub） |

## 日常开发流程

### 1. 拉取最新代码

```bash
git pull origin main
```

### 2. 提交二次开发代码

```bash
git add .
git commit -m "feat: 描述你的修改"
git push origin main
```

## 合并上游（LobsterAI）更新

当上游开源仓库有新版本发布，需要合并到正式项目时，按以下步骤操作：

### 方式一：合并（Merge，推荐）

这种方式会保留完整的提交历史，合并后形成一个新的合并提交：

```bash
# 1. 确保当前在 main 分支，且工作区干净
git checkout main
git status

# 2. 拉取上游仓库最新代码
git fetch upstream

# 3. 合并上游 main 分支（不直接覆盖，通过 merge 策略处理冲突）
git merge upstream/main

# 4. 如有冲突，手动解决冲突
# 查看冲突文件
git status

# 逐个解决冲突后标记为已解决
git add <冲突文件>

# 5. 完成合并
git commit -m "merge: 合并上游 LobsterAI 最新更新"

# 6. 推送到正式仓库
git push origin main
```

### 方式二：变基（Rebase，适合保持线性历史）

如果你希望保持提交历史的线性，可以使用 rebase：

```bash
# 1. 拉取上游最新代码
git fetch upstream

# 2. 变基到上游 main 分支
git rebase upstream/main

# 3. 如有冲突，逐个解决后继续
git add <冲突文件>
git rebase --continue

# 4. 强制推送（注意：rebase 后需要强制推送）
git push --force-with-lease origin main
```

> ⚠️ `--force-with-lease` 比 `--force` 更安全，它会检查远程分支是否被其他人更新过。

## 冲突处理策略

### 基本原则

- **二次开发的代码优先保留**：解决冲突时，优先保留正式项目中二次开发的部分
- **上游新增功能合理合并**：上游新增的不冲突功能、Bug 修复应合并进来
- **逐文件审查**：不要批量接受某一方的修改，逐文件审查差异

### 冲突识别

使用 VS Code 内置的合并编辑器或以下命令查看差异：

```bash
# 查看与上游的差异
git diff upstream/main

# 查看某个文件的差异
git diff upstream/main -- <文件路径>
```

### 冲突预防建议

1. **模块化二次开发**：尽量将二次开发的功能放在独立的目录或模块中，减少与上游代码的直接冲突
2. **配置文件分离**：将自定义配置放在独立的配置文件中，不要直接修改上游的默认配置
3. **定期同步**：定期（建议每月）同步一次上游更新，避免长时间不同步导致大量冲突
4. **使用分支策略**：
   ```bash
   # 大型功能开发使用独立分支
   git checkout -b feature/xxx
   # 开发完成后合并回 main
   git checkout main
   git merge feature/xxx
   ```

## 完整工作流示例

```bash
# === 日常开发 ===
git pull origin main           # 拉取正式仓库最新代码
# ... 进行二次开发 ...
git add .
git commit -m "feat: 新增xxx功能"
git push origin main

# === 同步上游更新 ===
git fetch upstream             # 拉取上游最新代码
git merge upstream/main        # 合并上游更新
# ... 解决冲突（如果有）...
git push origin main           # 推送到正式仓库
```

## 注意事项

1. **不要直接推送到 upstream**：`upstream` 是只读的上游仓库，所有修改应推送到 `origin`
2. **合并前先提交**：合并上游前，确保本地所有修改已提交或暂存（`git stash`）
3. **备份重要修改**：大型合并前，建议先在独立分支上测试合并效果
4. **保留上游 Tag**：合并上游时，上游的 tag 可以拉取下来作为版本标记
   ```bash
   git fetch upstream --tags
   ```

## 当前状态速查

```bash
# 查看远程仓库配置
git remote -v

# 查看所有分支
git branch -a

# 查看与上游的差异
git log upstream/main..main --oneline
```
