export const validMarkdownFixture = `
# H1

## Feature Set

Paragraph with *emphasis*, **strong emphasis**, \`inline code\`, [safe link](https://example.com), ![safe image](/provisional_ogp_image.png), <https://example.com>, and a hard break.  
Next line.

---

> Quoted **Markdown**.

- [x] Done
- [ ] Todo
- Bullet item

1. Ordered item
2. Second item

| Name | Value |
| --- | --- |
| table | supported |

~~strikethrough~~

    indented code

~~~ts
console.log("nested code block");
~~~
`;

export const calloutMarkdownFixture = `
:::note
Note body
:::

:::tip
Tip body
:::

:::info[Supported Markdown]
- **bold**
- \`inline code\`
- [link](https://example.com)
~~~ts
console.log("nested code block");
~~~
:::

:::warning[Production caution]
This changes production data.
:::

:::danger
Danger body
:::
`;

export const malformedMarkdownFixture = `
Paragraph with [broken link](https://example.com

:::info[Missing close]
- nested item

\`\`\`ts
unterminated code block
`;

export const unsafeMarkdownFixture = `
<strong>raw html must stay inert</strong>

[bad link](javascript:alert(1))

![bad image](javascript:alert(1))
`;
