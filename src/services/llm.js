export const translateText = async (text, targetLang = 'es') => {
  // Client-side validation before making request
  if (!text || text.trim().length < 2) {
    return '';
  }

  if (text.length > 500) {
    return 'Error: Text exceeds 500 character limit';
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        targetLang
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return `Error: ${data.error || 'Translation failed'}`;
    }

    return data.translation || '';
  } catch (err) {
    console.error('Translation error:', err);
    return 'Error: Network request failed';
  }
}

