```
npm install
npm run dev
npm run build
```

```
open http://localhost:3000
```

## package
```bash
npm run build
ncc build dist/index.js -o bundle
```

## 安装 nodejs

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
```

## 执行

```bash
curl -L 'localhost:3000/process' \
-H 'Content-Type: application/json' \
-d '{
    "path": "/Users/weiwang/Downloads/template.xlsx"
}'
```