import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import arrowLeft from "../assets/gameplay/arrow-left.svg";
import feltInset from "../assets/gameplay/felt-inset.svg";
import suitClub from "../assets/gameplay/suit-club.svg";
import suitClubMark from "../assets/gameplay/suit-club-mark.svg";
import suitDiamond from "../assets/gameplay/suit-diamond.svg";
import suitHeart from "../assets/gameplay/suit-heart.svg";
import suitSpade from "../assets/gameplay/suit-spade.svg";
import tableRail from "../assets/gameplay/table-rail.svg";
import { dealTable, type TableDeal } from "../services/game";
import "../styles/Gameplay.css";

type FaceCard = { rank: string; suit: string; red?: boolean; name: string };

const SUIT_ART: Record<string, { src: string; name: string; red: boolean }> = {
  C: { src: suitClub, name: "clubs", red: false },
  D: { src: suitDiamond, name: "diamonds", red: true },
  H: { src: suitHeart, name: "hearts", red: true },
  S: { src: suitSpade, name: "spades", red: false },
};

const RANK_NAMES: Record<string, string> = {
  A: "Ace",
  K: "King",
  Q: "Queen",
  J: "Jack",
  "10": "Ten",
  "9": "Nine",
  "8": "Eight",
  "7": "Seven",
  "6": "Six",
  "5": "Five",
  "4": "Four",
  "3": "Three",
  "2": "Two",
};

function faceCard(text: string): FaceCard {
  const suit = SUIT_ART[text.slice(-1)];
  const rank = text.slice(0, -1);
  return {
    rank,
    suit: suit.src,
    red: suit.red,
    name: `${RANK_NAMES[rank]} of ${suit.name}`,
  };
}

function rankLabel(rank: string) {
  return rank.charAt(0).toUpperCase() + rank.slice(1);
}

function PlayingCard({ rank, suit, red, name }: FaceCard) {
  return (
    <div className="gameplay-card" role="img" aria-label={name}>
      <span className={red ? "gameplay-rank gameplay-rank-red" : "gameplay-rank"}>{rank}</span>
      <img src={suit} alt="" width={31} height={31} />
    </div>
  );
}

export default function Gameplay() {
  const [deal, setDeal] = useState<TableDeal | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    dealTable()
      .then((next) => {
        if (active) setDeal(next);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not deal.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="gameplay">
      <div className="gameplay-fit">
        <div className="gameplay-board">
          <Link className="gameplay-lobbies" to="/lobbies">
            <img src={arrowLeft} alt="" width={17} height={17} />
            Lobbies
          </Link>

          {error && <p className="gameplay-deal-error" role="alert">{error}</p>}
          {!deal && !error && <p className="gameplay-deal-status" role="status">Dealing...</p>}

          <div className="gameplay-dealer" aria-label="Dealer hand">
            {deal && <p className="gameplay-hand-rank gameplay-dealer-rank">{rankLabel(deal.dealer.rank)}</p>}
            {deal?.dealer.cards.map((text) => {
              const card = faceCard(text);
              return <PlayingCard key={card.name} {...card} />;
            })}
          </div>

          <img className="gameplay-rail" src={tableRail} alt="" width={1296} height={402} />
          <img className="gameplay-inset" src={feltInset} alt="" width={1232} height={351} />

          <p className="gameplay-wordmark">
            Reef Royale
            <img src={suitClubMark} alt="" width={25} height={25} />
          </p>
          <p className="gameplay-ante" aria-label="Ante 10">10</p>

          <div className="gameplay-player-hand" aria-label="Your hand">
            {deal && <p className="gameplay-hand-rank gameplay-player-rank">{rankLabel(deal.player.rank)}</p>}
            {deal?.player.cards.map((text) => {
              const card = faceCard(text);
              return <PlayingCard key={card.name} {...card} />;
            })}
          </div>

          <section className="gameplay-seat" aria-label="Your seat">
            <span className="gameplay-avatar" aria-hidden="true">LO</span>
            <span className="gameplay-identity">
              <strong>LoremOpus</strong>
              <small>2,450 pts</small>
            </span>
          </section>

          <div className="gameplay-bets" aria-label="Bet controls">
            <button type="button" aria-disabled="true">Ante · 10 placed</button>
            <button type="button" aria-disabled="true">Fold</button>
            <button type="button" className="gameplay-raise" aria-disabled="true">Raise · 20 pts</button>
          </div>
        </div>
      </div>
    </main>
  );
}
