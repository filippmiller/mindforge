import json
import httpx
import anthropic
import aiosqlite
from typing import AsyncGenerator

from config import settings
from database.db import DB_PATH


COMPETITOR_ANALYSIS_PROMPT = """
You are analyzing competitor websites for a client who wants to build a {niche_type} website.

The client's business: {business_description}

I've gathered content from the following competitor websites:

{competitor_data}

## YOUR TASK

Analyze these competitors and provide a structured report:

1. **Common Patterns** — What do ALL or most competitors have in common? (Pages, features, CTAs, content sections)
2. **Best Practices** — What are the best things you see? What works well?
3. **Unique Features** — What standout features does each competitor have?
4. **Missing Opportunities** — What are NONE of the competitors doing that could be a differentiator?
5. **Design Observations** — Common visual approaches, color schemes, layout patterns
6. **Recommended Features** — Based on this analysis, what MUST the client's site have, and what could set them apart?

Be specific and actionable. Give concrete examples from the sites analyzed.

Respond in the same language as the business description.
"""


async def fetch_site_content(url: str) -> dict:
    """Fetch and extract basic content from a URL."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                "User-Agent": "MindForge-Analyzer/1.0 (website planning tool)"
            })
            response.raise_for_status()

            # Extract text content (simplified — just get the HTML)
            html = response.text
            # Basic extraction: title, meta description, headings
            import re
            title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else "No title"

            meta_desc_match = re.search(
                r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']',
                html, re.IGNORECASE
            )
            meta_desc = meta_desc_match.group(1).strip() if meta_desc_match else ""

            # Extract all heading text
            headings = re.findall(r"<h[1-6][^>]*>(.*?)</h[1-6]>", html, re.IGNORECASE | re.DOTALL)
            headings_clean = [re.sub(r"<[^>]+>", "", h).strip() for h in headings[:20]]

            # Extract nav links
            nav_links = re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
            nav_clean = [
                {"href": href, "text": re.sub(r"<[^>]+>", "", text).strip()}
                for href, text in nav_links[:30]
                if text.strip() and not href.startswith("#") and not href.startswith("javascript:")
            ]

            return {
                "url": url,
                "status": "success",
                "title": title,
                "meta_description": meta_desc,
                "headings": headings_clean,
                "navigation_links": nav_clean,
                "content_length": len(html),
            }
    except Exception as e:
        return {
            "url": url,
            "status": "error",
            "error": str(e),
        }


async def search_competitors(query: str) -> list[str]:
    """Search for competitor URLs. Returns a list of URLs to analyze."""
    # For MVP, we'll use a simple approach — the user provides URLs
    # or we parse them from the query
    import re
    urls = re.findall(r'https?://[^\s<>"\']+', query)
    return urls[:10]


async def stream_competitor_analysis(
    session_id: str,
    query: str,
    urls: list[str] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Analyze competitor websites and stream results via SSE.
    """
    try:
        # Step 1: Resolve URLs
        if not urls:
            urls = await search_competitors(query)

        if not urls:
            yield f"event: error\ndata: {json.dumps({'message': 'No competitor URLs found. Please provide specific website URLs to analyze.'})}\n\n"
            return

        yield f"event: status\ndata: {json.dumps({'status': 'fetching_competitors', 'count': len(urls)})}\n\n"

        # Step 2: Fetch each competitor site
        competitor_data = []
        for i, url in enumerate(urls):
            yield f"event: status\ndata: {json.dumps({'status': f'analyzing_site', 'current': i + 1, 'total': len(urls), 'url': url})}\n\n"
            data = await fetch_site_content(url)
            competitor_data.append(data)
            yield f"event: site_fetched\ndata: {json.dumps({'url': url, 'status': data['status'], 'title': data.get('title', 'Unknown')})}\n\n"

        # Step 3: Get session context
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT niche_type FROM sessions WHERE id = ?", (session_id,)
            )
            session = await cursor.fetchone()
            niche_type = session["niche_type"] if session else "general"

            cursor = await db.execute(
                "SELECT content FROM whitepapers WHERE session_id = ?", (session_id,)
            )
            wp = await cursor.fetchone()
            wp_content = json.loads(wp["content"]) if wp else {}
            business_desc = wp_content.get("project_overview", query)

        # Step 4: Analyze with Claude
        yield f"event: status\ndata: {json.dumps({'status': 'analyzing_with_ai'})}\n\n"

        competitor_text = json.dumps(competitor_data, indent=2, ensure_ascii=False)
        prompt = COMPETITOR_ANALYSIS_PROMPT.format(
            niche_type=niche_type,
            business_description=business_desc,
            competitor_data=competitor_text,
        )

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        full_response = ""
        try:
            async with client.messages.stream(
                model=settings.BRAINSTORM_MODEL,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                async for text in stream.text_stream:
                    full_response += text
                    yield f"event: token\ndata: {json.dumps({'text': text})}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
            return

        # Step 5: Save analysis to database
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT INTO competitor_analyses (session_id, query, results, summary) VALUES (?, ?, ?, ?)",
                (session_id, query, json.dumps(competitor_data, ensure_ascii=False), full_response),
            )
            await db.commit()

        yield f"event: analysis_complete\ndata: {json.dumps({'content': full_response, 'sites_analyzed': len(competitor_data)})}\n\n"
        yield f"event: done\ndata: {json.dumps({'session_id': session_id})}\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
