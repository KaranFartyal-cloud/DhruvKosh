import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const renderFirstPageToCanvas = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    return { dataURL: canvas.toDataURL("image/png"), numPages: pdf.numPages };
  } catch (err) {
    console.error("PDF render error:", err);
    return null;
  }
};

export const extractPDFText = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    const maxPages = Math.min(pdf.numPages, 6);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return { text: fullText, numPages: pdf.numPages };
  } catch (err) {
    console.error("PDF extract error:", err);
    throw err;
  }
};

const NA = "Not available in document";

export const analyzePDFContent = (text, fileName, numPages) => {
  if (!text || text.trim().length < 50) return null;

  const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 3);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 30 && s.length < 400);

  // Title: first short non-numeric line, else filename
  let title = fileName.replace(/\.[^/.]+$/, "");
  const firstLine = lines.find((l) => l.length > 8 && l.length < 120 && !/^\d/.test(l));
  if (firstLine) title = firstLine;

  // Year
  const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yearMatch ? yearMatch[0] : NA;

  // Document type
  let docType = "Scientific Report";
  if (/journal|proceedings|article/i.test(text)) docType = "Research Paper";
  else if (/expedition|survey/i.test(text)) docType = "Expedition Report";
  else if (/dataset|measurements|data/i.test(text)) docType = "Scientific Dataset";
  else if (/newsletter|bulletin/i.test(text)) docType = "Institutional Bulletin";

  // Category
  let category = "general";
  if (/glacier|ice shelf|cryosphere|permafrost/i.test(text)) category = "glaciology";
  else if (/ocean|marine|sea level|salinity/i.test(text)) category = "ocean";
  else if (/atmosphere|aerosol|ozone|climate/i.test(text)) category = "atmosphere";
  else if (/biology|ecology|species|penguin|seal|krill/i.test(text)) category = "biology";

  // Summary: first 3–4 meaningful sentences
  const summary = sentences.slice(0, 4).join(" ") || NA;

  // Key findings: sentences with result-keywords
  const findingKws = ["found", "result", "showed", "indicate", "significant", "increase", "decrease", "conclude", "reveal", "suggest", "observed"];
  let findings = sentences.filter((s) => findingKws.some((kw) => s.toLowerCase().includes(kw))).slice(0, 5);
  if (findings.length === 0) findings = sentences.slice(2, 6);
  if (findings.length === 0) findings = [NA];

  // Topics: most frequent capitalized multi-letter words
  const wordMatches = text.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || [];
  const freq = {};
  wordMatches.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  const stopWords = new Set(["This", "That", "The", "These", "Those", "With", "From", "Into", "Also", "Such", "They", "Their", "Have", "Were", "When", "Which", "While", "Upon", "Figure", "Table"]);
  const topics = Object.entries(freq).filter(([w]) => !stopWords.has(w)).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([w]) => w);

  // Location & expedition
  const locMatch = text.match(/\b(Antarctica|Arctic|Southern Ocean|Himalayas?|Svalbard|Indian Ocean|Bay of Bengal|Lakshadweep)\b/i);
  const location = locMatch ? locMatch[0] : NA;

  const expMatch = text.match(/\b(\d+(?:st|nd|rd|th)\s+Indian\s+(?:Antarctic|Scientific)\s+Expedition(?:\s*\([^)]+\))?|ISEA[-\s]\d+|IAE[-\s]\d+)\b/i);
  const expedition = expMatch ? expMatch[0] : NA;

  const areaMatch = text.match(/\b(Ice Shelf|Sea Ice|Carbon Flux|Aerosol|Biodiversity|Ocean Circulation|Permafrost|Glacial Retreat|Ozone Layer)\b/i);
  const researchArea = areaMatch ? areaMatch[0] : NA;

  return { title, year, docType, category, summary, findings, topics, location, expedition, researchArea };
};
