# Throne

A throne room for the questions your agents need a human to answer. Instead of pinging you in ten threads, each agent walks into the hall, addresses you as its King, and waits. You hear them one at a time, pick an answer or speak your own, and they leave to carry it out. If one talks in riddles, you whip it and it asks again in plain words.

## Run it

Node 20 or newer, no dependencies.

```sh
npm start            # http://localhost:4747
npm test
```

Open the page and press **Summon test subjects** to try it with five sample petitioners.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `4747` | Port to listen on. |
| `THRONE_TOKEN` | none | When set, `/api` and `/mcp` need `Authorization: Bearer <token>`. Open the page once as `/?token=<token>` and the browser remembers it. Set this before exposing the court beyond your own machine. |
| `THRONE_DATA` | `data/court.json` | Where the queue and ledger are saved. |

## What the King can do

| Deed | Key | What the agent is told |
| --- | --- | --- |
| Pick an answer | `1` to `6` | The chosen option, plus anything typed in the decree box. |
| Speak a decree | `/` then Enter | Your own words. |
| Whip | `W` | First lash: the petition is replaced by the plain version the agent brought with it. Further lashes: the agent is sent away to rephrase under a shrinking word limit (plain words, then 20, then 10) and returns to the front of the line. |
| Your call | `Y` | Decide it yourself and do not ask again. |
| Later | `B` | Nothing. The petitioner goes to the back of the line. |
| Dungeon | `X` | Abandon the idea entirely. |

The windiness meter under each speech counts words and jargon ("words of sorcery"), and the whip starts to itch when it gets bad.

## Sending agents to court

### MCP

The server speaks MCP over HTTP at `/mcp`. Add it to any agent that supports remote MCP servers:

```json
{ "mcpServers": { "throne": { "type": "http", "url": "http://localhost:4747/mcp" } } }
```

It offers four tools. The tool descriptions carry the court etiquette, so agents speak in character without extra prompting.

- `petition_the_king` asks a question with two to four options and waits up to 55 seconds for the verdict.
- `await_verdict` keeps waiting when the first call returned `pending`.
- `rephrase_petition` answers a whipping with plainer words.
- `withdraw_petition` leaves without an answer.

Every result has a `status` (`answered`, `delegated`, `dungeon`, `whipped`, `pending` or `withdrawn`) and a `decree` sentence that says what to do next.

For agents that need a nudge, add [AGENT_PROTOCOL.md](AGENT_PROTOCOL.md) to their instructions.

### HTTP

```sh
curl -s localhost:4747/api/petitions?wait=50 -H 'content-type: application/json' -d '{
  "agent": "Auth Migration",
  "role": "knight",
  "title": "The old login gate",
  "speech": "Your Grace, two gates guard the same door. May I tear down the old one?",
  "plain": "Your Grace, may I delete the old login code?",
  "options": [{ "label": "Tear it down" }, { "label": "Leave it", "detail": "Every fix costs double." }]
}'
```

| Request | Purpose |
| --- | --- |
| `POST /api/petitions?wait=N` | Create a petition and wait up to N seconds (55 at most). |
| `GET /api/petitions/:id?wait=N` | Wait again for the verdict. |
| `POST /api/petitions/:id/rephrase?wait=N` | Replace `speech` (and optionally `options`) after a whipping. |
| `DELETE /api/petitions/:id` | Withdraw. |

Petition fields: `agent` and `speech` are required. `role` picks the costume (`knight`, `scribe`, `treasurer`, `spy`, `mason`, `jester`, `herald`, `alchemist`, `peasant`, `monk`; anything else gets one chosen from the agent's name). `plain` is the blunt version shown after the first whip. `title`, `realm`, `context` (a longer scroll the King can unroll), `link` and `options` (strings or `{ label, detail }`, six at most) are optional.

### Shell

```sh
node bin/throne.js ask --agent "Deploy" --role herald --plain "Release today?" \
  --option "Today" --option "Monday::No one is on watch this weekend" \
  "Your Grace, version 2.4 stands ready at the gates. Shall I sound the trumpets?"
```

It blocks until the King rules and prints the outcome as JSON. Exit code 0 means answered or delegated, 2 dungeon, 3 whipped.

## How it is built

- `server/court.js` holds the queue and every rule of the court; `server/index.js` serves the page, the REST API, a server-sent event stream for the page, and the MCP endpoint in `server/mcp.js`.
- `public/js/scene.js` animates the hall on a canvas. The background is one pixel-art image (`public/assets/hall.png`); the King, the guards and every petitioner are drawn in code by `public/js/sprites.js`, so each agent gets a stable look from its name and role.
- `public/js/app.js` is the audience panel: speech, options, deeds, hotkeys and the ledger.
