# Database schema (generated)

Generated from `prisma/schema.prisma` by `node scripts/gen-db-schema.mjs`. Do not edit by hand.

## User

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String |  |
| email | String | @unique |
| password | String |  |
| avatar | String? |  |
| xp | Int | @default(0) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| fantasyTeams | FantasyTeam[] |  |
| ownedLeagues | League[] | @relation("LeagueOwner") |
| leagueMembers | LeagueMember[] |  |

## League

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String |  |
| inviteCode | String | @unique |
| ownerId | String |  |
| createdAt | DateTime | @default(now()) |
| owner | User | @relation("LeagueOwner", fields: [ownerId], references: [id]) |
| members | LeagueMember[] |  |

## LeagueMember

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String |  |
| leagueId | String |  |
| joinedAt | DateTime | @default(now()) |
| league | League | @relation(fields: [leagueId], references: [id]) |
| user | User | @relation(fields: [userId], references: [id]) |

- `@@unique([userId, leagueId])`

## Match

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| team1 | String |  |
| team2 | String |  |
| date | DateTime |  |
| status | String | @default("UPCOMING") |
| tossCompleted | Boolean | @default(false) |
| createdAt | DateTime | @default(now()) |
| fantasyTeams | FantasyTeam[] |  |
| playing11 | MatchPlayer[] |  |

## Player

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String |  |
| team | String |  |
| role | String |  |
| credits | Float | @default(9.0) |
| fantasyPicks | FantasyTeamPlayer[] |  |
| matchAppearances | MatchPlayer[] |  |
| stats | PlayerStats[] |  |

## FantasyTeam

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String |  |
| matchId | String |  |
| captainId | String |  |
| viceCaptainId | String |  |
| totalPoints | Float | @default(0) |
| createdAt | DateTime | @default(now()) |
| match | Match | @relation(fields: [matchId], references: [id]) |
| user | User | @relation(fields: [userId], references: [id]) |
| players | FantasyTeamPlayer[] |  |
| scoringEvents | ScoringEvent[] |  |

- `@@unique([userId, matchId])`

## ScoringEvent

Append-only scoring ledger: one row per (team, player, scoring version). Never updated or deleted (a database trigger rejects UPDATE and DELETE). Team totals are the sum of the latest version's rows.

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| idempotencyKey | String | @unique |
| matchId | String |  |
| fantasyTeamId | String |  |
| userId | String |  |
| playerId | String |  |
| armband | String |  |
| statLine | Json |  |
| points | Float |  |
| configVersion | Int |  |
| createdAt | DateTime | @default(now()) |
| fantasyTeam | FantasyTeam | @relation(fields: [fantasyTeamId], references: [id]) |

- `@@index([fantasyTeamId, configVersion])`
- `@@index([matchId])`

## FantasyTeamPlayer

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| fantasyTeamId | String |  |
| playerId | String |  |
| fantasyTeam | FantasyTeam | @relation(fields: [fantasyTeamId], references: [id]) |
| player | Player | @relation(fields: [playerId], references: [id]) |

- `@@unique([fantasyTeamId, playerId])`

## MatchPlayer

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| matchId | String |  |
| playerId | String |  |
| isPlaying | Boolean | @default(false) |
| match | Match | @relation(fields: [matchId], references: [id], onDelete: Cascade) |
| player | Player | @relation(fields: [playerId], references: [id], onDelete: Cascade) |

- `@@unique([matchId, playerId])`

## PlayerStats

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| playerId | String |  |
| season | Int |  |
| matchesPlayed | Int |  |
| runs | Int |  |
| wickets | Int |  |
| avgPoints | Float |  |
| player | Player | @relation(fields: [playerId], references: [id], onDelete: Cascade) |

- `@@unique([playerId, season])`

## AnalyticsEvent

Server-side product analytics (docs/product-specs/admin-and-scoreboards.md). No personal data in props.

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String? |  |
| name | String |  |
| props | Json | @default("{}") |
| createdAt | DateTime | @default(now()) |

- `@@index([name, createdAt])`
- `@@index([userId, createdAt])`
