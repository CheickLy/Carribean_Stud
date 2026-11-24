# System Design

## Diagrams

### Gameplay class diagram

Simplified view of the types that run a Caribbean Stud hand. `Card`, `Hand`, `Deck`, `GameHand`, `TableGame`, `Session`, and `Lobby` are classes in the code. `deal`, `round`, `game.routes`, `engine`, `service`, `shared-game routes`, and the two client services are modules; this diagram treats each module as a class.

Both play paths share the same cards, hand ranking, and payout table. Solo practice keeps one hand on the login session. A shared table keeps seats, bets, and the current hand in `TableGame`, then writes the finished hand to `Session` and `GameHand`.

```mermaid
classDiagram
    direction TB

    class Card {
        +rank
        +suit
        +rankValue() number
        +toText() string
        +fromText(text)$ Card
    }

    class Hand {
        +cards
        +rank() RankedHand
        +compare(other) number
        +fromTexts(texts)$ Hand
    }

    class RankedHand {
        +name
        +strength
        +tieBreakers
    }

    class Deck {
        -cards
        +shuffle()
        +draw(count) Card[]
    }

    class deal {
        <<module>>
        +dealTable() player and dealer
    }

    class round {
        <<module>>
        +PAYOUTS
        +startRound(game, ante)
        +settleRound(game, action)
        +gameView(game)
    }

    class PracticeGame {
        +balance
        +round
        +reconnectDeadline
    }

    class game_routes {
        <<module>>
        +GET /state
        +POST /deal
        +POST /action
        +POST /heartbeat
        +POST /reset
    }

    class GameClient {
        <<module>>
        +getGame()
        +dealTable(ante)
        +playAction(fold or raise)
        +heartbeat(path)
    }

    class engine {
        <<module>>
        +newRound(table, settings)
        +applyCommand(table, seat, command)
        +advance(table, now)
        +resultFor(player, dealerCards)
        +tableView(table, userId)
    }

    class Table {
        +seats
        +round
        +handsPlayed
    }

    class Seat {
        +id
        +userId
        +name
        +bot
        +balance
        +active
        +lastSeen
    }

    class Round {
        +id
        +phase
        +deadline
        +dealer
        +min
        +max
        +players
    }

    class RoundPlayer {
        +cards
        +ante
        +action
        +skipped
        +result
    }

    class service {
        <<module>>
        +sharedTable(lobbyId, userId, command)
        +handHistory(lobbyId, userId)
    }

    class shared_routes {
        <<module>>
        +POST state, ante, action, leave
        +GET history
    }

    class SharedGameClient {
        <<module>>
        +syncTable()
        +placeAnte()
        +decide()
        +leaveTable()
        +loadHistory()
    }

    class Lobby {
        +lobbyId
        +minBet
        +maxBet
        +startingMoney
        +botsEnabled
        +allowBets
    }

    class TableGame {
        +lobbyId
        +state
    }

    class Session {
        +sessionId
        +lobbyId
        +dealerCards
        +status
    }

    class GameHand {
        +handId
        +sessionId
        +userId
        +playerCards
        +anteBet
        +callBet
        +payout
        +netChange
        +outcome
    }

    Hand "1" *-- "5" Card : holds
    Deck "1" *-- "52" Card : contains
    Hand ..> RankedHand : ranks to
    deal ..> Deck : builds
    deal ..> Hand : ranks
    round ..> deal : deals one hand
    round ..> Hand : compares player and dealer
    round --> PracticeGame : updates
    game_routes ..> round : calls
    GameClient ..> game_routes : HTTP

    Table "1" *-- "*" Seat : seats
    Table "1" o-- "0..1" Round : current hand
    Round "1" *-- "*" RoundPlayer : participants
    engine ..> Hand : ranks and compares
    engine ..> round : uses PAYOUTS
    engine --> Table : mutates
    service ..> engine : runs the hand
    service --> Lobby : reads limits
    service --> TableGame : loads and saves state
    service --> Session : stores the hand phase
    service --> GameHand : records each result
    shared_routes ..> service : calls
    SharedGameClient ..> shared_routes : HTTP
    TableGame --> Lobby : one row per lobby
    Session --> Lobby : played at
    GameHand --> Session : one row per player
```

`Session` here is the `game_sessions` row for one shared hand. Login cookies stay outside this diagram.
