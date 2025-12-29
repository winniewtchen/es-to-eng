/**
 * Client service for image-based translation
 * Handles image resizing, base64 conversion, and API calls
 */

const MAX_DIMENSION = 1024;

/**
 * Resize image to max dimension while maintaining aspect ratio
 * @param {File} file - Image file to resize
 * @returns {Promise<string>} - Base64 encoded image (without data URI prefix)
 */
export const resizeImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get base64 (strip data URI prefix)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        
        resolve(base64);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Translate text from an image
 * @param {string} imageBase64 - Base64 encoded image (without data URI prefix)
 * @param {string} targetLang - Target language code ('es', 'en', 'zh')
 * @returns {Promise<{originalText: string, translatedText: string, detectedLanguage?: string, message?: string, error?: string}>}
 */
export const translateImage = async (imageBase64, targetLang = 'es') => {
  if (!imageBase64) {
    return { originalText: '', translatedText: '', error: 'No image provided' };
  }

  try {
    const response = await fetch('/api/image-translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        targetLang
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        originalText: '', 
        translatedText: '', 
        error: data.error || 'Image translation failed' 
      };
    }

    return data;
  } catch (err) {
    console.error('Image translation error:', err);
    return { 
      originalText: '', 
      translatedText: '', 
      error: 'Network request failed' 
    };
  }
};

/**
 * Process an image file and translate it
 * @param {File} file - Image file
 * @param {string} targetLang - Target language code
 * @returns {Promise<{originalText: string, translatedText: string, detectedLanguage?: string, message?: string, error?: string}>}
 */
export const processAndTranslateImage = async (file, targetLang = 'es') => {
  try {
    const base64 = await resizeImage(file);
    return await translateImage(base64, targetLang);
  } catch (err) {
    console.error('Image processing error:', err);
    return { 
      originalText: '', 
      translatedText: '', 
      error: err.message || 'Failed to process image' 
    };
  }
};

