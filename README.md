# Highly Scalable and Production-Ready RAG

Interactive web lecture for teaching Retrieval-Augmented Generation (RAG), designed to pair with a lecture script similar in style to the TransformerPresentation class.

## Goal

This presentation teaches RAG from first principles without becoming a huge 70+ slide deck. It is intentionally scoped to a focused 20–30 slide lecture that covers:

- Why RAG exists
- History from search and information retrieval to dense retrieval and RAG
- Basic ingestion and query-time pipelines
- Chunking, embeddings, similarity search, vector databases, and prompt assembly
- Why naive RAG systems fail
- Hybrid retrieval, reranking, context window management, and citations
- Advanced patterns such as GraphRAG, multi-query retrieval, query decomposition, parent-child retrieval, and corrective RAG
- Production architecture, scaling, security, evaluation, and RAG vs fine-tuning

## Files

- `index.html` - the 27-slide static presentation
- `styles.css` - visual system, responsive layout, and teaching animations
- `script.js` - slide navigation, notes, overview mode, fullscreen, and go-to-slide controls
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow

## How to run locally

From the repo root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also open `index.html` directly in a browser.

## Keyboard controls

- `ArrowRight` or `Space` - next slide
- `ArrowLeft` - previous slide
- `Home` - first slide
- `End` - last slide
- `S` - toggle speaker notes
- `O` - overview/grid mode
- `G` - go to slide number
- `F` - fullscreen
- `Esc` - close overlays

## Design context for future Codex/agent edits

Keep the deck similar in spirit to the existing TransformerPresentation project, but do **not** expand it to 70+ slides unless explicitly requested. The preferred scope is around 20–30 slides.

Important design principles:

1. **Lecture-first, not bullet-first**  
   Every slide should teach one concept clearly.

2. **Animations should explain, not decorate**

   Good animation targets:
   - Documents breaking into chunks
   - Chunks becoming vectors
   - Query vector finding nearest chunks
   - Query rewrite fan-out through retrieval, reranking, prompt assembly, and citation
   - Hybrid sparse + dense retrieval merging
   - Reranker reordering candidates
   - Context window accepting/rejecting evidence
   - Prompt injection being blocked
   - Production architecture showing offline and online paths
   - Evaluation suites catching regressions before deployment

3. **Use the right visualization tool**  
   D3 is allowed, but not required. For this version, native HTML/CSS/SVG is preferred because it is lightweight and GitHub Pages friendly. Add D3, Canvas, GSAP, or another library only if it improves teaching clarity.

4. **Keep it deployable**  
   No backend, no API keys, no build step, and no runtime server requirement.

5. **Maintain projector readability**  
   Use large text, high contrast, and avoid overcrowding.

## GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that deploys the static site from the repo root.

If Pages does not appear automatically, enable it in GitHub:

`Settings → Pages → Source: GitHub Actions`

After the workflow runs, the site should be available at:

```text
https://abhishekadile.github.io/RAG_Presentation/
```
