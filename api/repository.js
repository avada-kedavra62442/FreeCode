export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Use GET to import a public GitHub repository.");
  }

  const raw = typeof req.query?.url === "string" ? req.query.url.trim() : "";
  if (!raw || raw.length > 2048) return res.status(400).send("Enter a GitHub repository URL.");
  let parsed;
  try { parsed = new URL(raw); } catch { return res.status(400).send("That repository URL is not valid."); }
  if (parsed.hostname.toLowerCase() !== "github.com" || !["https:", "http:"].includes(parsed.protocol)) {
    return res.status(400).send("For this workflow, enter a public github.com repository URL.");
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return res.status(400).send("Use a repository URL like https://github.com/owner/repository.");
  const [owner, rawRepo] = parts;
  const repo = rawRepo.replace(/\.git$/i, "");
  if (!/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
    return res.status(400).send("That GitHub owner or repository name is not valid.");
  }

  try {
    const response = await fetch("https://api.github.com/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo), {
      headers: { "Accept": "application/vnd.github+json", "User-Agent": "FreeCode-Source-Importer/1.0" },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      if (response.status === 404) return res.status(404).send("Repository not found or not public. FreeCode currently imports public repositories only.");
      return res.status(502).send("GitHub could not verify this repository right now. Please try again.");
    }
    const metadata = await response.json();
    if (metadata.private) return res.status(403).send("Private repositories are not supported in this public-repository workflow.");
    const branch = String(metadata.default_branch || "main");
    const archiveUrl = "https://github.com/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/archive/refs/heads/" + branch.split("/").map(encodeURIComponent).join("/") + ".zip";
    res.setHeader("Content-Disposition", 'attachment; filename="' + repo.replace(/[^a-zA-Z0-9._-]/g, "-") + '-source.zip"');
    return res.redirect(302, archiveUrl);
  } catch {
    return res.status(502).send("Could not connect to GitHub. Please try again in a moment.");
  }
}
