import { readSource } from "../src/server/sources";
const urls = process.argv.slice(2);
if (!urls.length)
  urls.push("https://www.cs.wisc.edu/research/research-groups/");
for (const url of urls) {
  try {
    const document = await readSource(url, new Set([new URL(url).hostname]));
    console.log(
      JSON.stringify({
        url: document.url,
        title: document.title,
        characters: document.text.length,
        links: document.links.length,
        checkedAt: document.checkedAt,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        url,
        error: error instanceof Error ? error.message : "Source failed",
      }),
    );
    process.exitCode = 1;
  }
}
