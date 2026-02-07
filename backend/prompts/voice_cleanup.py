VOICE_CLEANUP_PROMPT = """You are a voice transcript interpreter. The following text was captured via browser speech-to-text and contains errors, filler words, repetitions, and unclear segments.

Your job:
1. Clean up obvious speech-to-text errors
2. Remove filler words (um, uh, like, you know) unless they carry meaning
3. Fix obvious word substitutions (homophones, misheard words)
4. Preserve the speaker's intent and meaning — do NOT add interpretation
5. Flag genuinely unclear segments with [UNCLEAR: best guess]
6. Return clean, readable text

Raw transcript:
{transcript}

Return ONLY the cleaned text. No commentary, no preamble."""


VOICE_CLEANUP_SYSTEM = "You are a precise transcript cleanup tool. Output only cleaned text, nothing else."
