export function buildImportDescriptionTemplate(
  sourceTitle: string,
  sourceUrl: string,
): string {
  return `【原文標題】\n${sourceTitle}\n\n【來源】\n${sourceUrl}\n\n（以下請貼上 Gemini 生成的商品說明）`;
}

export function buildSuggestedImportTitle(sourceTitle: string): string {
  return `【韓國代購】${sourceTitle}`;
}
