import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export interface RewardRecord {
  id: string;
  name: string;
  desc: string;
  cost: number;
  ingredients: string[];
  imageUrl: string;
  color: string;
  bgClass: string;
  borderClass: string;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
  };
}

export function isRewardsDbConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function normalizeReward(row: any): RewardRecord {
  return {
    id: String(row.id ?? ""),
    name: row.name || "",
    desc: row.description || row.desc || "",
    cost: Number(row.cost || 0),
    ingredients: Array.isArray(row.ingredients)
      ? row.ingredients.map((item) => String(item))
      : typeof row.ingredients === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(row.ingredients);
              return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
            } catch {
              return [];
            }
          })()
        : [],
    imageUrl: row.image_url || row.imageUrl || "",
    color: row.color || "",
    bgClass: row.bg_class || row.bgClass || "",
    borderClass: row.border_class || row.borderClass || "",
  };
}

export async function listRewards(): Promise<RewardRecord[]> {
  if (!isRewardsDbConfigured()) {
    throw new Error("Rewards database is not configured");
  }

  const url = `${supabaseUrl}/rest/v1/rewards?select=id,name,description,cost,ingredients,image_url,color,bg_class,border_class&order=cost.asc,id.asc`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });
  } catch (e) {
    const cause = (e as Error)?.cause as any;
    throw new Error(
      `fetch failed for ${url} (${(e as Error).message}${
        cause?.code ? `, code=${cause.code}` : ""
      }${cause?.message ? `: ${cause.message}` : ""})`,
    );
  }

  if (!res.ok) {
    throw new Error(`Failed to list rewards: ${res.status} ${await res.text()}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(normalizeReward) : [];
}

export async function upsertReward(reward: RewardRecord): Promise<RewardRecord> {
  if (!isRewardsDbConfigured()) {
    throw new Error("Rewards database is not configured");
  }

  const payload = {
    id: reward.id,
    name: reward.name,
    description: reward.desc,
    cost: reward.cost,
    ingredients: reward.ingredients,
    image_url: reward.imageUrl,
    color: reward.color,
    bg_class: reward.bgClass,
    border_class: reward.borderClass,
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/rewards?on_conflict=id`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to save reward: ${res.status} ${await res.text()}`);
  }

  const rows = await res.json();
  return normalizeReward(Array.isArray(rows) ? rows[0] : rows);
}

export async function deleteRewardById(id: string): Promise<void> {
  if (!isRewardsDbConfigured()) {
    throw new Error("Rewards database is not configured");
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rewards?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...getHeaders(),
      Prefer: "return=minimal",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete reward: ${res.status} ${await res.text()}`);
  }
}
