export const detectLanguage = async (text) => {
  if (!text) return null;

  // Optimization: Detect Chinese characters locally
  // This avoids API calls and handles single-character inputs which are valid in Chinese
  if (/[\u4e00-\u9fa5]/.test(text)) {
    return {
      language: 'zh',
      confidence: 1.0
    };
  }

  if (text.trim().length < 2) {
    return null;
  }

  try {
    const response = await fetch('/api/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Detection error:', data.error);
      return null;
    }

    return {
      language: data.language,
      confidence: data.confidence
    };
  } catch (err) {
    console.error('Detection error:', err);
    return null;
  }
};
