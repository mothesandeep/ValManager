import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InwardResult {
  challan_no: string | null;
  date: string | null;
  party_name: string | null;
  gross_kg: number | null;
  tare_deduction_kg: number | null;
  net_kasab_kg: number | null;
  rola_pcs: number | null;
  rola_type: "NORMAL" | "BIG" | null;
  bags_count: number | null;
}

interface OutwardBag {
  bag_no?: number;
  gross?: number;
  gross_kg: number;
  bungari?: number;
  bungari_pcs: number;
  tar?: string;
  tar_rate: string;
  twist: "S" | "Z" | "S+Z";
  rate?: number;
}

interface EmptyRolaBag {
  bag_no?: number;
  gross: number;
  rola: number;
}

interface OutwardResult {
  dispatch_type?: "VAL_FINISHED" | "ROLA_EMPTY";
  party_name: string | null;
  challan_no: string | null;
  date: string | null;
  default_rate?: number | null;
  default_tar?: string | null;
  default_twist?: "S" | "Z" | "S+Z" | null;
  val_bags?: OutwardBag[];
  bags?: OutwardBag[];
  empty_rola_bags?: EmptyRolaBag[];
  tare_total_kg?: number | null;
  net_total_kg?: number | null;
  grand_total_amount?: number | null;
  net_val_kg?: number | null;
  rola_weight_kg?: number | null;
  rola_returned_pcs?: number | null;
  rate_per_kg?: number | null;
  total_amount?: number | null;
}

const INWARD_SCHEMA = {
  type: "OBJECT",
  properties: {
    challan_no: { type: "STRING", nullable: true },
    date: { type: "STRING", description: "Standardized date (YYYY-MM-DD or DD-MM-YYYY)", nullable: true },
    party_name: { type: "STRING", nullable: true },
    gross_kg: { type: "NUMBER", description: "Total gross weight sum in kilograms (e.g. 118.890)", nullable: true },
    tare_deduction_kg: { type: "NUMBER", description: "Tare / deduction weight in kilograms (e.g. 50.020)", nullable: true },
    net_kasab_kg: { type: "NUMBER", description: "Net Kasab weight in kg (Gross - Deduction, e.g. 68.870)", nullable: true },
    rola_pcs: { type: "INTEGER", description: "Total count of rola pieces sum across all bags", nullable: true },
    rola_type: { type: "STRING", enum: ["NORMAL", "BIG"], nullable: true },
    bags_count: { type: "INTEGER", description: "Count of bags or parcels", nullable: true },
    bags: {
      type: "ARRAY",
      description: "List of individual raw kasab bags written above the summary/subtotal divider line. Do NOT include the sum/subtotal or deduction row.",
      items: {
        type: "OBJECT",
        properties: {
          bag_number: { type: "INTEGER" },
          gross_weight: { type: "NUMBER", description: "Gross scale weight of this bag in kg" },
          rola: { type: "INTEGER", description: "Rola count in pieces" },
          twist: { type: "STRING", enum: ["S", "Z"], description: "Twist direction S or Z" },
          color: { type: "STRING", description: "Quality or color, e.g. M.gold" }
        },
        required: ["bag_number", "gross_weight"]
      }
    }
  },
  required: [
    "challan_no",
    "date",
    "party_name",
    "gross_kg",
    "tare_deduction_kg",
    "net_kasab_kg",
    "rola_pcs",
    "bags",
  ],
};

const OUTWARD_SCHEMA = {
  type: "OBJECT",
  properties: {
    dispatch_type: { type: "STRING", enum: ["VAL_FINISHED", "ROLA_EMPTY"], description: "VAL_FINISHED for finished goods, ROLA_EMPTY for empty rola return" },
    party_name: { type: "STRING", nullable: true },
    challan_no: { type: "STRING", nullable: true },
    date: { type: "STRING", description: "Standardized date (YYYY-MM-DD or DD-MM-YYYY)", nullable: true },
    default_rate: { type: "NUMBER", description: "Default job-work rate per kg", nullable: true },
    default_tar: { type: "STRING", description: "Default tar description (e.g. 10 Tar (₹20/kg))", nullable: true },
    default_twist: { type: "STRING", enum: ["S", "Z", "S+Z"], nullable: true },
    val_bags: {
      type: "ARRAY",
      description: "List of individual finished val bags in the upper section of the challan",
      items: {
        type: "OBJECT",
        properties: {
          bag_no: { type: "INTEGER" },
          gross: { type: "NUMBER", description: "Gross scale weight of this bag in kg" },
          bungari: { type: "INTEGER", description: "Count of bungari tubes/tapes in this bag" },
          tar: { type: "STRING", description: "e.g. 12 Tar, 10 Tar" },
          twist: { type: "STRING", enum: ["S", "Z", "S+Z"] },
          rate: { type: "NUMBER", description: "Job-work rate per kg" }
        },
        required: ["gross"]
      }
    },
    bags: {
      type: "ARRAY",
      description: "List of individual bags listed on the challan",
      items: {
        type: "OBJECT",
        properties: {
          bag_no: { type: "INTEGER" },
          gross_kg: { type: "NUMBER", description: "Gross scale weight of this bag in kg" },
          bungari_pcs: { type: "INTEGER", description: "Count of bungari tubes/tapes in this bag" },
          tar_rate: { type: "STRING", description: "e.g. 10 Tar (₹20/kg)" },
          twist: { type: "STRING", enum: ["S", "Z", "S+Z"] }
        },
        required: ["bag_no", "gross_kg"]
      }
    },
    empty_rola_bags: {
      type: "ARRAY",
      description: "CRITICAL: Secondary/return section at the bottom of the challan (typically rows 11-15 or below divider). Return empty array [] ONLY if bottom section has no entries. If there are handwritten weights (e.g. 19.280, 16.500) and counts (80, 72), each row MUST be extracted into this array with gross and rola.",
      items: {
        type: "OBJECT",
        properties: {
          bag_no: { type: "INTEGER" },
          gross: { type: "NUMBER", description: "Gross weight of empty rola in kg (e.g. 19.280, 16.500)" },
          weight_kg: { type: "NUMBER", description: "Same as gross" },
          rola: { type: "INTEGER", description: "Number of empty rola pieces (e.g. 80, 72)" }
        },
        required: ["gross", "rola"]
      }
    },
    tare_total_kg: { type: "NUMBER", description: "Total tare weight deducted in kg", nullable: true },
    net_total_kg: { type: "NUMBER", description: "Total net finished Val weight in kg", nullable: true },
    grand_total_amount: { type: "NUMBER", description: "Total bill amount payable in INR", nullable: true },
    net_val_kg: { type: "NUMBER", description: "Net finished Val / Dori weight in kg", nullable: true },
    rola_weight_kg: { type: "NUMBER", description: "Empty Rola tare/return weight in kg", nullable: true },
    rola_returned_pcs: { type: "INTEGER", description: "Number of Rola pieces returned", nullable: true },
    rate_per_kg: { type: "NUMBER", description: "Job-work rate per kg", nullable: true },
    total_amount: { type: "NUMBER", description: "Total amount payable (Net Val kg * Rate)", nullable: true },
  },
  required: [
    "challan_no",
    "date",
    "party_name",
    "empty_rola_bags",
  ],
};

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured in environment variables.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({
          error: "Invalid content-type. Expected multipart/form-data.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const challanTypeRaw = formData.get("challan_type");

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid 'file'. Please attach an image file (JPEG, PNG, or WEBP).",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const challanType = typeof challanTypeRaw === "string" ? challanTypeRaw.trim().toUpperCase() : "";
    if (challanType !== "INWARD" && challanType !== "OUTWARD") {
      return new Response(
        JSON.stringify({
          error: "Invalid 'challan_type'. Allowed values are 'INWARD' or 'OUTWARD'.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Supported mime types
    const mimeType = file.type || "image/jpeg";
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const normalizedMimeType = allowedMimeTypes.includes(mimeType) ? mimeType : "image/jpeg";

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64Data = uint8ArrayToBase64(bytes);

    const isInward = challanType === "INWARD";
    const targetSchema = isInward ? INWARD_SCHEMA : OUTWARD_SCHEMA;

    const systemPrompt = `You are a specialized Document OCR and Accounting Data Extractor for "ValManager (Jari Kasab & Val Portal)".
You analyze handwritten Indian textile delivery challans and job-work receipts (specifically Jari, Kasab, and Val/Dori manufacturing in Surat/Gujarat/India).

Core Rules & Parsing Guidelines:
1. Handwritten Numerals & Indian Formats:
   - Recognize Gujarati/Hindi/English handwriting.
   - Pay close attention to manual calculations inside the challan body (e.g. Gross weight minus tare/deduction = Net weight).
   - Inward represents raw material (Kasab) receiving.
   - Outward represents finished goods (Val) dispatch and empty Rola return.

2. Mode Specifics:
   - For "INWARD":
     * Extract challan_no, date (format YYYY-MM-DD), party_name (supplier/sender).
     * Parse each bag row written ABOVE the divider line into the "bags" array with bag_number, gross_weight (in kg), rola (count), twist ('S' or 'Z'), and color ('M.gold').
     * Do NOT put the subtotal/sum row or deduction row into "bags"!
     * Extract gross_kg (sum of bag gross weights), tare_deduction_kg (tare deduction weight), and net_kasab_kg (Gross - Tare = Net Kasab weight).
     * Extract rola_pcs (sum of rola pieces) and bags_count (number of bags).
   - For "OUTWARD":
     * Extract challan_no, date, party_name.
     * Extract all finished Val bags in the upper section into "val_bags" (or "bags").
     * CRITICAL: Scan the challan for any secondary/return section at the bottom. Handwritten entries showing weights (e.g. 19.280, 16.500) paired with piece counts (e.g. 80, 72) and subtotal (35.780 / 152) represent empty rola returns. Extract every individual row into the "empty_rola_bags" array.
     * Extract net_val_kg (finished Val weight delivered).
     * Extract rola_weight_kg (tare weight of returned rolas), rola_returned_pcs (count of rolas being returned to the party).
     * Extract rate_per_kg (job-work rate per kg) and total_amount (calculated bill amount).

3. Strict Output Constraints:
   - Always return pure JSON matching the specified schema.
   - Do not guess uncertain digits. Use null if illegible or not present on the slip.`;

    const userPrompt = `Please extract the challan data from this image for challan_type: "${challanType}".
Extract all available fields matching the JSON schema.`;

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            {
              inline_data: {
                mime_type: normalizedMimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: targetSchema,
        temperature: 0.1,
      },
    };

    const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errText);
      return new Response(
        JSON.stringify({
          error: "Failed to process image with Gemini Vision API.",
          details: errText,
          status: geminiResponse.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const candidateText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return new Response(
        JSON.stringify({
          error: "No OCR data returned from AI model.",
          raw: geminiData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parsedData: InwardResult | OutwardResult = JSON.parse(candidateText);

    return new Response(
      JSON.stringify({
        success: true,
        challan_type: challanType,
        data: parsedData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Unhandled error in scan-challan edge function:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
