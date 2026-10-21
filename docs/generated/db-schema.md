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
| favouriteSports | String[] | @default([]) |
| language | String | @default("en") |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| fantasyTeams | FantasyTeam[] |  |
| ownedCrews | Crew[] | @relation("CrewOwner") |
| crewMembers | CrewMember[] |  |

## Crew

A private group of fans. Replaces the legacy fantasy "leagues" (renamed in place; no fee or prize fields).

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| name | String |  |
| inviteCode | String | @unique |
| ownerId | String |  |
| createdAt | DateTime | @default(now()) |
| owner | User | @relation("CrewOwner", fields: [ownerId], references: [id]) |
| members | CrewMember[] |  |

## CrewMember

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| userId | String |  |
| crewId | String |  |
| joinedAt | DateTime | @default(now()) |
| crew | Crew | @relation(fields: [crewId], references: [id], onDelete: Cascade) |
| user | User | @relation(fields: [userId], references: [id]) |

- `@@unique([userId, crewId])`

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

## Sport

The five sports. Seeded by migration; slugs are stable identifiers.

| Field | Type | Attributes |
|---|---|---|
| id | String | @id |
| name | String |  |
| competitions | Competition[] |  |
| participants | Participant[] |  |

## Competition

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| sportId | String |  |
| slug | String |  |
| name | String |  |
| sport | Sport | @relation(fields: [sportId], references: [id]) |
| seasons | Season[] |  |

- `@@unique([sportId, slug])`

## Season

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| competitionId | String |  |
| label | String |  |
| competition | Competition | @relation(fields: [competitionId], references: [id]) |
| events | Event[] |  |

- `@@unique([competitionId, label])`

## Event

One match, race or game. sourceRef identifies it in its source (e.g. a Cricsheet match id).

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| seasonId | String |  |
| sourceId | String |  |
| sourceRef | String |  |
| name | String |  |
| startsAt | DateTime |  |
| venue | String? |  |
| rightsPolicyId | String |  |
| season | Season | @relation(fields: [seasonId], references: [id]) |
| incidents | Incident[] |  |
| participants | EventParticipant[] |  |

- `@@unique([sourceId, sourceRef])`

## Participant

A team or player as named by the source. Never a likeness, voice or nickname feature.

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| sportId | String |  |
| kind | String |  |
| name | String |  |
| sourceId | String |  |
| sourceRef | String |  |
| sport | Sport | @relation(fields: [sportId], references: [id]) |
| events | EventParticipant[] |  |

- `@@unique([sourceId, sourceRef])`

## EventParticipant

| Field | Type | Attributes |
|---|---|---|
| eventId | String |  |
| participantId | String |  |
| role | String |  |
| event | Event | @relation(fields: [eventId], references: [id]) |
| participant | Participant | @relation(fields: [participantId], references: [id]) |

- `@@id([eventId, participantId, role])`

## Incident

Append-only, bitemporal facts. t is the sport clock (legal ball, lap, minute, point) as an ordered integer. Corrections are new rows with supersedesId; a database trigger rejects UPDATE and DELETE.

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| eventId | String |  |
| t | Int |  |
| seq | Int | @default(0) |
| actor | String? |  |
| type | String |  |
| payload | Json |  |
| sourceId | String |  |
| sourceRef | String |  |
| sourceClass | String |  |
| rightsPolicyId | String |  |
| effectiveAt | DateTime |  |
| observedAt | DateTime |  |
| supersedesId | String? | @unique |
| createdAt | DateTime | @default(now()) |
| event | Event | @relation(fields: [eventId], references: [id]) |
| supersedes | Incident? | @relation("Supersedes", fields: [supersedesId], references: [id]) |
| supersededBy | Incident? | @relation("Supersedes") |

- `@@unique([sourceId, sourceRef])`
- `@@index([eventId, observedAt])`
- `@@index([eventId, t, seq])`

## CrewReport

A member's report about another member of the same crew; the crew owner reviews it.

| Field | Type | Attributes |
|---|---|---|
| id | String | @id @default(cuid()) |
| crewId | String |  |
| reporterId | String |  |
| reportedId | String |  |
| reason | String |  |
| note | String? |  |
| status | String | @default("OPEN") |
| createdAt | DateTime | @default(now()) |

- `@@index([crewId, status])`

## UserBlock

blocker never sees blocked's name or activity, and blocked can't join crews the blocker owns.

| Field | Type | Attributes |
|---|---|---|
| blockerId | String |  |
| blockedId | String |  |
| createdAt | DateTime | @default(now()) |

- `@@id([blockerId, blockedId])`
- `@@index([blockedId])`
