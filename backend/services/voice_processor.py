import anthropic
from config import settings
from prompts.voice_cleanup import VOICE_CLEANUP_PROMPT, VOICE_CLEANUP_SYSTEM


async def clean_transcript(raw_transcript: str) -> str:
    """Clean up a messy voice transcript into readable text."""
    if not raw_transcript or len(raw_transcript.strip()) < 5:
        return raw_transcript

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=VOICE_CLEANUP_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": VOICE_CLEANUP_PROMPT.format(transcript=raw_transcript),
            }
        ],
    )

    return response.content[0].text.strip()
