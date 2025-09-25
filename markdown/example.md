# Vditor 示例文件

這是一個示例 Markdown 文件，用於測試 Vditor 的功能。

## 功能列表

- 所見即所得編輯
- 即時渲染
- 分屏預覽
- 支援各種 Markdown 語法

## 代碼示例

```javascript
const vditor = new Vditor("vditor", {
    height: 360,
    mode: "wysiwyg"
});
```

## 表格示例

| 功能 | 描述 |
| --- | --- |
| 所見即所得 | 類似傳統編輯器的編輯方式 |
| 即時渲染 | 類似 Typora 的編輯方式 |
| 分屏預覽 | 傳統的 Markdown 編輯方式 |

## 數學公式

行內公式：$E=mc^2$

區塊公式：

$$
\frac{d}{dx}\left( \int_{a}^{x} f(u)\,du\right)=f(x)
$$

## 圖表

```mermaid
graph TD
    A[開始] --> B{是否已安裝}
    B -->|是| C[運行]
    B -->|否| D[安裝]
    D --> C
    C --> E[結束]
```

希望這個示例文件能幫助您測試 Vditor 的各種功能！
