export const translateText = async (text, targetLang = 'es', apiKey) => {
  // Mock mode if no key
  if (!apiKey) {
      return new Promise(resolve => {
          setTimeout(() => {
              const mockResponse = targetLang === 'es' 
                ? "Translation requires API Key. (Mock: Hola, ¿cómo estás?)"
                : "Translation requires API Key. (Mock: Hello, how are you?)";
              resolve(mockResponse);
          }, 800);
      });
  }

  const prompt = targetLang === 'es'
    ? "You are a fast translator. Translate the user input to conversational Mexican Spanish. Write out all numbers as words (e.g., '100' -> 'cien', '5' -> 'cinco'). Output ONLY the translation. No explanations."
    : "You are a fast translator. Translate the user input to English. Output ONLY the translation. No explanations.";

  // Example implementation for OpenAI
  try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                  {
                      role: "system",
                      content: prompt
                  },
                  {
                      role: "user",
                      content: text
                  }
              ],
              temperature: 0.3
          })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content.trim();
  } catch (err) {
      console.error(err);
      return "Error: " + err.message;
  }
}
