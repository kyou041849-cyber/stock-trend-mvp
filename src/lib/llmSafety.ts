export const FORBIDDEN_LLM_PHRASES = [
  "買う" + "べき",
  "売る" + "べき",
  "必ず" + "上がる",
  "儲" + "かる",
  "テンバガー" + "確実",
  "元本" + "保証",
  "今すぐ" + "買い",
  "損切り" + "すべき",
];

export function findForbiddenLlmPhrases(content: string): string[] {
  return FORBIDDEN_LLM_PHRASES.filter((phrase) => content.includes(phrase));
}

export function containsForbiddenLlmPhrase(content: string): boolean {
  return findForbiddenLlmPhrases(content).length > 0;
}

export function replaceForbiddenLlmPhrases(content: string): string {
  return FORBIDDEN_LLM_PHRASES.reduce(
    (current, phrase) => current.replaceAll(phrase, "追加確認が必要"),
    content,
  );
}
