exports.handler = async function(event) {
  // Accepte GET et POST
  const key = process.env.ANTHROPIC_API_KEY;
  
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing API key" }) };
  }
  
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: JSON.stringify({ status: "Function OK, use POST" }) };
  }

  let prompt = "";
  try {
    const body = JSON.parse(event.body || "{}");
    prompt = body.prompt || "";
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing prompt" }) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
