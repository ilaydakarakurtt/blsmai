import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GeneratedQuestion {
  text: string;
  visual?: string; // emoji/sembollerle kurulmuş görsel ipucu (örn: "🚗🔵 → 68\n🚗🔴 → 87\n🚗🟢 → ?")
  options: string[];
  correctIndex: number;
}

const categoryPrompts: Record<string, string> = {
  MEMORY: "hafıza ve akılda tutma becerisini ölçen (örneğin bir dizi bilgiyi hatırlama, eşleştirme, sıralama)",
  LOGIC: "mantıksal çıkarım ve problem çözme becerisini ölçen (örneğin sayı/şekil dizileri, mantık bulmacaları)",
  MATH: "temel matematik işlem ve problem çözme becerisini ölçen",
  ATTENTION: "dikkat ve odaklanma becerisini ölçen (örneğin farkı bulma, hızlı gözlem, detaylara dikkat)",
};

export async function generateExerciseQuestions(
  category: string,
  count: number
): Promise<GeneratedQuestion[]> {
  const description = categoryPrompts[category] ?? categoryPrompts.LOGIC;

  const prompt = `${description} ${count} adet çoktan seçmeli soru üret, Türkçe olarak.
ZORUNLU KURALLAR:
- Her sorunun tam olarak 4 seçeneği olsun
- Sadece bir doğru cevap olsun
- Sorular kısa, net ve eğlenceli olsun (bir egzersiz/oyun havasında)
- Zorluk seviyesi orta düzeyde olsun
- HER SORUDA "visual" alanı ZORUNLU ve DOLU olmalı, asla boş bırakma. "visual" alanı, soruyu çözmek için gereken TÜM bilgiyi (örüntü, eşleştirme, sayılar, semboller) içermeli.
- Eğer "text" alanında "görseldeki", "yukarıdaki", "örüntüye göre", "eşleştirmelere göre" gibi bir ifade kullanıyorsan, o örüntünün/eşleştirmenin TAMAMI mutlaka "visual" alanında eksiksiz yazılı olmalı — öğrenci SADECE "visual" alanına bakarak soruyu çözebilmeli.
- "visual" alanında satır atlamak için \\n kullan

Örnekler:
- Mantık/dizi sorusu: "visual": "🚗🟢 ➜ 68\\n🚗🔵 ➜ 87\\n🚗🔴 ➜ ?"
- Hafıza sorusu: "visual": "🍎🍌🍇🍊"
- Matematik: "visual": "🍇 = 5\\n🍏 = 8\\n🍇 + 🍏 = ?"
- Dikkat: "visual": "🔵🔵🔵🔴🔵🔵"


SADECE aşağıdaki JSON formatında, başka hiçbir açıklama/metin olmadan cevap ver:

[
  {
    "text": "Soru metni?",
    "visual": "🚗🟢 ➜ 68\\n🚗🔵 ➜ 87\\n🚗🔴 ➜ ?",
    "options": ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"],
    "correctIndex": 0
  }
]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  const rawText = response.text ?? "";
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned) as GeneratedQuestion[];
  } catch {
    throw new Error("AI çıktısı okunamadı, tekrar dene");
  }
}

export async function generateQuestions(topic: string, count: number): Promise<GeneratedQuestion[]> {
  const prompt = `"${topic}" konusu hakkında, Türkçe olarak ${count} adet çoktan seçmeli quiz sorusu üret.

Kurallar:
- Her sorunun tam olarak 4 seçeneği olsun
- Sadece bir doğru cevap olsun
- Sorular net, kısa ve anlaşılır olsun
- SADECE aşağıdaki JSON formatında, başka hiçbir açıklama/metin olmadan cevap ver:

[
  {
    "text": "Soru metni?",
    "options": ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"],
    "correctIndex": 0
  }
]

correctIndex, doğru cevabın options dizisindeki index'i olsun (0'dan başlar).`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  const rawText = response.text ?? "";
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned) as GeneratedQuestion[];
  } catch {
    throw new Error("AI çıktısı okunamadı, tekrar dene");
  }
}