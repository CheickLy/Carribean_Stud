export type DealtHand = {
  cards: string[];
  rank: string;
};

export type TableDeal = {
  player: DealtHand;
  dealer: DealtHand;
};

export async function dealTable(): Promise<TableDeal> {
  const response = await fetch("http://localhost:3001/api/game/deal", {
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Could not deal.");
  }
  return data;
}
