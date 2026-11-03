import { Link } from "react-router-dom";
import arrowLeft from "../assets/gameplay/arrow-left.svg";
import feltInset from "../assets/gameplay/felt-inset.svg";
import suitClub from "../assets/gameplay/suit-club.svg";
import suitClubBack from "../assets/gameplay/suit-club-back.svg";
import suitClubMark from "../assets/gameplay/suit-club-mark.svg";
import suitDiamond from "../assets/gameplay/suit-diamond.svg";
import suitHeart from "../assets/gameplay/suit-heart.svg";
import suitSpade from "../assets/gameplay/suit-spade.svg";
import tableRail from "../assets/gameplay/table-rail.svg";
import "../styles/Gameplay.css";

type FaceCard = { rank: string; suit: string; red?: boolean; name: string };

const dealerCards: FaceCard[] = [{ rank: "K", suit: suitClub, name: "King of clubs" }];
const playerCards: FaceCard[] = [
  { rank: "A", suit: suitSpade, name: "Ace of spades" },
  { rank: "A", suit: suitHeart, red: true, name: "Ace of hearts" },
  { rank: "8", suit: suitClub, name: "Eight of clubs" },
  { rank: "6", suit: suitDiamond, red: true, name: "Six of diamonds" },
  { rank: "3", suit: suitSpade, name: "Three of spades" },
];

function PlayingCard({ rank, suit, red, name }: FaceCard) {
  return (
    <div className="gameplay-card" role="img" aria-label={name}>
      <span className={red ? "gameplay-rank gameplay-rank-red" : "gameplay-rank"}>{rank}</span>
      <img src={suit} alt="" width={31} height={31} />
    </div>
  );
}

function CardBack() {
  return (
    <div className="gameplay-card gameplay-card-back" role="img" aria-label="Face-down card">
      <div className="gameplay-card-pattern">
        <img src={suitClubBack} alt="" width={29} height={29} />
      </div>
    </div>
  );
}

export default function Gameplay() {
  return (
    <main className="gameplay">
      <div className="gameplay-fit">
        <div className="gameplay-board">
          <Link className="gameplay-lobbies" to="/lobbies">
            <img src={arrowLeft} alt="" width={17} height={17} />
            Lobbies
          </Link>

          <div className="gameplay-dealer" aria-label="Dealer hand">
            {dealerCards.map((card) => <PlayingCard key={card.name} {...card} />)}
            <CardBack />
            <CardBack />
            <CardBack />
            <CardBack />
          </div>

          <img className="gameplay-rail" src={tableRail} alt="" width={1296} height={402} />
          <img className="gameplay-inset" src={feltInset} alt="" width={1232} height={351} />

          <p className="gameplay-wordmark">
            Reef Royale
            <img src={suitClubMark} alt="" width={25} height={25} />
          </p>
          <p className="gameplay-ante" aria-label="Ante 10">10</p>

          <div className="gameplay-player-hand" aria-label="Your hand">
            {playerCards.map((card) => <PlayingCard key={card.name} {...card} />)}
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
