export type BrowserLobby = {
  lobbyId: number;
  name: string;
  maxPlayers: number;
  maxBet: string | number;
  botsEnabled: boolean;
  creator: string;
  createdAt: string;
  startingMoney: string | number;
  minBet: string | number;
  isPrivate: boolean;
  seatsAvailable: number;
};

export function selectLobbies<T extends BrowserLobby>(rows: T[], sortBy: string, direction: 'asc' | 'desc', privacy: string, openSeats: boolean): T[] {
  const filtered = rows.filter(row =>
    (privacy === 'all' || row.isPrivate === (privacy === 'private')) &&
    (!openSeats || row.seatsAvailable > 0)
  );
  return filtered.sort((a, b) => {
    let result = 0;
    if (sortBy === 'creator') result = a.creator.localeCompare(b.creator);
    else if (sortBy === 'createdAt') result = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    else if (sortBy === 'startingMoney' || sortBy === 'minBet') result = Number(a[sortBy]) - Number(b[sortBy]);
    return (direction === 'asc' ? result : -result) || b.lobbyId - a.lobbyId;
  });
}
