let cachedApiBase;

export async function getApiBase(context) {
  if (cachedApiBase) return cachedApiBase;

  const configUrl = new URL("/js/api-config.js", context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(configUrl));
  if (!response.ok) throw new Error("Unable to load API configuration");

  const source = await response.text();
  const match = source.match(/window\.API_BASE\s*=\s*["'](https?:\/\/[^"']+)["']/);
  if (!match) throw new Error("API_BASE is missing from js/api-config.js");

  cachedApiBase = match[1].replace(/\/$/, "");
  return cachedApiBase;
}
