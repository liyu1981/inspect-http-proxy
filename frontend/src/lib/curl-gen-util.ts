/**
 * Utility for generating cURL commands from HTTP session data
 */

interface CurlOptions {
  method: string;
  url: string;
  headers: Record<string, string[]>;
  body?: string;
  contentType?: string;
}

/**
 * Checks if a string is base64 encoded
 */
function isBase64(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }

  // Base64 strings should only contain valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  // Check if it matches base64 pattern and length is multiple of 4
  if (!base64Regex.test(str) || str.length % 4 !== 0) {
    return false;
  }

  // Try to decode and re-encode to verify
  try {
    const decoded = atob(str);
    const reencoded = btoa(decoded);
    return reencoded === str;
  } catch (_e) {
    return false;
  }
}

/**
 * Decodes a base64 string
 */
function decodeBase64(str: string): string {
  try {
    return atob(str);
  } catch (_e) {
    return str; // Return original if decoding fails
  }
}

/**
 * Generates a cURL command string from HTTP request data
 */
export function generateCurlCommand(options: CurlOptions): string {
  const { method, url, headers, body } = options;

  let curlCommand = "curl";

  // Add method
  if (method && method.toUpperCase() !== "GET") {
    curlCommand += ` -X ${method.toUpperCase()}`;
  }

  // Add headers
  if (headers && typeof headers === "object") {
    for (const [key, values] of Object.entries(headers)) {
      if (!values) continue;

      // Handle both array and single string values (though expected to be array)
      const valueStr = Array.isArray(values)
        ? values.join(", ")
        : String(values);

      // Escape single quotes in header values
      const escapedValue = valueStr.replace(/'/g, "'\\''");
      curlCommand += ` \\\n  -H '${key}: ${escapedValue}'`;
    }
  }

  // Add body if present
  if (body) {
    // Check if body is base64 encoded and decode if necessary
    let processedBody = body;
    if (typeof body === "string" && isBase64(body)) {
      processedBody = decodeBase64(body);
    } else if (typeof body !== "string") {
      // If it's not a string (e.g. object), stringify it
      try {
        processedBody = JSON.stringify(body);
      } catch (_e) {
        processedBody = String(body);
      }
    }

    // Escape single quotes in body
    const escapedBody = String(processedBody).replace(/'/g, "'\\''");
    curlCommand += ` \\\n  -d '${escapedBody}'`;
  }

  // Add URL (always last)
  curlCommand += ` \\\n  '${url || ""}'`;

  return curlCommand;
}

/**
 * Copies text to clipboard
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try using the modern Clipboard API first
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Failed to copy with Clipboard API, trying fallback:", err);
    }
  }

  // Fallback for non-secure contexts or when Clipboard API fails
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Ensure the textarea is not visible but still part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (successful) {
      return true;
    }
  } catch (err) {
    console.error("Fallback copy failed:", err);
  }

  return false;
}
