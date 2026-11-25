// Checks the style rules of the card bodies (CARD-10) in every language.
// Usage: npm run check:bodies [pack...]  (all packs of content/index.json with no argument)
// Prints `<card id> <lang> <issue,issue>` per failing body and exits 1, else `ok: N bodies`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizePack, SOURCE_LANG } from '#cards';
import { bodyIssues } from '#richtext';

const root = new URL('../', import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

// The bodies of a raw card by language, with null for a language the validator dropped.
const bodiesOf = (raw, card) => [
  [SOURCE_LANG, card ? card.body : null],
  ...Object.keys(raw?.translations ?? {}).map((lang) => [lang, card?.translations?.[lang]?.body ?? null]),
];

// { lines, count }: one line per failing body of the raw packs, and the number of bodies checked.
export const bodyReport = (packs) => {
  const lines = [];
  let count = 0;
  for (const data of packs) {
    const { pack } = normalizePack(data);
    if (!pack) {
      lines.push(`${data?.id ?? '?'} - not a pack`);
      continue;
    }
    data.cards.forEach((raw, index) => {
      const id = typeof raw?.id === 'string' ? raw.id : `#${index}`;
      const card = pack.cards.find((kept) => kept.id === id);
      for (const [lang, body] of bodiesOf(raw, card)) {
        count += 1;
        const issues = body === null ? ['dropped'] : bodyIssues(body);
        if (issues.length) lines.push(`${id} ${lang} ${issues.join(',')}`);
      }
    });
  }
  return { lines, count };
};

const main = (args) => {
  const ids = args.length ? args : readJson('content/index.json').packs;
  const { lines, count } = bodyReport(ids.map((id) => readJson(`content/${id}.json`)));
  if (lines.length) {
    console.log(lines.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`ok: ${count} bodies`);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
